import asyncio
import json
import logging
import httpx
from typing import Dict, Any, List, Optional
from app.core.config import settings

logger = logging.getLogger("sentriai.llm")

class LLMProviderService:
    """
    Provider-agnostic Generative AI service supporting Microsoft Foundry (Azure AI),
    Google Gemini, OpenAI, and a high-accuracy local cybersecurity reasoning engine fallback.
    """

    def __init__(self):
        self.last_provider_used: str = "local_heuristic"
        self.last_model_used: str = "rule-engine-v1"

    @staticmethod
    def format_foundry_base_url(endpoint: str) -> str:
        """
        Transforms a Microsoft Foundry project endpoint into an OpenAI-compatible base URL.
        Expected input format:
            https://<resource>.services.ai.azure.com/api/projects/<project-name>
        Target base_url:
            https://<resource>.services.ai.azure.com/api/projects/<project-name>/openai/v1

        Note: When using the OpenAI Responses API, client.responses.create() automatically
        appends '/responses' to base_url, sending requests to:
            https://<resource>.services.ai.azure.com/api/projects/<project-name>/openai/v1/responses
        Do NOT append '/responses' or use the model-details endpoint as the project endpoint.
        """
        clean_endpoint = endpoint.strip().rstrip("/")
        if clean_endpoint.endswith("/responses"):
            clean_endpoint = clean_endpoint[:-len("/responses")].rstrip("/")
        if clean_endpoint.endswith("/openai/v1"):
            return clean_endpoint
        return f"{clean_endpoint}/openai/v1"

    @staticmethod
    def _extract_response_text(response: Any) -> Optional[str]:
        """
        Parses the Responses API output into the string format expected by SentriAI.
        Handles Response.output_text, response.output message contents, and backwards-compatible choices.
        """
        if not response:
            return None

        # 1. Official OpenAI Responses API convenience property
        if hasattr(response, "output_text") and response.output_text:
            return str(response.output_text).strip()

        # 2. Inspect output list if present on Response object or dict
        outputs = getattr(response, "output", None)
        if outputs is None and isinstance(response, dict):
            outputs = response.get("output")
        if outputs and isinstance(outputs, list):
            chunks = []
            for item in outputs:
                contents = getattr(item, "content", None)
                if contents is None and isinstance(item, dict):
                    contents = item.get("content")
                if isinstance(contents, list):
                    for block in contents:
                        text = getattr(block, "text", None)
                        if text is None and isinstance(block, dict):
                            text = block.get("text")
                        if isinstance(text, str) and text:
                            chunks.append(text)
                elif isinstance(contents, str) and contents:
                    chunks.append(contents)
                else:
                    item_text = getattr(item, "text", None)
                    if item_text is None and isinstance(item, dict):
                        item_text = item.get("text")
                    if isinstance(item_text, str) and item_text:
                        chunks.append(item_text)
            if chunks:
                return "".join(chunks).strip()

        # 3. Fallback compatibility if choices structure is returned
        choices = getattr(response, "choices", None)
        if choices is None and isinstance(response, dict):
            choices = response.get("choices")
        if choices and len(choices) > 0:
            choice = choices[0]
            msg = getattr(choice, "message", None)
            if msg is None and isinstance(choice, dict):
                msg = choice.get("message")
            if msg:
                content = getattr(msg, "content", None)
                if content is None and isinstance(msg, dict):
                    content = msg.get("content")
                if content:
                    return str(content).strip()

        return None

    def _create_azure_client(self, endpoint: str):
        """
        Creates an OpenAI-compatible client targeted at Microsoft Foundry project endpoint
        authenticated using Microsoft Entra ID (DefaultAzureCredential).
        """
        from azure.identity import DefaultAzureCredential, get_bearer_token_provider
        from openai import OpenAI

        base_url = self.format_foundry_base_url(endpoint)
        credential = DefaultAzureCredential()
        token_provider = get_bearer_token_provider(
            credential,
            "https://ai.azure.com/.default"
        )
        return OpenAI(
            base_url=base_url,
            api_key=token_provider,
            timeout=30.0,
        )

    async def _call_azure_foundry(
        self,
        messages: List[Dict[str, str]],
        context: Optional[str] = None,
        system_prompt: Optional[str] = None
    ) -> Optional[str]:
        client = self._create_azure_client(settings.AZURE_AI_PROJECT_ENDPOINT)

        instruction_parts = []
        if system_prompt:
            instruction_parts.append(system_prompt.strip())
        if context:
            instruction_parts.append(f"Grounding Knowledge Context:\n{context.strip()}")

        input_items = []
        for m in messages:
            role = m.get("role", "user")
            content = m.get("content", "")
            if role == "system":
                instruction_parts.append(content.strip())
            else:
                input_items.append({"role": role, "content": content})

        instructions = "\n\n".join(instruction_parts) if instruction_parts else None
        azure_model = settings.AZURE_AI_MODEL or "gpt-5-mini"

        create_kwargs: Dict[str, Any] = {
            "model": azure_model,
            "input": input_items if input_items else "",
        }
        if instructions:
            create_kwargs["instructions"] = instructions

        response = await asyncio.to_thread(
            client.responses.create,
            **create_kwargs
        )

        content = self._extract_response_text(response)
        if content:
            self.last_provider_used = "azure_foundry"
            self.last_model_used = azure_model
            return content

        return None

    async def _call_gemini(
        self,
        messages: List[Dict[str, str]],
        context: Optional[str] = None,
        system_prompt: Optional[str] = None
    ) -> Optional[str]:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{settings.LLM_MODEL}:generateContent?key={settings.GEMINI_API_KEY}"
        combined_prompt = ""
        if system_prompt:
            combined_prompt += f"System: {system_prompt}\n\n"
        if context:
            combined_prompt += f"Grounding Knowledge Context:\n{context}\n\n"
        for m in messages:
            combined_prompt += f"{m['role'].capitalize()}: {m['content']}\n"
        combined_prompt += "Assistant: "

        payload = {
            "contents": [{"parts": [{"text": combined_prompt}]}],
            "generationConfig": {"temperature": 0.2, "maxOutputTokens": 800}
        }
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(url, json=payload)
            if resp.status_code == 200:
                data = resp.json()
                text = data["candidates"][0]["content"]["parts"][0]["text"]
                self.last_provider_used = "google_gemini"
                self.last_model_used = settings.LLM_MODEL or "gemini-1.5-flash"
                return text
        return None

    async def _call_openai(
        self,
        messages: List[Dict[str, str]],
        context: Optional[str] = None,
        system_prompt: Optional[str] = None
    ) -> Optional[str]:
        url = "https://api.openai.com/v1/chat/completions"
        headers = {"Authorization": f"Bearer {settings.OPENAI_API_KEY}"}
        api_messages = []
        if system_prompt:
            sys = system_prompt
            if context:
                sys += f"\n\nContext:\n{context}"
            api_messages.append({"role": "system", "content": sys})
        api_messages.extend(messages)

        payload = {
            "model": "gpt-4o-mini",
            "messages": api_messages,
            "temperature": 0.2
        }
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(url, headers=headers, json=payload)
            if resp.status_code == 200:
                data = resp.json()
                self.last_provider_used = "openai"
                self.last_model_used = "gpt-4o-mini"
                return data["choices"][0]["message"]["content"]
        return None

    async def generate_chat_response(
        self,
        messages: List[Dict[str, str]],
        context: Optional[str] = None,
        system_prompt: Optional[str] = None
    ) -> str:
        provider_pref = (settings.LLM_PROVIDER or "auto").lower()

        # Build prioritized provider sequence
        if provider_pref in ["azure", "azure_foundry"]:
            order = ["azure", "gemini", "openai", "local"]
        elif provider_pref == "gemini":
            order = ["gemini", "azure", "openai", "local"]
        elif provider_pref == "openai":
            order = ["openai", "azure", "gemini", "local"]
        elif provider_pref == "local":
            order = ["local"]
        else:
            # Default "auto" priority: 1. Azure Foundry, 2. Gemini, 3. OpenAI, 4. Local
            order = ["azure", "gemini", "openai", "local"]

        for p in order:
            if p == "azure" and settings.AZURE_AI_PROJECT_ENDPOINT and settings.AZURE_AI_MODEL:
                try:
                    res = await self._call_azure_foundry(messages, context, system_prompt)
                    if res:
                        return res
                except Exception as e:
                    logger.warning("Azure Foundry inference failed: %s. Falling back to next available provider.", str(e))
            elif p == "gemini" and settings.GEMINI_API_KEY:
                try:
                    res = await self._call_gemini(messages, context, system_prompt)
                    if res:
                        return res
                except Exception as e:
                    logger.warning("Gemini inference failed: %s. Falling back to next available provider.", str(e))
            elif p == "openai" and settings.OPENAI_API_KEY:
                try:
                    res = await self._call_openai(messages, context, system_prompt)
                    if res:
                        return res
                except Exception as e:
                    logger.warning("OpenAI inference failed: %s. Falling back to next available provider.", str(e))
            elif p == "local":
                self.last_provider_used = "local_heuristic"
                self.last_model_used = "rule-engine-v1"
                last_msg = messages[-1]["content"] if messages else ""
                return self._local_heuristic_chat(last_msg, context)

        self.last_provider_used = "local_heuristic"
        self.last_model_used = "rule-engine-v1"
        last_msg = messages[-1]["content"] if messages else ""
        return self._local_heuristic_chat(last_msg, context)

    def get_actual_provider_info(self) -> Dict[str, str]:
        """
        Returns the provider and model metadata that actually produced the last response.
        Used for accurate observability and investigation persistence across provider fallbacks.
        """
        return {
            "provider": getattr(self, "last_provider_used", "local_heuristic") or "local_heuristic",
            "model": getattr(self, "last_model_used", "rule-engine-v1") or "rule-engine-v1"
        }

    def get_active_provider_info(self) -> Dict[str, str]:
        """Returns the active provider and model metadata based on configuration and state."""
        pref = (settings.LLM_PROVIDER or "auto").lower()
        if pref in ["azure", "azure_foundry"] or (pref == "auto" and settings.AZURE_AI_PROJECT_ENDPOINT):
            return {"provider": "azure_foundry", "model": settings.AZURE_AI_MODEL or "gpt-5-mini"}
        if pref == "gemini" or (pref == "auto" and settings.GEMINI_API_KEY):
            return {"provider": "google_gemini", "model": settings.LLM_MODEL or "gemini-1.5-flash"}
        if pref == "openai" or (pref == "auto" and settings.OPENAI_API_KEY):
            return {"provider": "openai", "model": "gpt-4o-mini"}
        return {"provider": "local_heuristic", "model": "rule-engine-v1"}

    def _local_heuristic_chat(self, query: str, context: Optional[str] = None) -> str:
        q_lower = query.lower()
        if "phish" in q_lower or "fake email" in q_lower or "suspicious" in q_lower:
            return (
                "Phishing is a deceptive social engineering attack where attackers impersonate trusted institutions "
                "(such as your university, employer, or bank) to trick you into revealing passwords, session tokens, or sensitive data.\n\n"
                "Key signs to look out for:\n"
                "• Artificial urgency (e.g., 'Account disabled in 24 hours')\n"
                "• Links pointing to unverified domains\n"
                "• Requests for credentials, OTPs, or financial information\n\n"
                "If you receive a suspicious message, do not click links or provide credentials. Submit it here to SentriAI for deep agent analysis."
            )
        elif "clicked" in q_lower or "entered password" in q_lower or "compromis" in q_lower:
            return (
                "⚠️ **Immediate Account Compromise Response Required:**\n\n"
                "1. **Reset your password immediately** directly via the official portal (do NOT use any link in the message).\n"
                "2. **Enable or re-verify Multi-Factor Authentication (MFA)** on your account.\n"
                "3. **Sign out of all active sessions** across your devices.\n"
                "4. **Report the incident to your SOC / IT helpdesk** so they can inspect login logs for unauthorized IP addresses."
            )
        elif "otp" in q_lower:
            return (
                "⛔ **Never share your OTP (One-Time Password)** with anyone under any circumstances. "
                "Legitimate institutions, IT support, bank representatives, and university staff will NEVER ask for your OTP. "
                "Anyone soliciting an OTP is actively attempting to breach your account."
            )
        else:
            base = "Based on institutional cybersecurity best practices:\n"
            if context:
                base += f"Relevant guidance: {context[:250]}...\n\n"
            base += "Always verify unexpected messages through official out-of-band channels before clicking links or entering passwords."
            return base

    def _deterministic_investigation_fallback(
        self,
        submission_text: str,
        user_mode: str,
        tools_evidence: Dict[str, Any],
        rag_context: List[Dict[str, Any]],
        risk_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Original rule-based deterministic investigation fallback.
        Invoked if the LLM provider fails, returns empty/malformed output, or falls back to local heuristics.
        """
        self.last_provider_used = "local_heuristic"
        self.last_model_used = "rule-engine-v1"
        score = risk_data.get("score", 50)
        severity = risk_data.get("severity", "MEDIUM")
        breakdown = risk_data.get("breakdown", [])

        # Format key indicators
        indicators_list = [b["indicator"] for b in breakdown]
        if not indicators_list:
            indicators_list = ["Unverified external communication"]

        # Build clear impact statement
        if score >= 75:
            impact = "High probability of credential harvesting, unauthorized account takeover, and subsequent organizational data compromise."
            conclusion = f"The submitted {user_mode.lower()} communication exhibits critical attack characteristics including deceptive urgency and direct credential solicitation. Immediate containment and prevention measures are advised."
        elif score >= 50:
            impact = "Likely phishing or deceptive social engineering attempting unauthorized data capture or credential theft."
            conclusion = f"The submitted message presents elevated risk indicators consistent with phishing. Users should avoid interacting with links or attachments."
        elif score >= 25:
            impact = "Potentially suspicious communication with unverified sender credentials."
            conclusion = f"The submitted message presents moderate caution signals. Independent out-of-band verification is recommended."
        else:
            impact = "Minimal identified risk. Standard security hygiene recommended."
            conclusion = "No significant malicious indicators identified. Communication appears consistent with standard correspondence."

        evidence_summary = (
            f"Analyzed {len(submission_text)} characters of submitted {user_mode.lower()} content. "
            f"Detected {len(breakdown)} primary threat indicators including: {', '.join(indicators_list[:4])}."
        )

        agent_summary = (
            f"SentriAI Agent executed multi-step inspection: verified sender credibility, extracted and inspected URLs, "
            f"cross-referenced incident telemetry, and retrieved {len(rag_context)} knowledge base playbooks. "
            f"Computed an explainable risk score of {score}/100 ({severity})."
        )

        classification = "LIKELY_PHISHING" if score >= 50 else ("POTENTIALLY_SUSPICIOUS" if score >= 25 else "LIKELY_BENIGN")
        if score >= 75:
            classification = "CRITICAL_ATTACK"

        return {
            "threat_classification": classification,
            "risk_score": score,
            "severity": severity,
            "confidence": risk_data.get("confidence", 0.90),
            "key_indicators": indicators_list,
            "evidence_summary": evidence_summary,
            "potential_impact": impact,
            "agent_investigation_summary": agent_summary,
            "final_conclusion": conclusion
        }

    async def generate_structured_investigation(
        self,
        submission_text: str,
        user_mode: str,
        tools_evidence: Dict[str, Any],
        rag_context: List[Dict[str, Any]],
        risk_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Synthesizes tools evidence, verified RAG security knowledge, and pre-computed risk score
        into a structured, explainable investigation report using GPT-5-mini (with automated fallback).
        """
        score = risk_data.get("score", 50)
        severity = risk_data.get("severity", "MEDIUM")
        confidence = risk_data.get("confidence", 0.90)
        breakdown = risk_data.get("breakdown", [])

        # 1. Deterministic baseline fallback in case of LLM unavailability or invalid output
        fallback = self._deterministic_investigation_fallback(
            submission_text=submission_text,
            user_mode=user_mode,
            tools_evidence=tools_evidence,
            rag_context=rag_context,
            risk_data=risk_data
        )

        # 2. Build explicit RAG knowledge reference blocks using ACTUAL CHUNK TEXT
        rag_blocks = []
        for idx, chunk in enumerate(rag_context, 1):
            title = chunk.get("document_title", f"Knowledge Reference {idx}")
            category = chunk.get("category", "GENERAL")
            chunk_text = chunk.get("chunk_text", "").strip()
            if chunk_text:
                rag_blocks.append(f"--- [RAG Source {idx}: {title} ({category})] ---\n{chunk_text}")

        formatted_rag = "\n\n".join(rag_blocks) if rag_blocks else "No institutional RAG knowledge retrieved."

        # 3. Build technical tool observations
        tools_summary = []
        urls_inspected = tools_evidence.get("urls", [])
        if urls_inspected:
            for u in urls_inspected:
                u_url = u.get("url", "")
                u_suspicious = u.get("is_suspicious", False)
                u_indicators = [i.get("name") for i in u.get("indicators", [])]
                tools_summary.append(f"• URL: {u_url} (Suspicious: {u_suspicious}, Indicators: {', '.join(u_indicators) if u_indicators else 'None'})")

        history = tools_evidence.get("history", {})
        if history:
            similar_count = history.get("similar_incidents_found", 0)
            is_recurring = history.get("is_recurring_campaign", False)
            tools_summary.append(f"• Incident History: {similar_count} similar incidents found (Recurring Campaign: {is_recurring})")

        tools_evidence_text = "\n".join(tools_summary) if tools_summary else "No external URLs or previous incident history matched."
        breakdown_text = "; ".join([f"{b.get('indicator', 'Indicator')} (+{b.get('points', 0)} pts)" for b in breakdown]) or "None"

        # 4. Strict SOC Analyst System Prompt with grounding constraints
        system_prompt = (
            "You are SentriAI's Senior Security Operations Centre (SOC) Analyst AI. "
            "Your objective is to conduct a rigorous, grounded security investigation of a submitted communication or artifact.\n\n"
            "MANDATORY INVESTIGATION GUIDELINES:\n"
            "1. Use the supplied verified security knowledge (RAG context) and technical tool observations to ground your investigation.\n"
            "2. Do NOT invent facts, URLs, or indicators not supported by the submission, tool evidence, or supplied security knowledge.\n"
            "3. Clearly distinguish observed evidence from analytical interpretation.\n"
            "4. If evidence is insufficient to make a definitive attribution or conclusion, state this clearly.\n"
            "5. Do NOT claim that containment, blocking, or remediation actions were actually performed; all recommended actions are advisory suggestions that require human SOC analyst approval.\n"
            "6. You MUST respond with ONLY a single, valid JSON object matching the requested schema. Do NOT include markdown code fences or conversational text."
        )

        # 5. Formulate Context
        context = (
            f"=== VERIFIED INSTITUTIONAL SECURITY KNOWLEDGE (RAG) ===\n"
            f"{formatted_rag}\n\n"
            f"=== TECHNICAL TOOL EVIDENCE ===\n"
            f"{tools_evidence_text}\n\n"
            f"=== PRE-COMPUTED RISK ASSESSMENT (DETERMINISTIC RUBRIC) ===\n"
            f"Risk Score: {score}/100 | Severity: {severity} | Confidence: {confidence}\n"
            f"Observed Indicators: {breakdown_text}"
        )

        prompt_content = (
            f"Perform an explainable SOC security investigation for the following {user_mode} submission:\n\n"
            f"\"\"\"\n{submission_text}\n\"\"\"\n\n"
            f"Pre-computed Risk Level: {score}/100 ({severity})\n\n"
            "Respond with ONLY a JSON object containing EXACTLY these keys:\n"
            "{\n"
            '  "threat_classification": "CRITICAL_ATTACK" | "LIKELY_PHISHING" | "POTENTIALLY_SUSPICIOUS" | "LIKELY_BENIGN",\n'
            '  "key_indicators": ["observed indicator 1", "observed indicator 2"],\n'
            '  "evidence_summary": "Concise factual summary of observed technical indicators and message traits",\n'
            '  "potential_impact": "Realistic potential impact on the user and institution based on the evidence",\n'
            '  "agent_investigation_summary": "Synthesis of tool evidence, RAG knowledge alignment, and technical reasoning",\n'
            '  "final_conclusion": "Clear verdict and guidance for the user and SOC analyst (noting actions require human approval)"\n'
            "}"
        )

        # 6. Execute through existing provider chain (Azure Foundry -> Gemini -> OpenAI -> Local)
        try:
            raw_response = await self.generate_chat_response(
                messages=[{"role": "user", "content": prompt_content}],
                context=context,
                system_prompt=system_prompt
            )

            # If provider chain fell back to local heuristic, use deterministic template
            if self.last_provider_used == "local_heuristic" or not raw_response:
                self.last_provider_used = "local_heuristic"
                self.last_model_used = "rule-engine-v1"
                return fallback

            # 7. Safe JSON Parsing
            parsed = None
            cleaned = raw_response.strip()
            # Strip markdown code blocks if model wrapped JSON
            if "```" in cleaned:
                blocks = cleaned.split("```")
                for blk in blocks:
                    blk = blk.strip()
                    if blk.startswith("json"):
                        blk = blk[4:].strip()
                    if blk.startswith("{") and blk.endswith("}"):
                        try:
                            parsed = json.loads(blk)
                            break
                        except Exception:
                            pass

            if not parsed:
                try:
                    parsed = json.loads(cleaned)
                except Exception:
                    first_brace = cleaned.find("{")
                    last_brace = cleaned.rfind("}")
                    if first_brace != -1 and last_brace != -1 and last_brace > first_brace:
                        try:
                            parsed = json.loads(cleaned[first_brace:last_brace + 1])
                        except Exception:
                            parsed = None

            if not isinstance(parsed, dict):
                logger.warning("LLM investigation synthesis returned non-JSON structure. Falling back to deterministic template.")
                self.last_provider_used = "local_heuristic"
                self.last_model_used = "rule-engine-v1"
                return fallback

            # 8. Construct final response strictly preserving deterministic risk metrics
            key_inds = parsed.get("key_indicators")
            if not isinstance(key_inds, list) or not key_inds:
                key_inds = fallback["key_indicators"]
            else:
                key_inds = [str(k) for k in key_inds if str(k).strip()] or fallback["key_indicators"]

            return {
                "threat_classification": str(parsed.get("threat_classification") or fallback["threat_classification"]),
                "risk_score": score,                     # Strictly from RiskScorer
                "severity": severity,                     # Strictly from RiskScorer
                "confidence": confidence,                 # Strictly from RiskScorer
                "key_indicators": key_inds,
                "evidence_summary": str(parsed.get("evidence_summary") or fallback["evidence_summary"]),
                "potential_impact": str(parsed.get("potential_impact") or fallback["potential_impact"]),
                "agent_investigation_summary": str(parsed.get("agent_investigation_summary") or fallback["agent_investigation_summary"]),
                "final_conclusion": str(parsed.get("final_conclusion") or fallback["final_conclusion"])
            }
        except Exception as e:
            logger.warning("generate_structured_investigation exception: %s. Using deterministic fallback.", str(e))
            self.last_provider_used = "local_heuristic"
            self.last_model_used = "rule-engine-v1"
            return fallback

llm_service = LLMProviderService()
