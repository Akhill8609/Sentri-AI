import pytest
import asyncio
from fastapi.testclient import TestClient
from app.main import app
from app.core.database import SessionLocal, Base, engine
from app.models.schema import User, Incident, KnowledgeDocument
from app.services.agent.tools import agent_tools
from app.services.rag.retriever import rag_retriever
from app.services.agent.orchestrator import agent_orchestrator
from app.services.risk_scorer import risk_scorer

@pytest.fixture(scope="session")
def client():
    # Lifespan will trigger on startup
    with TestClient(app) as c:
        yield c

def test_root_endpoint(client):
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["project"] == "SentriAI"
    assert data["status"] == "OPERATIONAL"

import uuid

from app.services.email_service import email_service
from app.core.config import settings

def test_registration_and_otp_verification(client):
    settings.APP_ENV = "test"
    settings.ENABLE_TEST_OTP = True

    reg_email = f"test_user_{uuid.uuid4().hex[:8]}@university.edu"
    # 1. Register
    reg_resp = client.post("/api/v1/auth/register", json={
        "email": reg_email,
        "password": "SecurePassword123!",
        "confirm_password": "SecurePassword123!",
        "full_name": "Test Student User",
        "user_mode": "STUDENT"
    })
    assert reg_resp.status_code == 200
    reg_data = reg_resp.json()
    assert reg_data["email"] == reg_email
    assert reg_data["is_verified"] is False
    # Verify OTP is NEVER leaked in API response
    assert "dev_otp" not in reg_data
    assert "otp" not in reg_data
    assert reg_data.get("success") is True

    # Check OTP was delivered to the user's inbox
    assert reg_email in email_service.test_inbox
    received_otp = email_service.test_inbox[reg_email]
    assert len(received_otp) == 6

    # 2. Login before verification should fail
    unverified_login = client.post("/api/v1/auth/login", json={
        "email": reg_email,
        "password": "SecurePassword123!"
    })
    assert unverified_login.status_code == 403
    assert "verifi" in unverified_login.json()["detail"].lower()

    # 3. Test wrong OTP rejection
    wrong_otp_resp = client.post("/api/v1/auth/verify-otp", json={
        "email": reg_email,
        "otp": "000000" if received_otp != "000000" else "111111"
    })
    assert wrong_otp_resp.status_code == 400
    assert "Invalid or expired verification code." in wrong_otp_resp.json()["detail"]

    # 4. Verify with correct OTP from email
    verify_resp = client.post("/api/v1/auth/verify-otp", json={
        "email": reg_email,
        "otp": received_otp
    })
    assert verify_resp.status_code == 200
    assert "access_token" in verify_resp.json()
    assert verify_resp.json()["user"]["is_verified"] is True

    # 5. Now login works
    verified_login = client.post("/api/v1/auth/login", json={
        "email": reg_email,
        "password": "SecurePassword123!"
    })
    assert verified_login.status_code == 200

    # 6. Forgot Password & Reset Flow
    forgot_resp = client.post("/api/v1/auth/forgot-password", json={"email": reg_email})
    assert forgot_resp.status_code == 200
    assert "dev_otp" not in forgot_resp.json()
    assert "otp" not in forgot_resp.json()
    assert forgot_resp.json().get("success") is True

    reset_received_otp = email_service.test_inbox.get(reg_email)
    assert reset_received_otp is not None
    assert len(reset_received_otp) == 6

    reset_resp = client.post("/api/v1/auth/reset-password", json={
        "email": reg_email,
        "otp": reset_received_otp,
        "new_password": "NewSecurePassword456!",
        "confirm_password": "NewSecurePassword456!"
    })
    assert reset_resp.status_code == 200
    assert reset_resp.json().get("success") is True

    # 7. Login with new password
    new_login = client.post("/api/v1/auth/login", json={
        "email": reg_email,
        "password": "NewSecurePassword456!"
    })
    assert new_login.status_code == 200

def test_otp_security_rules(client):
    settings.APP_ENV = "test"
    settings.ENABLE_TEST_OTP = True

    sec_email = f"security_rules_{uuid.uuid4().hex[:8]}@university.edu"
    reg = client.post("/api/v1/auth/register", json={
        "email": sec_email,
        "password": "SecurePassword123!",
        "confirm_password": "SecurePassword123!",
        "full_name": "Security Rules Tester",
        "user_mode": "EMPLOYEE"
    })
    assert reg.status_code == 200
    first_otp = email_service.test_inbox[sec_email]

    # Test resend cooldown enforcement
    cooldown_resp = client.post("/api/v1/auth/resend-otp", json={"email": sec_email})
    assert cooldown_resp.status_code == 429
    assert "wait" in cooldown_resp.json()["detail"].lower()

    # Verify first OTP works
    v1 = client.post("/api/v1/auth/verify-otp", json={"email": sec_email, "otp": first_otp})
    assert v1.status_code == 200

    # Test replay attack: used OTP must be rejected
    v_replay = client.post("/api/v1/auth/verify-otp", json={"email": sec_email, "otp": first_otp})
    assert v_replay.status_code == 400
    assert "Invalid or expired verification code." in v_replay.json()["detail"]

    # Test max attempts limit on a fresh token
    limit_email = f"limit_test_{uuid.uuid4().hex[:8]}@university.edu"
    client.post("/api/v1/auth/register", json={
        "email": limit_email,
        "password": "SecurePassword123!",
        "confirm_password": "SecurePassword123!",
        "full_name": "Limit Tester",
        "user_mode": "STUDENT"
    })
    correct_limit_otp = email_service.test_inbox[limit_email]

    # Fail 5 times with wrong OTP
    for _ in range(5):
        fail_resp = client.post("/api/v1/auth/verify-otp", json={"email": limit_email, "otp": "000000"})
        assert fail_resp.status_code == 400

    # Even with the correct OTP, it must now be rejected because attempt limit was exceeded
    locked_resp = client.post("/api/v1/auth/verify-otp", json={"email": limit_email, "otp": correct_limit_otp})
    assert locked_resp.status_code == 400
    assert "Invalid or expired verification code." in locked_resp.json()["detail"]

def test_login_and_auth(client):
    # Test valid login
    response = client.post("/api/v1/auth/login", json={
        "email": "student@university.edu",
        "password": "Password123!"
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["user"]["email"] == "student@university.edu"
    assert data["user"]["role"] == "USER"

    token = data["access_token"]
    # Test /me with token
    me_resp = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_resp.status_code == 200
    assert me_resp.json()["full_name"] == "Alex Rivera"

def test_security_agent_tools():
    # 1. URL extraction
    sample_text = "Check this out: http://malicious-link.xyz/verify and also http://another.top"
    url_res = agent_tools.extract_urls(sample_text)
    assert url_res["found"] is True
    assert url_res["count"] == 2

    # 2. URL analysis
    analysis_res = agent_tools.analyze_url("http://fake-university-login.xyz/portal")
    assert analysis_res["is_suspicious"] is True
    assert len(analysis_res["indicators"]) >= 1

    # 3. Message analysis
    msg_res = agent_tools.analyze_message(
        "Congratulations! You have been selected for a ₹50,000 scholarship. Claim now within 24 hours.",
        user_mode="STUDENT"
    )
    assert msg_res["threat_signals_found"] is True
    assert len(msg_res["detected_indicators"]) >= 2

    # 4. Transparent Risk scoring
    test_indicators = [
        {"name": "Direct Credential Request", "points": 25},
        {"name": "Suspicious URL", "points": 25},
        {"name": "Urgency", "points": 20},
        {"name": "Financial Lure", "points": 20}
    ]
    risk_res = risk_scorer.calculate_score(test_indicators)
    assert risk_res["score"] == 90
    assert risk_res["severity"] in ["HIGH", "CRITICAL"]
    assert len(risk_res["breakdown"]) == 4

@pytest.mark.asyncio
async def test_rag_semantic_retrieval():
    db = SessionLocal()
    try:
        # Search for scholarship phishing
        results = await rag_retriever.retrieve(db, query="scholarship grant fake login", top_k=2)
        assert len(results) > 0
        assert "document_title" in results[0]
        assert results[0]["similarity_score"] > 0
    finally:
        db.close()

@pytest.mark.asyncio
async def test_end_to_end_agent_orchestrator():
    db = SessionLocal()
    try:
        student = db.query(User).filter(User.email == "student@university.edu").first()
        assert student is not None

        submission = (
            "Congratulations! You have been selected for a ₹50,000 scholarship. "
            "Claim your scholarship by logging into this link: http://scholarship-portal.xyz/login within 24 hours."
        )

        result = await agent_orchestrator.investigate_submission(
            db=db,
            content=submission,
            submission_type="MESSAGE",
            user_mode="STUDENT",
            user_id=student.id
        )

        # Assertions for the primary end-to-end demo requirement
        assert result["risk_score"] >= 80
        assert result["severity"] in ["HIGH", "CRITICAL"]
        assert len(result["tool_call_traces"]) >= 5
        assert len(result["recommended_actions"]) >= 3
        assert len(result["risk_breakdown"]) >= 3
        assert "incident_code" in result
        
        # Verify What Should I Do Now is present
        action_titles = [a["title"] for a in result["recommended_actions"]]
        assert any("Link" in t for t in action_titles)
        assert any("Credential" in t or "Password" in t for t in action_titles)

        # Verify incident was persisted in DB
        inc_in_db = db.query(Incident).filter(Incident.id == result["incident_id"]).first()
        assert inc_in_db is not None
        assert inc_in_db.risk_score == result["risk_score"]
    finally:
        db.close()

def test_soc_analyst_triage_flow(client):
    # Login as SOC Analyst
    analyst_login = client.post("/api/v1/auth/login", json={
        "email": "analyst@sentriai.io",
        "password": "Password123!"
    })
    assert analyst_login.status_code == 200
    token = analyst_login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Fetch incidents list
    inc_resp = client.get("/api/v1/incidents", headers=headers)
    assert inc_resp.status_code == 200
    items = inc_resp.json()["items"]
    assert len(items) > 0
    target_inc_id = items[0]["id"]

    # 2. Get incident details
    detail_resp = client.get(f"/api/v1/incidents/{target_inc_id}", headers=headers)
    assert detail_resp.status_code == 200
    detail = detail_resp.json()
    assert "timeline" in detail
    assert "tool_calls" in detail
    assert "recommendations" in detail

    # 3. Add analyst note
    note_resp = client.post(
        f"/api/v1/incidents/{target_inc_id}/notes",
        headers=headers,
        json={"note": "Investigated domain DNS records. Typosquatted server hosted in known rogue ASN."}
    )
    assert note_resp.status_code == 200

    # 4. Human in the loop action: Simulate Block
    action_resp = client.post(
        f"/api/v1/incidents/{target_inc_id}/action",
        headers=headers,
        json={"action_type": "SIMULATE_BLOCK", "notes": "Blocked destination URL at perimeter proxy."}
    )
    assert action_resp.status_code == 200

    # 5. Resolve incident
    status_resp = client.patch(
        f"/api/v1/incidents/{target_inc_id}/status",
        headers=headers,
        json={"status": "RESOLVED", "notes": "Threat contained and users protected."}
    )
    assert status_resp.status_code == 200
    assert status_resp.json()["new_status"] == "RESOLVED"

def test_conversational_ai_assistant(client):
    # Login as student
    login = client.post("/api/v1/auth/login", json={
        "email": "student@university.edu",
        "password": "Password123!"
    })
    token = login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    chat_resp = client.post("/api/v1/agent/chat", headers=headers, json={
        "messages": [{"role": "user", "content": "What should I do if someone sent me a fake scholarship email?"}],
        "user_mode": "STUDENT"
    })
    assert chat_resp.status_code == 200
    data = chat_resp.json()
    assert "reply" in data
    assert len(data["rag_sources"]) > 0
    assert len(data["suggested_actions"]) > 0
