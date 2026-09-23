import asyncio
import tempfile
from pathlib import Path
from unittest.mock import MagicMock, patch
import pytest

from app.core.config import Settings, settings
from app.services.llm.provider import LLMProviderService, llm_service


# ---------------------------------------------------------------------------
# 1. Endpoint Transformation Logic
# ---------------------------------------------------------------------------

def test_foundry_base_url_transformation():
    """
    Verify that Microsoft Foundry project endpoints are accurately transformed into OpenAI base URLs,
    and that inadvertent /responses or model-details suffixes are safely stripped.
    """
    project_endpoint = "https://sentri-ai-resource.services.ai.azure.com/api/projects/sentri-ai"
    expected_base_url = "https://sentri-ai-resource.services.ai.azure.com/api/projects/sentri-ai/openai/v1"

    # Standard project endpoint
    assert LLMProviderService.format_foundry_base_url(project_endpoint) == expected_base_url

    # Trailing slash
    assert LLMProviderService.format_foundry_base_url(f"{project_endpoint}/") == expected_base_url

    # Whitespace and multiple slashes
    assert LLMProviderService.format_foundry_base_url(f"  {project_endpoint}///  ") == expected_base_url

    # Already includes /openai/v1
    assert LLMProviderService.format_foundry_base_url(expected_base_url) == expected_base_url

    # Inadvertent model-details endpoint with /openai/v1/responses
    responses_suffix = f"{expected_base_url}/responses"
    assert LLMProviderService.format_foundry_base_url(responses_suffix) == expected_base_url
    assert LLMProviderService.format_foundry_base_url(f"{responses_suffix}/") == expected_base_url


# ---------------------------------------------------------------------------
# 2. Response Extraction Logic
# ---------------------------------------------------------------------------

def test_extract_response_text_variants():
    """Verify parsing of various response structures from Responses API into clean strings."""
    # 1. Official OpenAI Response.output_text property
    mock_resp_1 = MagicMock()
    mock_resp_1.output_text = "Analysis complete: Legitimate communication."
    assert LLMProviderService._extract_response_text(mock_resp_1) == "Analysis complete: Legitimate communication."

    # 2. Response.output list containing message with content blocks
    mock_resp_2 = MagicMock(spec=["output"])
    block = MagicMock()
    block.text = "Analysis complete: Malicious domain detected."
    msg_item = MagicMock()
    msg_item.content = [block]
    mock_resp_2.output = [msg_item]
    assert LLMProviderService._extract_response_text(mock_resp_2) == "Analysis complete: Malicious domain detected."

    # 3. Dict-based response output
    dict_resp = {
        "output": [
            {
                "type": "message",
                "content": [{"type": "output_text", "text": "Credential harvesting suspected."}]
            }
        ]
    }
    assert LLMProviderService._extract_response_text(dict_resp) == "Credential harvesting suspected."

    # 4. Fallback legacy choices structure
    legacy_resp = {
        "choices": [{"message": {"content": "Legacy format response."}}]
    }
    assert LLMProviderService._extract_response_text(legacy_resp) == "Legacy format response."

    # 5. Empty / None response
    assert LLMProviderService._extract_response_text(None) is None
    assert LLMProviderService._extract_response_text({}) is None


# ---------------------------------------------------------------------------
# 3. Pydantic Settings Loading (backend/.env dynamic parsing)
# ---------------------------------------------------------------------------

def test_pydantic_settings_loads_from_env_file():
    """
    Verify that Pydantic Settings reads AZURE_AI_PROJECT_ENDPOINT and AZURE_AI_MODEL
    from an environment file dynamically upon instantiation.
    """
    with tempfile.NamedTemporaryFile("w", suffix=".env", delete=False) as tmp_env:
        tmp_env.write(
            "AZURE_AI_PROJECT_ENDPOINT=https://sentri-ai-resource.services.ai.azure.com/api/projects/sentri-ai\n"
            "AZURE_AI_MODEL=gpt-5-mini\n"
            "LLM_PROVIDER=azure\n"
        )
        tmp_env_path = tmp_env.name

    try:
        custom_settings = Settings(_env_file=tmp_env_path)
        assert custom_settings.AZURE_AI_PROJECT_ENDPOINT == "https://sentri-ai-resource.services.ai.azure.com/api/projects/sentri-ai"
        assert custom_settings.AZURE_AI_MODEL == "gpt-5-mini"
        assert custom_settings.LLM_PROVIDER == "azure"
    finally:
        Path(tmp_env_path).unlink(missing_ok=True)


def test_pydantic_settings_defaults():
    """Verify default values when no Azure environment variables are provided."""
    with patch.dict("os.environ", {}, clear=True):
        fresh_settings = Settings(_env_file=None)
        assert fresh_settings.AZURE_AI_PROJECT_ENDPOINT == ""
        assert fresh_settings.AZURE_AI_MODEL == "gpt-5-mini"
        assert fresh_settings.LLM_PROVIDER == "auto"


# ---------------------------------------------------------------------------
# 4. Azure Client Construction & Entra ID Auth
# ---------------------------------------------------------------------------

def test_azure_client_construction():
    """
    Verify that OpenAI client is constructed with DefaultAzureCredential,
    the 'https://ai.azure.com/.default' Entra ID token scope, the correct /openai/v1 base URL,
    and an explicit 30.0s timeout.
    """
    with patch("azure.identity.DefaultAzureCredential") as mock_cred_cls, \
         patch("azure.identity.get_bearer_token_provider") as mock_get_token, \
         patch("openai.OpenAI") as mock_openai_cls:

        mock_cred = MagicMock()
        mock_cred_cls.return_value = mock_cred

        mock_token_provider = MagicMock()
        mock_get_token.return_value = mock_token_provider

        mock_client = MagicMock()
        mock_openai_cls.return_value = mock_client

        test_project_endpoint = "https://sentri-ai-resource.services.ai.azure.com/api/projects/sentri-ai"
        client = llm_service._create_azure_client(test_project_endpoint)

        mock_cred_cls.assert_called_once()
        mock_get_token.assert_called_once_with(mock_cred, "https://ai.azure.com/.default")
        mock_openai_cls.assert_called_once_with(
            base_url="https://sentri-ai-resource.services.ai.azure.com/api/projects/sentri-ai/openai/v1",
            api_key=mock_token_provider,
            timeout=30.0
        )
        assert client == mock_client


def test_azure_client_has_explicit_30s_timeout():
    """
    Verify that LLMProviderService._create_azure_client() explicitly configures
    a 30.0 second timeout on the OpenAI client to prevent worker hangs.
    """
    with patch("azure.identity.DefaultAzureCredential"), \
         patch("azure.identity.get_bearer_token_provider"), \
         patch("openai.OpenAI") as mock_openai_cls:
        test_project_endpoint = "https://sentri-ai-resource.services.ai.azure.com/api/projects/sentri-ai"
        llm_service._create_azure_client(test_project_endpoint)

        mock_openai_cls.assert_called_once()
        _, kwargs = mock_openai_cls.call_args
        assert "timeout" in kwargs, "OpenAI client must be initialized with an explicit timeout"
        assert kwargs["timeout"] == 30.0, f"Expected timeout of 30.0s, got {kwargs.get('timeout')}"


# ---------------------------------------------------------------------------
# 5. Provider Selection & Priority Detection
# ---------------------------------------------------------------------------

def test_azure_configuration_detection():
    """Verify that Azure Foundry settings are correctly detected and reflected in metadata."""
    orig_endpoint = settings.AZURE_AI_PROJECT_ENDPOINT
    orig_model = settings.AZURE_AI_MODEL
    orig_provider = settings.LLM_PROVIDER
    orig_gemini = settings.GEMINI_API_KEY
    orig_openai = settings.OPENAI_API_KEY

    try:
        settings.AZURE_AI_PROJECT_ENDPOINT = "https://sentri-ai-resource.services.ai.azure.com/api/projects/sentri-ai"
        settings.AZURE_AI_MODEL = "gpt-5-mini"
        settings.LLM_PROVIDER = "auto"

        info = llm_service.get_active_provider_info()
        assert info["provider"] == "azure_foundry"
        assert info["model"] == "gpt-5-mini"

        # Fallback when unconfigured
        settings.AZURE_AI_PROJECT_ENDPOINT = ""
        settings.GEMINI_API_KEY = ""
        settings.OPENAI_API_KEY = ""
        settings.LLM_PROVIDER = "auto"

        info_fallback = llm_service.get_active_provider_info()
        assert info_fallback["provider"] == "local_heuristic"
        assert info_fallback["model"] == "rule-engine-v1"
    finally:
        settings.AZURE_AI_PROJECT_ENDPOINT = orig_endpoint
        settings.AZURE_AI_MODEL = orig_model
        settings.LLM_PROVIDER = orig_provider
        settings.GEMINI_API_KEY = orig_gemini
        settings.OPENAI_API_KEY = orig_openai


# ---------------------------------------------------------------------------
# 6. Mocked OpenAI Responses API Inference
# ---------------------------------------------------------------------------

def test_azure_responses_api_inference_mocked():
    """Verify inference call to Azure Foundry GPT-5-mini using the OpenAI Responses API."""
    orig_endpoint = settings.AZURE_AI_PROJECT_ENDPOINT
    orig_model = settings.AZURE_AI_MODEL
    orig_provider = settings.LLM_PROVIDER

    try:
        settings.AZURE_AI_PROJECT_ENDPOINT = "https://sentri-ai-resource.services.ai.azure.com/api/projects/sentri-ai"
        settings.AZURE_AI_MODEL = "gpt-5-mini"
        settings.LLM_PROVIDER = "auto"

        mock_response = MagicMock()
        mock_response.output_text = "Analysis: The email is a phishing attempt targeting university credentials."

        mock_client = MagicMock()
        mock_client.responses.create.return_value = mock_response

        with patch.object(llm_service, "_create_azure_client", return_value=mock_client):
            reply = asyncio.run(llm_service.generate_chat_response(
                messages=[{"role": "user", "content": "Please inspect this email"}],
                system_prompt="You are a SOC assistant.",
                context="Known phishing indicators."
            ))

            assert "Analysis: The email is a phishing attempt" in reply
            assert llm_service.last_provider_used == "azure_foundry"
            assert llm_service.last_model_used == "gpt-5-mini"

            # Check that responses.create was called with model gpt-5-mini, input, and instructions without temperature
            mock_client.responses.create.assert_called_once()
            call_kwargs = mock_client.responses.create.call_args[1]
            assert call_kwargs["model"] == "gpt-5-mini"
            assert call_kwargs["input"] == [{"role": "user", "content": "Please inspect this email"}]
            assert "You are a SOC assistant." in call_kwargs["instructions"]
            assert "Grounding Knowledge Context:\nKnown phishing indicators." in call_kwargs["instructions"]
            assert "temperature" not in call_kwargs, "temperature must not be sent to gpt-5-mini"
    finally:
        settings.AZURE_AI_PROJECT_ENDPOINT = orig_endpoint
        settings.AZURE_AI_MODEL = orig_model
        settings.LLM_PROVIDER = orig_provider


def test_azure_responses_api_does_not_send_temperature():
    """Verify that Azure Responses API request for gpt-5-mini explicitly omits the unsupported 'temperature' parameter."""
    orig_endpoint = settings.AZURE_AI_PROJECT_ENDPOINT
    orig_model = settings.AZURE_AI_MODEL
    orig_provider = settings.LLM_PROVIDER

    try:
        settings.AZURE_AI_PROJECT_ENDPOINT = "https://sentri-ai-resource.services.ai.azure.com/api/projects/sentri-ai"
        settings.AZURE_AI_MODEL = "gpt-5-mini"
        settings.LLM_PROVIDER = "auto"

        mock_response = MagicMock()
        mock_response.output_text = "SentriAI Azure connection successful"

        mock_client = MagicMock()
        mock_client.responses.create.return_value = mock_response

        with patch.object(llm_service, "_create_azure_client", return_value=mock_client):
            reply = asyncio.run(llm_service.generate_chat_response(
                messages=[{"role": "user", "content": "Reply with exactly: SentriAI Azure connection successful"}]
            ))

            assert reply == "SentriAI Azure connection successful"
            mock_client.responses.create.assert_called_once()
            call_kwargs = mock_client.responses.create.call_args[1]
            assert "temperature" not in call_kwargs, "Azure Foundry gpt-5-mini rejects temperature parameter; it must be omitted"
            assert call_kwargs["model"] == "gpt-5-mini"
            assert call_kwargs["input"] == [{"role": "user", "content": "Reply with exactly: SentriAI Azure connection successful"}]
    finally:
        settings.AZURE_AI_PROJECT_ENDPOINT = orig_endpoint
        settings.AZURE_AI_MODEL = orig_model
        settings.LLM_PROVIDER = orig_provider


def test_azure_responses_api_multi_turn():
    """Verify that multi-turn user/assistant conversation history is preserved in Responses API input."""
    orig_endpoint = settings.AZURE_AI_PROJECT_ENDPOINT
    orig_model = settings.AZURE_AI_MODEL
    orig_provider = settings.LLM_PROVIDER

    try:
        settings.AZURE_AI_PROJECT_ENDPOINT = "https://sentri-ai-resource.services.ai.azure.com/api/projects/sentri-ai"
        settings.AZURE_AI_MODEL = "gpt-5-mini"
        settings.LLM_PROVIDER = "auto"

        mock_response = MagicMock()
        mock_response.output_text = "Yes, please report it to the help desk."

        mock_client = MagicMock()
        mock_client.responses.create.return_value = mock_response

        messages = [
            {"role": "user", "content": "I received an unexpected email."},
            {"role": "assistant", "content": "Did it ask for your password or credentials?"},
            {"role": "user", "content": "Yes, it did."}
        ]

        with patch.object(llm_service, "_create_azure_client", return_value=mock_client):
            reply = asyncio.run(llm_service.generate_chat_response(
                messages=messages,
                system_prompt="SOC Guide."
            ))

            assert reply == "Yes, please report it to the help desk."
            call_kwargs = mock_client.responses.create.call_args[1]
            assert call_kwargs["input"] == messages
            assert call_kwargs["instructions"] == "SOC Guide."
    finally:
        settings.AZURE_AI_PROJECT_ENDPOINT = orig_endpoint
        settings.AZURE_AI_MODEL = orig_model
        settings.LLM_PROVIDER = orig_provider


# ---------------------------------------------------------------------------
# 7. Safe Fallback on Failure
# ---------------------------------------------------------------------------

def test_azure_responses_api_failure_fallback():
    """Verify that when Azure Responses API fails, the provider safely falls back without crashing."""
    orig_endpoint = settings.AZURE_AI_PROJECT_ENDPOINT
    orig_model = settings.AZURE_AI_MODEL
    orig_provider = settings.LLM_PROVIDER
    orig_gemini = settings.GEMINI_API_KEY
    orig_openai = settings.OPENAI_API_KEY

    try:
        settings.AZURE_AI_PROJECT_ENDPOINT = "https://sentri-ai-resource.services.ai.azure.com/api/projects/sentri-ai"
        settings.AZURE_AI_MODEL = "gpt-5-mini"
        settings.LLM_PROVIDER = "auto"
        settings.GEMINI_API_KEY = ""
        settings.OPENAI_API_KEY = ""

        # Mock Azure client responses.create to simulate API failure
        mock_client = MagicMock()
        mock_client.responses.create.side_effect = Exception("Azure Responses API 500: Internal Server Error")

        with patch.object(llm_service, "_create_azure_client", return_value=mock_client):
            reply = asyncio.run(llm_service.generate_chat_response(
                messages=[{"role": "user", "content": "What is phishing?"}]
            ))

            # Must not crash; must return local heuristic fallback
            assert reply is not None
            assert len(reply) > 0
            assert "Phishing is a deceptive social engineering attack" in reply
            assert llm_service.last_provider_used == "local_heuristic"
            assert llm_service.last_model_used == "rule-engine-v1"
    finally:
        settings.AZURE_AI_PROJECT_ENDPOINT = orig_endpoint
        settings.AZURE_AI_MODEL = orig_model
        settings.LLM_PROVIDER = orig_provider
        settings.GEMINI_API_KEY = orig_gemini
        settings.OPENAI_API_KEY = orig_openai


# ---------------------------------------------------------------------------
# 8. Existing Providers Intact
# ---------------------------------------------------------------------------

def test_existing_providers_intact():
    """Verify that Gemini, OpenAI, and local fallbacks remain functional."""
    orig_endpoint = settings.AZURE_AI_PROJECT_ENDPOINT
    orig_provider = settings.LLM_PROVIDER
    orig_gemini = settings.GEMINI_API_KEY
    orig_openai = settings.OPENAI_API_KEY

    try:
        # Disable Azure
        settings.AZURE_AI_PROJECT_ENDPOINT = ""
        settings.LLM_PROVIDER = "auto"

        # 1. Test Gemini call
        settings.GEMINI_API_KEY = "mock_gemini_key"
        with patch.object(llm_service, "_call_gemini", return_value="Response from Gemini"):
            res = asyncio.run(llm_service.generate_chat_response([{"role": "user", "content": "Hello"}]))
            assert res == "Response from Gemini"

        # 2. Test OpenAI call when Gemini fails
        settings.GEMINI_API_KEY = "mock_gemini_key"
        settings.OPENAI_API_KEY = "mock_openai_key"
        with patch.object(llm_service, "_call_gemini", side_effect=Exception("Gemini quota exceeded")), \
             patch.object(llm_service, "_call_openai", return_value="Response from OpenAI"):
            res = asyncio.run(llm_service.generate_chat_response([{"role": "user", "content": "Hello"}]))
            assert res == "Response from OpenAI"

        # 3. Test Local heuristic when all fail or absent
        settings.GEMINI_API_KEY = ""
        settings.OPENAI_API_KEY = ""
        res_local = asyncio.run(llm_service.generate_chat_response([{"role": "user", "content": "Someone asked for my OTP"}]))
        assert "Never share your OTP" in res_local
        assert llm_service.last_provider_used == "local_heuristic"
    finally:
        settings.AZURE_AI_PROJECT_ENDPOINT = orig_endpoint
        settings.LLM_PROVIDER = orig_provider
        settings.GEMINI_API_KEY = orig_gemini
        settings.OPENAI_API_KEY = orig_openai


# ---------------------------------------------------------------------------
# 9. Milestone 2: Structured Investigation Synthesis & RAG Grounding
# ---------------------------------------------------------------------------

SAMPLE_SUBMISSION = """
From: admin-security@university-verify-service.xyz
Subject: Urgent: Your student account will be disabled in 24 hours!
Click here to confirm your credentials: http://login-portal.xyz/auth
"""

SAMPLE_TOOLS_EVIDENCE = {
    "urls": [
        {
            "url": "http://login-portal.xyz/auth",
            "domain": "login-portal.xyz",
            "is_suspicious": True,
            "indicators": [{"name": "High-Risk TLD (.xyz)"}, {"name": "Credential Keyword (auth)"}]
        }
    ],
    "history": {
        "similar_incidents_found": 1,
        "is_recurring_campaign": False
    }
}

SAMPLE_RAG_CONTEXT = [
    {
        "chunk_id": "chunk-101",
        "document_title": "University Phishing Incident Playbook",
        "category": "PLAYBOOK",
        "chunk_text": "Official institutional communications never request passwords over email or use .xyz domains. Isolate suspicious links.",
        "similarity_score": 0.88
    },
    {
        "chunk_id": "chunk-102",
        "document_title": "Credential Harvesting Guidelines",
        "category": "POLICY",
        "chunk_text": "Immediate credential rotation is required if credentials were submitted to unverified forms.",
        "similarity_score": 0.82
    }
]

SAMPLE_RISK_DATA = {
    "score": 80,
    "severity": "CRITICAL",
    "confidence": 0.95,
    "breakdown": [
        {"indicator": "Urgency Term", "points": 20},
        {"indicator": "High-Risk TLD (.xyz)", "points": 25},
        {"indicator": "Credential Keyword (auth)", "points": 35}
    ]
}


def test_investigation_successful_llm_json_parsing():
    """Verify successful parsing of structured LLM JSON response into the required schema."""
    llm_payload = {
        "threat_classification": "CRITICAL_ATTACK",
        "key_indicators": ["High-Risk .xyz TLD", "Psychological Urgency", "Credential Solicitation"],
        "evidence_summary": "Detected deceptive .xyz URL attempting to solicit university student credentials under false 24h deadline.",
        "potential_impact": "Potential student identity compromise, unauthorized access to grades, and institutional portal intrusion.",
        "agent_investigation_summary": "Grounded investigation cross-referenced observed indicators against University Phishing Incident Playbook.",
        "final_conclusion": "High-risk credential harvesting campaign. Block domain and request analyst authorization for password reset."
    }

    async def mock_generate_chat(messages, context=None, system_prompt=None):
        llm_service.last_provider_used = "azure_foundry"
        llm_service.last_model_used = "gpt-5-mini"
        import json
        return json.dumps(llm_payload)

    with patch.object(llm_service, "generate_chat_response", side_effect=mock_generate_chat):
        res = asyncio.run(llm_service.generate_structured_investigation(
            submission_text=SAMPLE_SUBMISSION,
            user_mode="STUDENT",
            tools_evidence=SAMPLE_TOOLS_EVIDENCE,
            rag_context=SAMPLE_RAG_CONTEXT,
            risk_data=SAMPLE_RISK_DATA
        ))

        assert res["threat_classification"] == "CRITICAL_ATTACK"
        assert res["key_indicators"] == llm_payload["key_indicators"]
        assert res["evidence_summary"] == llm_payload["evidence_summary"]
        assert res["potential_impact"] == llm_payload["potential_impact"]
        assert res["agent_investigation_summary"] == llm_payload["agent_investigation_summary"]
        assert res["final_conclusion"] == llm_payload["final_conclusion"]
        # Check deterministic values are strictly preserved
        assert res["risk_score"] == 80
        assert res["severity"] == "CRITICAL"
        assert res["confidence"] == 0.95


def test_investigation_rag_chunk_text_included_in_context():
    """Verify that the actual text of retrieved RAG chunks is provided in the context sent to the LLM."""
    captured_call = {}

    async def mock_generate_chat(messages, context=None, system_prompt=None):
        llm_service.last_provider_used = "azure_foundry"
        captured_call["context"] = context
        captured_call["system_prompt"] = system_prompt
        import json
        return json.dumps({
            "threat_classification": "CRITICAL_ATTACK",
            "key_indicators": ["Test"],
            "evidence_summary": "Test evidence",
            "potential_impact": "Test impact",
            "agent_investigation_summary": "Test summary",
            "final_conclusion": "Test conclusion"
        })

    with patch.object(llm_service, "generate_chat_response", side_effect=mock_generate_chat):
        asyncio.run(llm_service.generate_structured_investigation(
            submission_text=SAMPLE_SUBMISSION,
            user_mode="STUDENT",
            tools_evidence=SAMPLE_TOOLS_EVIDENCE,
            rag_context=SAMPLE_RAG_CONTEXT,
            risk_data=SAMPLE_RISK_DATA
        ))

        ctx = captured_call.get("context", "")
        sys = captured_call.get("system_prompt", "")

        # Verify actual chunk text is present in context
        assert "Official institutional communications never request passwords over email" in ctx
        assert "University Phishing Incident Playbook" in ctx
        assert "Immediate credential rotation is required" in ctx
        # Verify tool evidence is present in context
        assert "login-portal.xyz" in ctx
        # Verify system prompt grounding instructions
        assert "MANDATORY INVESTIGATION GUIDELINES" in sys
        assert "Do NOT invent facts" in sys
        assert "distinguish observed evidence from analytical interpretation" in sys
        assert "human SOC analyst approval" in sys


def test_investigation_preserves_deterministic_risk_metrics():
    """Verify risk_score, severity, and confidence remain strictly from RiskScorer even if LLM returns conflicting numbers."""
    rogue_llm_payload = {
        "threat_classification": "LIKELY_BENIGN",
        "risk_score": 5,
        "severity": "LOW",
        "confidence": 0.10,
        "key_indicators": ["Harmless"],
        "evidence_summary": "Everything is fine.",
        "potential_impact": "None.",
        "agent_investigation_summary": "I decided this is safe.",
        "final_conclusion": "Ignore warning."
    }

    async def mock_generate_chat(messages, context=None, system_prompt=None):
        llm_service.last_provider_used = "azure_foundry"
        import json
        return json.dumps(rogue_llm_payload)

    with patch.object(llm_service, "generate_chat_response", side_effect=mock_generate_chat):
        res = asyncio.run(llm_service.generate_structured_investigation(
            submission_text=SAMPLE_SUBMISSION,
            user_mode="STUDENT",
            tools_evidence=SAMPLE_TOOLS_EVIDENCE,
            rag_context=SAMPLE_RAG_CONTEXT,
            risk_data=SAMPLE_RISK_DATA  # score 80, CRITICAL, 0.95
        ))

        # Model's rogue 5 and LOW must be ignored! Deterministic rubric must rule:
        assert res["risk_score"] == 80
        assert res["severity"] == "CRITICAL"
        assert res["confidence"] == 0.95


def test_investigation_malformed_json_triggers_deterministic_fallback():
    """Verify that malformed JSON from the LLM cleanly falls back to the deterministic template."""
    async def mock_generate_chat(messages, context=None, system_prompt=None):
        llm_service.last_provider_used = "azure_foundry"
        return "This is definitely not JSON: {threat_classification: broken..."

    with patch.object(llm_service, "generate_chat_response", side_effect=mock_generate_chat):
        res = asyncio.run(llm_service.generate_structured_investigation(
            submission_text=SAMPLE_SUBMISSION,
            user_mode="STUDENT",
            tools_evidence=SAMPLE_TOOLS_EVIDENCE,
            rag_context=SAMPLE_RAG_CONTEXT,
            risk_data=SAMPLE_RISK_DATA
        ))

        # Must return valid deterministic schema
        assert res["threat_classification"] == "CRITICAL_ATTACK"
        assert res["risk_score"] == 80
        assert res["severity"] == "CRITICAL"
        assert len(res["key_indicators"]) == 3
        assert "Analyzed" in res["evidence_summary"]
        assert "High probability of credential harvesting" in res["potential_impact"]
        assert "SentriAI Agent executed multi-step inspection" in res["agent_investigation_summary"]


def test_investigation_empty_llm_response_triggers_deterministic_fallback():
    """Verify that empty string or None response triggers the deterministic template fallback."""
    async def mock_generate_chat(messages, context=None, system_prompt=None):
        llm_service.last_provider_used = "azure_foundry"
        return ""

    with patch.object(llm_service, "generate_chat_response", side_effect=mock_generate_chat):
        res = asyncio.run(llm_service.generate_structured_investigation(
            submission_text=SAMPLE_SUBMISSION,
            user_mode="STUDENT",
            tools_evidence=SAMPLE_TOOLS_EVIDENCE,
            rag_context=SAMPLE_RAG_CONTEXT,
            risk_data=SAMPLE_RISK_DATA
        ))

        assert res["threat_classification"] == "CRITICAL_ATTACK"
        assert res["risk_score"] == 80
        assert res["severity"] == "CRITICAL"
        assert "SentriAI Agent executed multi-step inspection" in res["agent_investigation_summary"]


def test_investigation_local_heuristic_provider_triggers_deterministic_fallback():
    """Verify that if the provider chain falls back to local heuristics, deterministic template is preserved."""
    async def mock_generate_chat(messages, context=None, system_prompt=None):
        llm_service.last_provider_used = "local_heuristic"
        return "Phishing is a deceptive social engineering attack where attackers impersonate..."

    with patch.object(llm_service, "generate_chat_response", side_effect=mock_generate_chat):
        res = asyncio.run(llm_service.generate_structured_investigation(
            submission_text=SAMPLE_SUBMISSION,
            user_mode="STUDENT",
            tools_evidence=SAMPLE_TOOLS_EVIDENCE,
            rag_context=SAMPLE_RAG_CONTEXT,
            risk_data=SAMPLE_RISK_DATA
        ))

        # Must not use conversational text as a raw structured report; must return formal template
        assert res["threat_classification"] == "CRITICAL_ATTACK"
        assert res["risk_score"] == 80
        assert "SentriAI Agent executed multi-step inspection" in res["agent_investigation_summary"]


def test_investigation_markdown_fenced_json_parsing():
    """Verify that when an LLM wraps the response in ```json ... ``` code blocks, it parses cleanly."""
    fenced_content = """```json
{
  "threat_classification": "LIKELY_PHISHING",
  "key_indicators": ["Suspicious URL"],
  "evidence_summary": "External link detected.",
  "potential_impact": "Possible credential disclosure.",
  "agent_investigation_summary": "Analyzed link with institutional playbooks.",
  "final_conclusion": "Review before proceeding."
}
```"""

    async def mock_generate_chat(messages, context=None, system_prompt=None):
        llm_service.last_provider_used = "azure_foundry"
        return fenced_content

    with patch.object(llm_service, "generate_chat_response", side_effect=mock_generate_chat):
        res = asyncio.run(llm_service.generate_structured_investigation(
            submission_text="Check this link: http://example.xyz",
            user_mode="STUDENT",
            tools_evidence={},
            rag_context=[],
            risk_data={"score": 60, "severity": "HIGH", "confidence": 0.90, "breakdown": []}
        ))

        assert res["threat_classification"] == "LIKELY_PHISHING"
        assert res["risk_score"] == 60
        assert res["severity"] == "HIGH"
        assert res["evidence_summary"] == "External link detected."
        assert res["potential_impact"] == "Possible credential disclosure."


# ---------------------------------------------------------------------------
# 10. Milestone 5: Provider Observability & Investigation Persistence
# ---------------------------------------------------------------------------

import time
import itertools
from app.models.schema import User, Incident, AIInvestigation
from app.core.database import SessionLocal
from app.services.agent.orchestrator import agent_orchestrator

_test_time_counter = itertools.count(int(time.time() * 10) % 500000 + 100000)


def test_actual_provider_info_getter():
    """Verify that get_actual_provider_info returns the actual state from last generation."""
    llm_service.last_provider_used = "azure_foundry"
    llm_service.last_model_used = "gpt-5-mini"
    info = llm_service.get_actual_provider_info()
    assert info["provider"] == "azure_foundry"
    assert info["model"] == "gpt-5-mini"

    llm_service.last_provider_used = "local_heuristic"
    llm_service.last_model_used = "rule-engine-v1"
    info = llm_service.get_actual_provider_info()
    assert info["provider"] == "local_heuristic"
    assert info["model"] == "rule-engine-v1"


def test_investigation_observability_azure_success():
    """
    Verify that when Azure Foundry generates the structured response,
    the persisted AIInvestigation records provider='azure_foundry' and model='gpt-5-mini'.
    """
    db = SessionLocal()
    created_id = None
    try:
        user = db.query(User).first()
        user_id = user.id if user else "system"

        llm_payload = {
            "threat_classification": "CRITICAL_ATTACK",
            "key_indicators": ["Observed Azure Indicator"],
            "evidence_summary": "Azure confirmed malicious campaign.",
            "potential_impact": "Account hijacking risk.",
            "agent_investigation_summary": "Grounded Azure SOC analysis.",
            "final_conclusion": "Immediate containment required."
        }

        async def mock_generate_chat(messages, context=None, system_prompt=None):
            llm_service.last_provider_used = "azure_foundry"
            llm_service.last_model_used = "gpt-5-mini"
            import json
            return json.dumps(llm_payload)

        with patch("time.time", side_effect=lambda: float(next(_test_time_counter))), \
             patch.object(llm_service, "generate_chat_response", side_effect=mock_generate_chat):
            res = asyncio.run(agent_orchestrator.investigate_submission(
                db=db,
                content="Urgent: Your student portal requires verification at http://portal-verify.xyz",
                submission_type="MESSAGE",
                user_mode="STUDENT",
                user_id=user_id
            ))
            created_id = res["incident_id"]

            # Verify actual provider info
            actual_info = llm_service.get_actual_provider_info()
            assert actual_info["provider"] == "azure_foundry"
            assert actual_info["model"] == "gpt-5-mini"

            # Verify persisted database record
            inv = db.query(AIInvestigation).filter(AIInvestigation.incident_id == created_id).first()
            assert inv is not None
            assert inv.provider == "azure_foundry"
            assert inv.model_used == "gpt-5-mini"
    finally:
        if created_id:
            inc = db.query(Incident).filter(Incident.id == created_id).first()
            if inc:
                db.delete(inc)
                db.commit()
        db.close()


def test_investigation_observability_gemini_fallback():
    """
    Verify that when Azure fails and Gemini handles the investigation,
    the persisted AIInvestigation records provider='google_gemini' and model='gemini-1.5-flash'.
    """
    db = SessionLocal()
    created_id = None
    try:
        user = db.query(User).first()
        user_id = user.id if user else "system"

        llm_payload = {
            "threat_classification": "LIKELY_PHISHING",
            "key_indicators": ["Gemini Fallback Indicator"],
            "evidence_summary": "Gemini verified suspicious link.",
            "potential_impact": "Credential exposure.",
            "agent_investigation_summary": "Gemini fallback investigation.",
            "final_conclusion": "Report message to SOC."
        }

        async def mock_generate_chat(messages, context=None, system_prompt=None):
            llm_service.last_provider_used = "google_gemini"
            llm_service.last_model_used = "gemini-1.5-flash"
            import json
            return json.dumps(llm_payload)

        with patch("time.time", side_effect=lambda: float(next(_test_time_counter))), \
             patch.object(llm_service, "generate_chat_response", side_effect=mock_generate_chat):
            res = asyncio.run(agent_orchestrator.investigate_submission(
                db=db,
                content="Urgent: Account disabled notice at http://verify.xyz",
                submission_type="MESSAGE",
                user_mode="STUDENT",
                user_id=user_id
            ))
            created_id = res["incident_id"]

            actual_info = llm_service.get_actual_provider_info()
            assert actual_info["provider"] == "google_gemini"
            assert actual_info["model"] == "gemini-1.5-flash"

            inv = db.query(AIInvestigation).filter(AIInvestigation.incident_id == created_id).first()
            assert inv is not None
            assert inv.provider == "google_gemini"
            assert inv.model_used == "gemini-1.5-flash"
    finally:
        if created_id:
            inc = db.query(Incident).filter(Incident.id == created_id).first()
            if inc:
                db.delete(inc)
                db.commit()
        db.close()


def test_investigation_observability_openai_fallback():
    """
    Verify that when Azure and Gemini fail and OpenAI handles the investigation,
    the persisted AIInvestigation records provider='openai' and model='gpt-4o-mini'.
    """
    db = SessionLocal()
    created_id = None
    try:
        user = db.query(User).first()
        user_id = user.id if user else "system"

        llm_payload = {
            "threat_classification": "LIKELY_PHISHING",
            "key_indicators": ["OpenAI Fallback Indicator"],
            "evidence_summary": "OpenAI verified suspicious link.",
            "potential_impact": "Credential exposure.",
            "agent_investigation_summary": "OpenAI fallback investigation.",
            "final_conclusion": "Avoid clicking the link."
        }

        async def mock_generate_chat(messages, context=None, system_prompt=None):
            llm_service.last_provider_used = "openai"
            llm_service.last_model_used = "gpt-4o-mini"
            import json
            return json.dumps(llm_payload)

        with patch("time.time", side_effect=lambda: float(next(_test_time_counter))), \
             patch.object(llm_service, "generate_chat_response", side_effect=mock_generate_chat):
            res = asyncio.run(agent_orchestrator.investigate_submission(
                db=db,
                content="Claim your scholarship prize at http://prize-claim.xyz",
                submission_type="MESSAGE",
                user_mode="STUDENT",
                user_id=user_id
            ))
            created_id = res["incident_id"]

            actual_info = llm_service.get_actual_provider_info()
            assert actual_info["provider"] == "openai"
            assert actual_info["model"] == "gpt-4o-mini"

            inv = db.query(AIInvestigation).filter(AIInvestigation.incident_id == created_id).first()
            assert inv is not None
            assert inv.provider == "openai"
            assert inv.model_used == "gpt-4o-mini"
    finally:
        if created_id:
            inc = db.query(Incident).filter(Incident.id == created_id).first()
            if inc:
                db.delete(inc)
                db.commit()
        db.close()


def test_investigation_observability_local_deterministic_fallback():
    """
    Verify that when all cloud providers fail and local deterministic fallback runs,
    the persisted AIInvestigation records provider='local_heuristic' and model='rule-engine-v1'.
    """
    db = SessionLocal()
    created_id = None
    try:
        user = db.query(User).first()
        user_id = user.id if user else "system"

        async def mock_generate_chat(messages, context=None, system_prompt=None):
            llm_service.last_provider_used = "local_heuristic"
            llm_service.last_model_used = "rule-engine-v1"
            return "Local rule engine advice."

        with patch("time.time", side_effect=lambda: float(next(_test_time_counter))), \
             patch.object(llm_service, "generate_chat_response", side_effect=mock_generate_chat):
            res = asyncio.run(agent_orchestrator.investigate_submission(
                db=db,
                content="Urgent alert: reset password at http://fake-login.xyz",
                submission_type="MESSAGE",
                user_mode="STUDENT",
                user_id=user_id
            ))
            created_id = res["incident_id"]

            actual_info = llm_service.get_actual_provider_info()
            assert actual_info["provider"] == "local_heuristic"
            assert actual_info["model"] == "rule-engine-v1"

            inv = db.query(AIInvestigation).filter(AIInvestigation.incident_id == created_id).first()
            assert inv is not None
            assert inv.provider == "local_heuristic"
            assert inv.model_used == "rule-engine-v1"
    finally:
        if created_id:
            inc = db.query(Incident).filter(Incident.id == created_id).first()
            if inc:
                db.delete(inc)
                db.commit()
        db.close()


def test_investigation_observability_malformed_json_triggers_local_fallback():
    """
    Verify that when cloud LLM returns malformed JSON, the investigation falls back
    to the deterministic template and persists provider='local_heuristic' / 'rule-engine-v1'.
    """
    db = SessionLocal()
    created_id = None
    try:
        user = db.query(User).first()
        user_id = user.id if user else "system"

        async def mock_generate_chat(messages, context=None, system_prompt=None):
            llm_service.last_provider_used = "azure_foundry"
            llm_service.last_model_used = "gpt-5-mini"
            return "Non-JSON unparseable output: {broken json..."

        with patch("time.time", side_effect=lambda: float(next(_test_time_counter))), \
             patch.object(llm_service, "generate_chat_response", side_effect=mock_generate_chat):
            res = asyncio.run(agent_orchestrator.investigate_submission(
                db=db,
                content="Verify your credentials at http://suspicious-site.xyz",
                submission_type="MESSAGE",
                user_mode="STUDENT",
                user_id=user_id
            ))
            created_id = res["incident_id"]

            actual_info = llm_service.get_actual_provider_info()
            assert actual_info["provider"] == "local_heuristic"
            assert actual_info["model"] == "rule-engine-v1"

            inv = db.query(AIInvestigation).filter(AIInvestigation.incident_id == created_id).first()
            assert inv is not None
            assert inv.provider == "local_heuristic"
            assert inv.model_used == "rule-engine-v1"
    finally:
        if created_id:
            inc = db.query(Incident).filter(Incident.id == created_id).first()
            if inc:
                db.delete(inc)
                db.commit()
        db.close()




