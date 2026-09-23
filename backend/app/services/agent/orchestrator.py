import time
import uuid
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from app.models.schema import (
    Incident, IncidentEvent, AIInvestigation, AgentToolCall,
    ThreatIndicator, RiskAssessment, Recommendation, AuditLog
)
from app.services.agent.tools import agent_tools
from app.services.rag.retriever import rag_retriever
from app.services.llm.provider import llm_service

class AgentOrchestrator:
    """
    Multi-step Autonomous AI SOC Analyst Orchestrator.
    Decides and invokes appropriate tools dynamically based on submission context.
    """

    async def investigate_submission(
        self,
        db: Session,
        content: str,
        submission_type: str = "MESSAGE",
        user_mode: str = "STUDENT",
        user_id: Optional[str] = None,
        credentials_entered: bool = False,
        source_details: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        start_time = time.time()
        tool_call_traces = []
        observed_indicators = []
        rag_sources = []
        execution_order = 1

        # ----------------------------------------------------
        # Step 1: Content Analysis Tool
        # ----------------------------------------------------
        if submission_type == "EMAIL" and source_details:
            email_analysis = agent_tools.analyze_email(source_details)
            tool_call_traces.append({
                "tool_name": "analyze_email",
                "input_args": {"sender": source_details.get("sender"), "subject": source_details.get("subject")},
                "output": email_analysis,
                "order": execution_order
            })
            execution_order += 1
            for ind in email_analysis.get("email_indicators", []):
                observed_indicators.append(ind)

        message_analysis = agent_tools.analyze_message(content, user_mode)
        tool_call_traces.append({
            "tool_name": "analyze_message",
            "input_args": {"content_length": len(content), "user_mode": user_mode},
            "output": message_analysis,
            "order": execution_order
        })
        execution_order += 1
        for ind in message_analysis.get("detected_indicators", []):
            observed_indicators.append(ind)

        # ----------------------------------------------------
        # Step 2: Extract URLs Tool
        # ----------------------------------------------------
        url_data = agent_tools.extract_urls(content)
        tool_call_traces.append({
            "tool_name": "extract_urls",
            "input_args": {"text_sample": content[:60]},
            "output": url_data,
            "order": execution_order
        })
        execution_order += 1

        # ----------------------------------------------------
        # Step 3: Analyze URLs Tool (if present)
        # ----------------------------------------------------
        analyzed_urls = []
        if url_data.get("found"):
            for u in url_data.get("urls", [])[:3]:
                url_inspection = agent_tools.analyze_url(u["url"])
                analyzed_urls.append(url_inspection)
                for ind in url_inspection.get("indicators", []):
                    observed_indicators.append(ind)
            
            tool_call_traces.append({
                "tool_name": "analyze_url",
                "input_args": {"urls": [u["url"] for u in url_data.get("urls", [])[:3]]},
                "output": {"inspections": analyzed_urls},
                "order": execution_order
            })
            execution_order += 1

        # ----------------------------------------------------
        # Step 4: Search Incident History Tool
        # ----------------------------------------------------
        first_query = url_data["urls"][0]["netloc"] if url_data.get("found") else content[:30]
        history_result = agent_tools.search_incident_history(db, query=first_query, limit=3)
        tool_call_traces.append({
            "tool_name": "search_incident_history",
            "input_args": {"query": first_query},
            "output": history_result,
            "order": execution_order
        })
        execution_order += 1
        if history_result.get("is_recurring_campaign"):
            observed_indicators.append({
                "name": "Recurring Threat Campaign",
                "points": 15,
                "description": "Matching incident patterns observed previously in organizational history."
            })

        # ----------------------------------------------------
        # Step 5: Search Security Logs Tool
        # ----------------------------------------------------
        target_entity = url_data["urls"][0]["netloc"] if url_data.get("found") else "inbound_message"
        logs_result = agent_tools.search_security_logs(db, entity=target_entity)
        tool_call_traces.append({
            "tool_name": "search_security_logs",
            "input_args": {"entity": target_entity},
            "output": logs_result,
            "order": execution_order
        })
        execution_order += 1

        # ----------------------------------------------------
        # Step 6: RAG Semantic Knowledge Retrieval Tool
        # ----------------------------------------------------
        rag_query = f"{user_mode.lower()} {' '.join([i['name'] for i in observed_indicators[:3]])} {content[:80]}"
        rag_knowledge = await agent_tools.retrieve_security_knowledge(db, topic="Security Advisory", query=rag_query)
        rag_sources = rag_knowledge.get("sources", [])
        tool_call_traces.append({
            "tool_name": "retrieve_security_knowledge",
            "input_args": {"topic": "Security Advisory", "query": rag_query[:60]},
            "output": {"retrieved_count": len(rag_sources), "sources": [s["document_title"] for s in rag_sources]},
            "order": execution_order
        })
        execution_order += 1

        # If credentials were entered or strong compromise signals, invoke Playbook Tool
        if credentials_entered or any("credential" in i.get("name", "").lower() for i in observed_indicators):
            playbook_res = await agent_tools.retrieve_incident_response_playbook(db, threat_type="Credential Phishing")
            tool_call_traces.append({
                "tool_name": "retrieve_incident_response_playbook",
                "input_args": {"threat_type": "Credential Phishing"},
                "output": playbook_res,
                "order": execution_order
            })
            execution_order += 1
            if playbook_res.get("rag_chunks"):
                rag_sources.extend(playbook_res["rag_chunks"])

        # Extra indicator if credentials were confirmed entered
        if credentials_entered:
            observed_indicators.append({
                "name": "Confirmed Credential Submission",
                "points": 35,
                "description": "User confirmed entering credentials into an unverified form."
            })

        # ----------------------------------------------------
        # Step 7: Calculate Risk Tool
        # ----------------------------------------------------
        risk_data = agent_tools.calculate_risk(observed_indicators)
        tool_call_traces.append({
            "tool_name": "calculate_risk",
            "input_args": {"indicator_count": len(observed_indicators)},
            "output": risk_data,
            "order": execution_order
        })
        execution_order += 1

        # ----------------------------------------------------
        # Step 8: GenAI Synthesis & Report Generation
        # ----------------------------------------------------
        investigation_report = await llm_service.generate_structured_investigation(
            submission_text=content,
            user_mode=user_mode,
            tools_evidence={"urls": analyzed_urls, "history": history_result},
            rag_context=rag_sources,
            risk_data=risk_data
        )

        # ----------------------------------------------------
        # Step 9: Action Plan Generation Tool ("What Should I Do Now?")
        # ----------------------------------------------------
        action_plan = agent_tools.generate_action_plan(
            scenario=content,
            user_mode=user_mode,
            credentials_entered=credentials_entered
        )
        tool_call_traces.append({
            "tool_name": "generate_action_plan",
            "input_args": {"user_mode": user_mode, "credentials_entered": credentials_entered},
            "output": {"action_count": len(action_plan)},
            "order": execution_order
        })
        execution_order += 1

        # ----------------------------------------------------
        # Step 10: Create Incident Report Tool
        # ----------------------------------------------------
        formal_report = agent_tools.create_incident_report({
            **investigation_report,
            "recommended_actions": action_plan,
            "rag_sources": rag_sources
        })
        tool_call_traces.append({
            "tool_name": "create_incident_report",
            "input_args": {"classification": formal_report["threat_classification"]},
            "output": {"status": "COMPILED"},
            "order": execution_order
        })
        execution_order += 1

        # ----------------------------------------------------
        # Step 11: Escalate if High/Critical
        # ----------------------------------------------------
        should_escalate = risk_data["score"] >= 75 or credentials_entered
        if should_escalate:
            tool_call_traces.append({
                "tool_name": "escalate_incident",
                "input_args": {"risk_score": risk_data["score"], "reason": "High risk threshold exceeded"},
                "output": {"escalated": True, "target": "SOC_ANALYST_QUEUE"},
                "order": execution_order
            })
            execution_order += 1

        elapsed_ms = int((time.time() - start_time) * 1000)

        # ----------------------------------------------------
        # Persistence: Write Incident, Investigation & Events to DB
        # ----------------------------------------------------
        incident_number = f"INC-{int(time.time()) % 1000000:06d}"
        title_summary = (
            f"Phishing Alert: {observed_indicators[0]['name']}"
            if observed_indicators else f"Security Inspection: {content[:35]}..."
        )

        # Threat Category
        if credentials_entered or any("credential" in i["name"].lower() for i in observed_indicators):
            threat_cat = "CREDENTIAL_HARVESTING"
        elif url_data.get("found"):
            threat_cat = "MALICIOUS_URL"
        elif any("scholarship" in i["name"].lower() or "reward" in i["name"].lower() for i in observed_indicators):
            threat_cat = "STUDENT_SCAM"
        elif any("impersonation" in i["name"].lower() for i in observed_indicators):
            threat_cat = "IMPERSONATION"
        else:
            threat_cat = "SUSPICIOUS_COMMUNICATION"

        incident = Incident(
            incident_id=incident_number,
            user_id=user_id or "system",
            incident_type=submission_type,
            title=title_summary,
            description=investigation_report["evidence_summary"],
            source=f"{user_mode.capitalize()} Portal",
            submitted_content=content,
            risk_score=risk_data["score"],
            severity=risk_data["severity"],
            confidence=risk_data["confidence"],
            threat_category=threat_cat,
            status="ESCALATED" if should_escalate else "AI_ANALYSIS_COMPLETE",
            ai_summary=investigation_report["agent_investigation_summary"],
            ai_recommendation=investigation_report["final_conclusion"],
            escalation_status=should_escalate
        )
        db.add(incident)
        db.flush()

        # Save AI Investigation with actual provider & model metadata
        provider_info = llm_service.get_actual_provider_info()
        ai_inv = AIInvestigation(
            incident_id=incident.id,
            model_used=provider_info.get("model", "gpt-5-mini"),
            provider=provider_info.get("provider", "azure_foundry"),
            execution_time_ms=elapsed_ms,
            agent_summary=investigation_report["agent_investigation_summary"],
            findings={
                "indicators": observed_indicators,
                "urls": analyzed_urls,
                "history": history_result,
                "rag_sources": rag_sources
            },
            conclusion=investigation_report["final_conclusion"]
        )
        db.add(ai_inv)
        db.flush()

        # Save Tool Calls
        for tc in tool_call_traces:
            agent_tc = AgentToolCall(
                investigation_id=ai_inv.id,
                tool_name=tc["tool_name"],
                input_arguments=tc["input_args"],
                output_result=tc["output"],
                execution_order=tc["order"],
                status="SUCCESS"
            )
            db.add(agent_tc)

        # Save Indicators
        for ind in observed_indicators:
            ti = ThreatIndicator(
                incident_id=incident.id,
                indicator_type=ind.get("name", "Indicator"),
                value=ind.get("name", "Threat Indicator"),
                weight=ind.get("points", 10),
                description=ind.get("description", ""),
                severity="HIGH" if ind.get("points", 10) >= 20 else "MEDIUM"
            )
            db.add(ti)

        # Save Risk Assessment
        ra = RiskAssessment(
            incident_id=incident.id,
            overall_score=risk_data["score"],
            severity=risk_data["severity"],
            confidence=risk_data["confidence"],
            score_breakdown=risk_data["breakdown"]
        )
        db.add(ra)

        # Save Recommendations
        for act in action_plan:
            rec = Recommendation(
                incident_id=incident.id,
                step_order=act["order"],
                title=act["title"],
                action_type=act["type"],
                description=act["description"],
                rationale=act["rationale"]
            )
            db.add(rec)

        # Save Incident Timeline Events
        events_to_create = [
            ("SUBMISSION_RECEIVED", f"Suspicious {submission_type.lower()} submitted for automated analysis.", "USER"),
            ("TOOLS_ORCHESTRATED", f"AI Agent executed {len(tool_call_traces)} specialized security tools.", "AI_AGENT"),
            ("KNOWLEDGE_RETRIEVED", f"Retrieved {len(rag_sources)} verified cybersecurity guidance references via RAG.", "AI_AGENT"),
            ("RISK_ASSESSED", f"Calculated risk score {risk_data['score']}/100 ({risk_data['severity']}).", "AI_AGENT"),
            ("INCIDENT_LOGGED", f"Registered incident {incident_number} in SOC management database.", "SYSTEM")
        ]
        if should_escalate:
            events_to_create.append(
                ("PRIORITY_ESCALATION", "Escalated to SOC Analyst queue due to high risk assessment.", "AI_AGENT")
            )

        for ev_type, desc, actor in events_to_create:
            ev = IncidentEvent(
                incident_id=incident.id,
                event_type=ev_type,
                description=desc,
                actor=actor
            )
            db.add(ev)

        # Audit Log
        audit = AuditLog(
            user_id=user_id,
            action="INVESTIGATE_SECURITY_EVENT",
            resource_type="INCIDENT",
            resource_id=incident.id,
            details={"risk_score": risk_data["score"], "tools_count": len(tool_call_traces)}
        )
        db.add(audit)

        db.commit()
        db.refresh(incident)

        return {
            "incident_id": incident.id,
            "incident_code": incident.incident_id,
            "threat_classification": formal_report["threat_classification"],
            "risk_score": risk_data["score"],
            "severity": risk_data["severity"],
            "confidence": risk_data["confidence"],
            "key_indicators": observed_indicators,
            "risk_breakdown": risk_data["breakdown"],
            "evidence_summary": formal_report["evidence_summary"],
            "potential_impact": formal_report["potential_impact"],
            "recommended_actions": action_plan,
            "rag_sources": rag_sources,
            "agent_summary": investigation_report["agent_investigation_summary"],
            "final_conclusion": formal_report["final_conclusion"],
            "tool_call_traces": tool_call_traces,
            "status": incident.status,
            "created_at": incident.created_at.isoformat()
        }

agent_orchestrator = AgentOrchestrator()
