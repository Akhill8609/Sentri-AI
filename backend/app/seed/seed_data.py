import asyncio
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
from app.core.database import SessionLocal, engine, Base
from app.core.security import get_password_hash
from app.models.schema import (
    User, KnowledgeDocument, KnowledgeChunk, Incident, IncidentEvent,
    ThreatIndicator, RiskAssessment, AIInvestigation, AgentToolCall,
    Recommendation, AnalystAction, IncidentNote, AuditLog
)
from app.services.rag.chunker import chunker
from app.services.rag.embedder import embedder

def get_utc_now():
    return datetime.now(timezone.utc)

KNOWLEDGE_DOCS = [
    {
        "title": "Institutional Phishing & Credential Theft Advisory",
        "category": "PHISHING",
        "content": """# Institutional Phishing & Credential Theft Advisory

## Overview of Phishing Attacks
Phishing remains the predominant initial access vector for security compromises. Attackers utilize deceptive emails, urgent SMS messages, or social engineering lures to deceive students and employees into surrendering authentication credentials or downloading malware.

## Credential Harvesting Indicators
1. **Urgent Action Mandates**: Threat actors create false urgency by asserting accounts will be deactivated, suspended, or terminated within 24 hours.
2. **External Link Masking**: Links often disguise destination URLs using typosquatted domains, suspicious top-level domains (.tk, .xyz, .top), or URL shorteners.
3. **Mismatched Sender Identities**: Official university or corporate communications never originate from public free email services (e.g., @gmail.com, @yahoo.com).
4. **Solicitation of Sensitive Information**: Legitimate administrative entities never solicit passwords, PINs, or One-Time Passwords (OTPs) via email or unauthenticated forms.

## Response Procedures
If a suspicious communication is received, do not click embedded links, download attachments, or reply to the sender. Immediately submit the message to SentriAI for automated triage and analyst escalation."""
    },
    {
        "title": "Student Cybersecurity Handbook: Scholarships, Internships, & University Portals",
        "category": "STUDENT_GUIDE",
        "content": """# Student Cybersecurity Handbook

## Common Threats Targeting Students

### 1. Fake Scholarship & Grant Scams
Attackers frequently broadcast fraudulent messages offering financial awards (e.g., "Congratulations! You have been selected for a ₹50,000 scholarship"). These schemes direct students to fraudulent login portals designed to harvest university IDs and passwords, or demand an upfront "processing fee".

### 2. Fake Internship & Job Placement Offers
Fraudulent recruitment messages advertise high-paying remote roles with no interview requirement. Scammers instruct students to complete bogus onboarding forms collecting identity documents, bank details, or asking them to purchase equipment via fraudulent vendors.

### 3. University Portal Phishing
Phishing pages mimicking university login systems attempt to capture single sign-on (SSO) credentials. Always verify that the address in your browser address bar is the official institutional domain before entering your password.

## Preventive Rules for Students
* Never pay money to receive a scholarship or job offer.
* Verify scholarship announcements directly on the university's official scholarship notice board.
* Report suspicious campus solicitations immediately to the student security helpdesk."""
    },
    {
        "title": "Enterprise Employee Defense: Business Email Compromise & Fake IT Support",
        "category": "EMPLOYEE_GUIDE",
        "content": """# Enterprise Employee Defense Manual

## Common Enterprise Attack Vectors

### 1. Impersonation of IT Helpdesk & System Administrators
Threat actors pose as internal IT staff claiming an urgent security update, mailbox quota overflow, or mandatory password sync is required. They often link to spoofed Microsoft 365 or Google Workspace authentication panels.

### 2. Fake HR & Payroll Notifications
Communications claiming to contain revised leave policies, tax documentation (W-2/Form 16), or urgent benefits changes. These lures exploit natural curiosity or financial concerns to induce credential entry.

### 3. Business Email Compromise (BEC) & Invoice Fraud
Attackers impersonate executives or authorized vendors requesting urgent wire transfers, gift card purchases, or changes to bank routing instructions.

## Verification Standards
* Multi-channel verification: Always verify unexpected payment or credential requests via a separate verified channel (phone call or internal chat).
* Never approve unsolicited MFA prompts or share session cookies."""
    },
    {
        "title": "Account Compromise & Emergency Response Playbook",
        "category": "PLAYBOOK",
        "content": """# Account Compromise Emergency Response Playbook

## Severity: CRITICAL / HIGH
This playbook is activated whenever a student or employee enters credentials on an unverified site, clicks a malicious link with active sessions, or reports unauthorized account activity.

## Phase 1: Immediate User Actions
1. **Password Invalidation**: Navigate directly to the official authentication portal and change your password immediately. Do not reuse previous passwords.
2. **Session Termination**: Initiate 'Sign Out of All Sessions' across all web browsers and devices to revoke any stolen OAuth or session tokens.
3. **MFA Audit**: Inspect MFA settings to ensure no unauthorized authenticator apps, phone numbers, or FIDO security keys were added by the attacker.

## Phase 2: SOC Analyst Containment Steps
1. Query authentication telemetry for anomalous IP addresses, impossible travel speed, or unusual user-agent strings.
2. Invalidate active session tokens in directory services (Azure AD / Okta / Google Workspace).
3. Review inbox forwarding rules and delegation permissions for signs of automated exfiltration."""
    },
    {
        "title": "Malicious Links, Homograph Attacks & Typosquatting Guide",
        "category": "SAFE_BROWSING",
        "content": """# Malicious Links & Domain Deception Guide

## Deceptive URL Techniques
* **Typosquatting**: Registering domains with common misspellings of popular services (e.g., micr0soft-update.com, paypa1-security.net).
* **Subdomain Stacking**: Creating long hostnames where the legitimate brand appears as a subdomain (e.g., portal.university.edu.malicious-site.xyz).
* **Risky Top-Level Domains**: TLDs with lenient registration policies (.tk, .xyz, .top, .buzz) are disproportionately leveraged by cybercriminals for transient attack campaigns.
* **IP Address URLs**: Legitimate organizations rarely use raw IP addresses (e.g., http://192.168.1.1/login) for public user authentication."""
    },
    {
        "title": "Social Engineering & Multi-Factor Authentication (MFA) Bypass Guide",
        "category": "SOCIAL_ENGINEERING",
        "content": """# Social Engineering & MFA Protection Guide

## MFA Fatigue & Push Bombing
Attackers who obtain a valid password often trigger dozens of push notifications in rapid succession, hoping the victim approves out of frustration or confusion.
**Rule**: Never approve an authentication prompt you did not personally initiate.

## OTP Solicitation Scams
No legitimate administrator or support technician will ever ask you to read back or paste an SMS or authenticator One-Time Password. Anyone asking for an OTP is an attacker attempting to bypass MFA."""
    }
]

async def seed_database(db: Session):
    # Ensure tables exist
    Base.metadata.create_all(bind=engine)

    # 1. Seed Users if not present
    existing_users = db.query(User).all()
    for u in existing_users:
        if not u.is_verified:
            u.is_verified = True
    db.commit()

    existing_admin = db.query(User).filter((User.email == "admin@sentriai.io") | (User.email == "admin@soc.guardian")).first()
    if not existing_admin:
        admin_user = User(
            email="admin@sentriai.io",
            hashed_password=get_password_hash("Password123!"),
            full_name="Chief Security Admin",
            role="ADMIN",
            user_mode="EMPLOYEE",
            is_verified=True
        )
        analyst_user = User(
            email="analyst@sentriai.io",
            hashed_password=get_password_hash("Password123!"),
            full_name="Sarah Chen (Tier 2 SOC)",
            role="SOC_ANALYST",
            user_mode="EMPLOYEE",
            is_verified=True
        )
        student_user = User(
            email="student@university.edu",
            hashed_password=get_password_hash("Password123!"),
            full_name="Alex Rivera",
            role="USER",
            user_mode="STUDENT",
            is_verified=True
        )
        employee_user = User(
            email="employee@company.com",
            hashed_password=get_password_hash("Password123!"),
            full_name="Michael Scott",
            role="USER",
            user_mode="EMPLOYEE",
            is_verified=True
        )
        db.add_all([admin_user, analyst_user, student_user, employee_user])
        db.commit()
        db.refresh(admin_user)
        db.refresh(analyst_user)
        db.refresh(student_user)
        db.refresh(employee_user)
    else:
        admin_user = existing_admin
        analyst_user = db.query(User).filter((User.email == "analyst@sentriai.io") | (User.email == "analyst@soc.guardian")).first()
        student_user = db.query(User).filter(User.email == "student@university.edu").first()
        employee_user = db.query(User).filter(User.email == "employee@company.com").first()

        # Also ensure admin@sentriai.io and analyst@sentriai.io exist
        if not db.query(User).filter(User.email == "admin@sentriai.io").first():
            db.add(User(
                email="admin@sentriai.io",
                hashed_password=get_password_hash("Password123!"),
                full_name="Chief Security Admin",
                role="ADMIN",
                user_mode="EMPLOYEE",
                is_verified=True
            ))
        if not db.query(User).filter(User.email == "analyst@sentriai.io").first():
            db.add(User(
                email="analyst@sentriai.io",
                hashed_password=get_password_hash("Password123!"),
                full_name="Sarah Chen (Tier 2 SOC)",
                role="SOC_ANALYST",
                user_mode="EMPLOYEE",
                is_verified=True
            ))
        db.commit()

    # 2. Seed Knowledge Documents if not present
    doc_count = db.query(KnowledgeDocument).count()
    if doc_count == 0:
        for k_item in KNOWLEDGE_DOCS:
            doc = KnowledgeDocument(
                title=k_item["title"],
                category=k_item["category"],
                file_name=f"{k_item['title'].lower().replace(' ', '_')[:30]}.md",
                source="Institutional Cybersecurity Center",
                author="SOC Engineering Team"
            )
            db.add(doc)
            db.flush()

            chunks_data = chunker.chunk_document(k_item["content"], metadata={"title": k_item["title"], "category": k_item["category"]})
            for idx, c in enumerate(chunks_data):
                vec = await embedder.get_embedding(c["chunk_text"])
                chunk_rec = KnowledgeChunk(
                    document_id=doc.id,
                    chunk_index=idx,
                    chunk_text=c["chunk_text"],
                    embedding=vec,
                    metadata_json=c["metadata"]
                )
                db.add(chunk_rec)

            doc.total_chunks = len(chunks_data)
            db.commit()

    # 3. Seed Realistic Incidents if none exist
    incident_count = db.query(Incident).count()
    if incident_count == 0 and student_user and analyst_user:
        # Incident 1: Scholarship Phishing (Student Mode Demo Scenario)
        inc1 = Incident(
            incident_id="INC-2026-1001",
            user_id=student_user.id,
            incident_type="MESSAGE",
            title="Fake ₹50,000 Scholarship Lure with Credential Phishing Link",
            description="Student received an unsolicited SMS offering a ₹50,000 scholarship, urging them to log in immediately via a deceptive external link.",
            source="Student Portal",
            submitted_content="Congratulations! You have been selected for a ₹50,000 scholarship. Claim your scholarship by logging into this link: http://scholarship-claim-portal.xyz/login within 24 hours.",
            risk_score=92,
            severity="HIGH",
            confidence=0.95,
            threat_category="STUDENT_SCAM",
            status="AI_ANALYSIS_COMPLETE",
            assigned_analyst_id=analyst_user.id,
            ai_summary="Autonomous agent identified financial lure (+20), extreme urgency (+20), unverified external domain (+25), and direct credential request (+25). Retrieved student scholarship advisory and recommended immediate containment.",
            ai_recommendation="Do not open the link or provide login details. Verify scholarship announcements through the official university registrar notices.",
            escalation_status=True,
            created_at=get_utc_now() - timedelta(hours=3)
        )
        db.add(inc1)
        db.flush()

        # Risk breakdown for inc1
        ra1 = RiskAssessment(
            incident_id=inc1.id,
            overall_score=92,
            severity="HIGH",
            confidence=0.95,
            score_breakdown=[
                {"indicator": "Direct Credential Request", "points": 25, "explanation": "Urges user to 'log in to claim' via external page."},
                {"indicator": "High-Risk Domain (.xyz)", "points": 25, "explanation": "Target domain uses transient top-level domain scholarship-claim-portal.xyz."},
                {"indicator": "Financial / Reward Lure", "points": 20, "explanation": "Promises unverified ₹50,000 cash grant."},
                {"indicator": "Urgency & Coercion", "points": 20, "explanation": "Imposes artificial 'within 24 hours' deadline to bypass caution."}
            ]
        )
        db.add(ra1)

        # Indicators for inc1
        ti1 = ThreatIndicator(
            incident_id=inc1.id,
            indicator_type="URL",
            value="http://scholarship-claim-portal.xyz/login",
            weight=25,
            description="Suspicious credential harvesting destination domain",
            severity="HIGH"
        )
        db.add(ti1)

        # AI Investigation
        inv1 = AIInvestigation(
            incident_id=inc1.id,
            model_used="gemini-1.5-flash",
            provider="SentriAI Companion Engine",
            execution_time_ms=1180,
            agent_summary="Agent parsed message, extracted URL, performed reputation lookup on scholarship-claim-portal.xyz, retrieved Student Scholarship handbook via RAG, and compiled high-risk advisory.",
            conclusion="High probability of phishing credential theft. Campus-wide domain block advised."
        )
        db.add(inv1)
        db.flush()

        # Tool calls for inc1
        tc1 = AgentToolCall(
            investigation_id=inv1.id,
            tool_name="analyze_message",
            input_arguments={"content": inc1.submitted_content[:50], "user_mode": "STUDENT"},
            output_result={"detected_indicators": ["Financial / Reward Lure", "Direct Credential Request", "Urgency"]},
            execution_order=1
        )
        tc2 = AgentToolCall(
            investigation_id=inv1.id,
            tool_name="extract_urls",
            input_arguments={"text": inc1.submitted_content},
            output_result={"found": True, "urls": ["http://scholarship-claim-portal.xyz/login"]},
            execution_order=2
        )
        tc3 = AgentToolCall(
            investigation_id=inv1.id,
            tool_name="analyze_url",
            input_arguments={"url": "http://scholarship-claim-portal.xyz/login"},
            output_result={"domain": "scholarship-claim-portal.xyz", "tld": ".xyz", "is_suspicious": True},
            execution_order=3
        )
        tc4 = AgentToolCall(
            investigation_id=inv1.id,
            tool_name="retrieve_security_knowledge",
            input_arguments={"query": "Student scholarship phishing guidance"},
            output_result={"sources": ["Student Cybersecurity Handbook"]},
            execution_order=4
        )
        db.add_all([tc1, tc2, tc3, tc4])

        # Recommendations for inc1
        recs1 = [
            Recommendation(incident_id=inc1.id, step_order=1, title="Do Not Click or Open the Link", action_type="IMMEDIATE", description="Close the notification immediately. Do not attempt to visit the site to inspect it.", rationale="Prevents loading potential drive-by exploits or credential forms."),
            Recommendation(incident_id=inc1.id, step_order=2, title="Never Enter University Credentials", action_type="IMMEDIATE", description="Under no circumstances input your student ID, password, or OTP on external web pages.", rationale="Stops account takeover before it starts."),
            Recommendation(incident_id=inc1.id, step_order=3, title="Verify Through Official University Portal", action_type="PREVENTIVE", description="Access the official university scholarships page directly from your saved bookmarks.", rationale="Confirms authentic institutional aid programs safely."),
            Recommendation(incident_id=inc1.id, step_order=4, title="Report Incident to SentriAI", action_type="REPORTING", description="The incident has been registered to notify institutional security analysts.", rationale="Enables proactive network blocking to safeguard peers.")
        ]
        db.add_all(recs1)

        # Timeline events for inc1
        evs1 = [
            IncidentEvent(incident_id=inc1.id, event_type="SUBMISSION_RECEIVED", description="Student Alex Rivera submitted suspicious SMS notification.", actor="USER", timestamp=inc1.created_at),
            IncidentEvent(incident_id=inc1.id, event_type="TOOLS_ORCHESTRATED", description="Agent executed 4 security tools: message analysis, URL extraction, URL inspection, and RAG retrieval.", actor="AI_AGENT", timestamp=inc1.created_at + timedelta(seconds=2)),
            IncidentEvent(incident_id=inc1.id, event_type="RISK_ASSESSED", description="Calculated risk score: 92/100 (HIGH). Critical credential harvesting pattern detected.", actor="AI_AGENT", timestamp=inc1.created_at + timedelta(seconds=3)),
            IncidentEvent(incident_id=inc1.id, event_type="ESCALATED_TO_SOC", description="High-risk incident automatically placed in SOC Analyst triage queue.", actor="SYSTEM", timestamp=inc1.created_at + timedelta(seconds=4))
        ]
        db.add_all(evs1)

        # Incident 2: Employee Urgency / Password Reset Scam
        if employee_user:
            inc2 = Incident(
                incident_id="INC-2026-1002",
                user_id=employee_user.id,
                incident_type="EMAIL",
                title="Urgent Company Account Deactivation Notice",
                description="Employee received spoofed notification alleging account termination unless password verified immediately.",
                source="Employee Portal",
                submitted_content="From: IT Support Helpdesk <it-support@freemail-alerts.com>\nSubject: Action Required: Your company account will be disabled today.\n\nYour organizational Microsoft account is scheduled for immediate suspension due to security non-compliance. Verify your password immediately at https://login-company-portal.top/auth to retain access.",
                risk_score=88,
                severity="HIGH",
                confidence=0.95,
                threat_category="IMPERSONATION",
                status="ESCALATED",
                assigned_analyst_id=analyst_user.id,
                ai_summary="Detected freemail sender posing as enterprise IT, aggressive account deactivation deadline, and spoofed authentication portal link.",
                ai_recommendation="Do not enter credentials. Report email as phishing and block domain login-company-portal.top.",
                escalation_status=True,
                created_at=get_utc_now() - timedelta(hours=1)
            )
            db.add(inc2)
            db.flush()

            ra2 = RiskAssessment(
                incident_id=inc2.id,
                overall_score=88,
                severity="HIGH",
                confidence=0.95,
                score_breakdown=[
                    {"indicator": "Sender Domain Mismatch", "points": 25, "explanation": "IT Helpdesk claims sent from freemail-alerts.com instead of verified corporate domain."},
                    {"indicator": "Suspicious TLD (.top)", "points": 25, "explanation": "Authentication link points to login-company-portal.top."},
                    {"indicator": "Urgent Threat of Suspension", "points": 20, "explanation": "Threatens immediate account disablement."},
                    {"indicator": "IT Support Impersonation", "points": 18, "explanation": "Fraudulent claim of enterprise system administrator authority."}
                ]
            )
            db.add(ra2)

            evs2 = [
                IncidentEvent(incident_id=inc2.id, event_type="SUBMISSION_RECEIVED", description="Employee Michael Scott submitted suspicious email for inspection.", actor="USER", timestamp=inc2.created_at),
                IncidentEvent(incident_id=inc2.id, event_type="TOOLS_ORCHESTRATED", description="Agent verified SPF/sender anomaly, extracted URL, and retrieved Employee Defense playbook.", actor="AI_AGENT", timestamp=inc2.created_at + timedelta(seconds=2)),
                IncidentEvent(incident_id=inc2.id, event_type="ESCALATED_TO_SOC", description="Incident escalated to Tier 2 SOC Analyst queue.", actor="AI_AGENT", timestamp=inc2.created_at + timedelta(seconds=3))
            ]
            db.add_all(evs2)

        db.commit()
