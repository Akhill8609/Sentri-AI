import re
import urllib.parse
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.models.schema import Incident, KnowledgeDocument, KnowledgeChunk
from app.services.rag.retriever import rag_retriever
from app.services.risk_scorer import risk_scorer

class SecurityAgentTools:
    """
    12 Purpose-Built Security Tools callable by the AI SOC Agent.
    Every tool returns structured data and execution status.
    """

    @staticmethod
    def extract_urls(text: str) -> Dict[str, Any]:
        """Tool 1: Extracts URLs, domains, and IP addresses from content."""
        url_regex = r'https?://(?:[-\w.]|(?:%[\da-fA-F]{2}))+[/\w\-.~:?#[\]@!$&\'()*+,;=]*'
        raw_urls = re.findall(url_regex, text)
        
        # Also look for domain-like strings missing protocol e.g. login-verify-service.tk
        domain_regex = r'(?:[a-zA-Z0-9-]+\.)+(?:com|net|org|xyz|top|online|site|tk|info|cc|live|ru|cn)\b'
        raw_domains = re.findall(domain_regex, text)

        all_urls = list(set(raw_urls))
        extracted = []
        for u in all_urls:
            parsed = urllib.parse.urlparse(u)
            extracted.append({
                "url": u,
                "scheme": parsed.scheme,
                "netloc": parsed.netloc,
                "path": parsed.path
            })

        return {
            "found": len(extracted) > 0,
            "count": len(extracted),
            "urls": extracted,
            "extracted_domains": list(set(raw_domains))
        }

    @staticmethod
    def analyze_url(url: str) -> Dict[str, Any]:
        """Tool 2: Deep inspection of URL characteristics, typosquatting, and risky TLDs."""
        parsed = urllib.parse.urlparse(url if "://" in url else f"http://{url}")
        domain = parsed.netloc.lower()
        path = parsed.path.lower()

        suspicious_tlds = [".xyz", ".top", ".tk", ".ml", ".ga", ".cf", ".gq", ".work", ".click", ".buzz", ".cc", ".icu"]
        suspicious_keywords = ["login", "verify", "secure", "update", "account", "banking", "auth", "signin", "portal", "confirm", "free", "claim", "reward", "scholarship", "disabled"]

        indicators = []
        risk_score = 10  # baseline

        # Check suspicious TLD
        has_suspicious_tld = any(domain.endswith(tld) for tld in suspicious_tlds)
        if has_suspicious_tld:
            risk_score += 25
            indicators.append({
                "name": "High-Risk Top-Level Domain (TLD)",
                "points": 25,
                "description": f"Domain ends in a commonly abused TLD ({domain})"
            })

        # Check keyword stuffing in domain or path
        matched_kw = [kw for kw in suspicious_keywords if kw in domain or kw in path]
        if matched_kw:
            pts = min(30, len(matched_kw) * 15)
            risk_score += pts
            indicators.append({
                "name": "Credential Harvesting Path / Keyword",
                "points": pts,
                "description": f"URL contains sensitive targeting keywords: {', '.join(matched_kw)}"
            })

        # Check IP address as host
        if re.match(r'^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$', domain.split(':')[0]):
            risk_score += 35
            indicators.append({
                "name": "IP Address Hostname",
                "points": 35,
                "description": "Host uses a raw IP address instead of a legitimate registered domain name."
            })

        # Check excessive subdomains / deceptive brand prefix
        subdomain_parts = domain.split('.')
        if len(subdomain_parts) > 3:
            risk_score += 15
            indicators.append({
                "name": "Deceptive Subdomain Stacking",
                "points": 15,
                "description": f"Multi-level subdomain structure detected: {domain}"
            })

        return {
            "url": url,
            "domain": domain,
            "is_suspicious": len(indicators) > 0,
            "url_risk_contribution": min(60, risk_score),
            "indicators": indicators
        }

    @staticmethod
    def analyze_message(content: str, user_mode: str = "STUDENT") -> Dict[str, Any]:
        """Tool 3: Analyzes social engineering, urgency, financial lures, impersonation."""
        lower = content.lower()
        indicators = []

        # 1. Urgency cues
        urgency_terms = ["immediately", "within 24 hours", "disabled today", "account suspended", "action required", "urgent", "deadline", "final notice", "terminated"]
        found_urgency = [term for term in urgency_terms if term in lower]
        if found_urgency:
            indicators.append({
                "name": "Urgency & Psychological Coercion",
                "points": 20,
                "description": f"Uses pressure tactics to bypass critical thinking: '{', '.join(found_urgency)}'"
            })

        # 2. Financial incentives / scholarship lures
        financial_terms = ["scholarship", "₹50,000", "50,000", "cash prize", "bonus", "reward", "stipend", "refund", "claim now", "unclaimed funds", "$1,000"]
        found_financial = [term for term in financial_terms if term in lower]
        if found_financial:
            indicators.append({
                "name": "Financial / Reward Lure",
                "points": 20,
                "description": f"Promises unverified financial benefits or prizes: '{', '.join(found_financial)}'"
            })

        # 3. Credential Harvesting cues
        cred_terms = ["verify your password", "enter your password", "log in to claim", "confirm your credentials", "verify your identity", "submit otp", "account verification"]
        found_cred = [term for term in cred_terms if term in lower]
        if found_cred:
            indicators.append({
                "name": "Direct Credential Request",
                "points": 25,
                "description": f"Solicits passwords or account credentials: '{', '.join(found_cred)}'"
            })

        # 4. Impersonation (Student vs Employee context)
        impersonation_terms = ["university portal", "registrar", "dean", "hr department", "it support", "system administrator", "microsoft 365", "google admin", "payroll"]
        found_imp = [term for term in impersonation_terms if term in lower]
        if found_imp:
            indicators.append({
                "name": "Organizational Impersonation",
                "points": 15,
                "description": f"Impersonates authoritative entity: '{', '.join(found_imp)}'"
            })

        return {
            "text_length": len(content),
            "user_mode": user_mode,
            "detected_indicators": indicators,
            "threat_signals_found": len(indicators) > 0
        }

    @staticmethod
    def analyze_email(raw_or_fields: Dict[str, Any]) -> Dict[str, Any]:
        """Tool 4: Analyzes sender identity, spoofing indicators, domain alignment, headers."""
        sender = raw_or_fields.get("sender", "")
        subject = raw_or_fields.get("subject", "")
        body = raw_or_fields.get("body", "")
        
        indicators = []
        # Check freemail sender pretending to be corporate/university
        freemails = ["@gmail.com", "@yahoo.com", "@hotmail.com", "@outlook.com"]
        is_freemail = any(sender.lower().endswith(fm) for fm in freemails)
        
        corp_keywords = ["admin", "support", "hr", "payroll", "security", "university", "helpdesk"]
        has_corp_keyword = any(kw in sender.lower() or kw in subject.lower() for kw in corp_keywords)

        if is_freemail and has_corp_keyword:
            indicators.append({
                "name": "Sender Domain Mismatch (Spoofing Signal)",
                "points": 25,
                "description": f"Official administrative claims originating from generic public freemail domain: {sender}"
            })

        # Check subject line urgency or threats
        if any(w in subject.lower() for w in ["suspended", "urgent", "action required", "payroll update", "invoice"]):
            indicators.append({
                "name": "Alarmist Subject Line",
                "points": 15,
                "description": f"Subject designed to evoke fear or hasty reaction: '{subject}'"
            })

        return {
            "sender": sender,
            "subject": subject,
            "is_freemail": is_freemail,
            "email_indicators": indicators
        }

    @staticmethod
    def search_incident_history(db: Session, query: str, limit: int = 3) -> Dict[str, Any]:
        """Tool 5: Searches historical incident database for similar recurring campaigns."""
        like_query = f"%{query[:30]}%" if query else "%"
        matches = db.query(Incident).filter(
            (Incident.title.ilike(like_query)) | (Incident.submitted_content.ilike(like_query))
        ).order_by(Incident.created_at.desc()).limit(limit).all()

        results = []
        for inc in matches:
            results.append({
                "incident_id": inc.incident_id,
                "title": inc.title,
                "threat_category": inc.threat_category,
                "risk_score": inc.risk_score,
                "severity": inc.severity,
                "status": inc.status
            })

        return {
            "similar_incidents_found": len(results),
            "matches": results,
            "is_recurring_campaign": len(results) >= 2
        }

    @staticmethod
    def search_security_logs(db: Session, entity: str) -> Dict[str, Any]:
        """Tool 6: Simulated security telemetry / SIEM lookup for IPs, domains, or senders."""
        known_bad = ["malicious-portal.xyz", "verify-account-now.top", "login-microsoft-secure.net", "scholarship-claim-india.tk"]
        is_flagged = any(bad in entity.lower() for bad in known_bad)

        return {
            "query_entity": entity,
            "siem_reputation": "MALICIOUS" if is_flagged else "UNKNOWN_OR_SUSPICIOUS",
            "previous_blocks": 4 if is_flagged else 0,
            "threat_intel_verdict": "Flagged by threat intelligence feeds" if is_flagged else "No previous enterprise telemetry"
        }

    @staticmethod
    def calculate_risk(indicators: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Tool 7: Calls transparent 0-100 rubric calculator."""
        return risk_scorer.calculate_score(indicators)

    @staticmethod
    async def retrieve_security_knowledge(db: Session, topic: str, query: str) -> Dict[str, Any]:
        """Tool 8: Retrieves institutional knowledge via RAG vector search."""
        chunks = await rag_retriever.retrieve(db=db, query=f"{topic} {query}", top_k=3)
        return {
            "query": query,
            "topic": topic,
            "retrieved_count": len(chunks),
            "sources": chunks
        }

    @staticmethod
    async def retrieve_incident_response_playbook(db: Session, threat_type: str) -> Dict[str, Any]:
        """Tool 9: Fetches authoritative incident response playbook steps."""
        playbook_query = f"Playbook response procedure for {threat_type}"
        chunks = await rag_retriever.retrieve(db=db, query=playbook_query, top_k=2, category="PLAYBOOK")
        
        # Fallback structured steps if no specific playbook in DB
        default_playbook = [
            "Isolate compromised session or device immediately.",
            "Revoke active authentication tokens and reset credentials via official channels.",
            "Verify presence of unauthorized MFA devices or mailbox forwarding rules.",
            "Submit IOCs (indicators of compromise) to SOC queue."
        ]
        
        return {
            "threat_type": threat_type,
            "rag_chunks": chunks,
            "standard_procedures": default_playbook
        }

    @staticmethod
    def generate_action_plan(scenario: str, user_mode: str = "STUDENT", credentials_entered: bool = False) -> List[Dict[str, Any]]:
        """Tool 10: Generates prominent 'What Should I Do Now?' tailored action plan."""
        actions = []

        if credentials_entered:
            actions.append({
                "order": 1,
                "title": "Immediately Reset Your Password",
                "type": "IMMEDIATE",
                "description": "Navigate to the official portal directly (do NOT use links in the message) and change your password immediately.",
                "rationale": "Mitigates active account takeover before attackers utilize harvested credentials."
            })
            actions.append({
                "order": 2,
                "title": "Enable or Verify Multi-Factor Authentication (MFA)",
                "type": "IMMEDIATE",
                "description": "Ensure MFA is active and review your registered authenticator apps or phone numbers for unrecognized devices.",
                "rationale": "Prevents unauthorized login even if the attacker possesses your password."
            })
            actions.append({
                "order": 3,
                "title": "Sign Out of All Active Sessions",
                "type": "IMMEDIATE",
                "description": "Use the 'Log out everywhere' or 'Sign out all sessions' button in your account security settings.",
                "rationale": "Terminates any session tokens attackers might have already established."
            })
            actions.append({
                "order": 4,
                "title": "Notify SOC / IT Helpdesk",
                "type": "REPORTING",
                "description": "Inform your institution's SOC or IT support team so they can inspect sign-in logs for suspicious IP addresses.",
                "rationale": "Enables enterprise-level defense and monitoring."
            })
        elif "url" in scenario.lower() or "link" in scenario.lower():
            actions.append({
                "order": 1,
                "title": "Do Not Open or Click the Link",
                "type": "IMMEDIATE",
                "description": "Avoid clicking or copying the link. If opened, close the browser tab immediately.",
                "rationale": "Prevents automated drive-by downloads or credential phishing forms from loading."
            })
            actions.append({
                "order": 2,
                "title": "Do Not Enter Credentials or Personal Data",
                "type": "IMMEDIATE",
                "description": "Never input passwords, OTPs, student ID numbers, or banking details into unverified external forms.",
                "rationale": "Ensures zero sensitive data leakage."
            })
            if user_mode == "STUDENT":
                actions.append({
                    "order": 3,
                    "title": "Verify Through Official University Portal",
                    "type": "PREVENTIVE",
                    "description": "Check the university's official notices board or scholarship portal directly via your bookmarks.",
                    "rationale": "Confirms legitimacy without exposing yourself to malicious links."
                })
            else:
                actions.append({
                    "order": 3,
                    "title": "Confirm Directly with HR / IT Department",
                    "type": "PREVENTIVE",
                    "description": "Contact your HR or IT department via official internal chat (Slack/Teams) or verified directory phone.",
                    "rationale": "Validates legitimate communication requests independently."
                })
            actions.append({
                "order": 4,
                "title": "Report Incident to SentriAI",
                "type": "REPORTING",
                "description": "Submit this incident to the SOC queue to alert your peers and enable defensive firewall blocking.",
                "rationale": "Allows SOC analysts to analyze and block the threat campus-wide."
            })
        else:
            actions.append({
                "order": 1,
                "title": "Cease Communication with Sender",
                "type": "IMMEDIATE",
                "description": "Do not reply, dial numbers provided in the message, or engage with the sender.",
                "rationale": "Prevents further social engineering or validation of your active contact information."
            })
            actions.append({
                "order": 2,
                "title": "Mark as Phishing / Spam",
                "type": "PREVENTIVE",
                "description": "Use your email or messaging client's built-in 'Report Phishing' tool.",
                "rationale": "Improves organizational spam filter heuristics."
            })

        return actions

    @staticmethod
    def create_incident_report(findings: Dict[str, Any]) -> Dict[str, Any]:
        """Tool 11: Assembles structured AI investigation report."""
        return {
            "threat_classification": findings.get("threat_classification", "SUSPICIOUS_COMMUNICATION"),
            "risk_score": findings.get("risk_score", 50),
            "severity": findings.get("severity", "MEDIUM"),
            "confidence": findings.get("confidence", 0.90),
            "key_indicators": findings.get("key_indicators", []),
            "evidence_summary": findings.get("evidence_summary", ""),
            "potential_impact": findings.get("potential_impact", ""),
            "recommended_actions": findings.get("recommended_actions", []),
            "rag_sources": findings.get("rag_sources", []),
            "agent_investigation_summary": findings.get("agent_investigation_summary", ""),
            "final_conclusion": findings.get("final_conclusion", "")
        }

    @staticmethod
    def escalate_incident(db: Session, incident_id: str, reason: str) -> Dict[str, Any]:
        """Tool 12: Priority escalation to SOC Analyst queue."""
        inc = db.query(Incident).filter(Incident.id == incident_id).first()
        if inc:
            inc.status = "ESCALATED"
            inc.escalation_status = True
            db.commit()
            return {
                "escalated": True,
                "incident_id": inc.incident_id,
                "reason": reason,
                "message": "Incident flagged for immediate human SOC Analyst review."
            }
        return {"escalated": False, "reason": "Incident not found"}

agent_tools = SecurityAgentTools()
