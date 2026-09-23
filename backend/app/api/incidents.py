import uuid
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_current_user, require_role
from app.models.schema import (
    Incident, IncidentEvent, ThreatIndicator, RiskAssessment,
    AIInvestigation, AgentToolCall, Recommendation, AnalystAction,
    IncidentNote, AuditLog, User
)

router = APIRouter(prefix="/incidents", tags=["Incident Management"])

class CreateIncidentRequest(BaseModel):
    title: str
    description: Optional[str] = ""
    source: Optional[str] = "USER_SUBMISSION"
    threat_type: Optional[str] = "SUSPICIOUS_ACTIVITY"
    threat_category: Optional[str] = None
    risk_score: Optional[int] = 50
    severity: Optional[str] = "MEDIUM"
    status: Optional[str] = "NEW"
    submitted_content: Optional[str] = ""

class StatusUpdateRequest(BaseModel):
    status: str  # INVESTIGATING, ESCALATED, RESOLVED, FALSE_POSITIVE
    notes: Optional[str] = None

class AddNoteRequest(BaseModel):
    note: str

class AnalystActionRequest(BaseModel):
    action_type: str  # SIMULATE_BLOCK, REVOKE_SESSION, PASSWORD_RESET, ESCALATE, RESOLVE
    notes: Optional[str] = None

@router.post("")
def create_incident(
    req: CreateIncidentRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    inc_code = f"INC-{uuid.uuid4().hex[:6].upper()}"
    new_inc = Incident(
        id=str(uuid.uuid4()),
        incident_id=inc_code,
        user_id=current_user.id,
        incident_type="SECURITY_ALERT",
        title=req.title,
        description=req.description or req.title,
        source=req.source or "USER_SUBMISSION",
        submitted_content=req.submitted_content or req.description or req.title,
        risk_score=req.risk_score or 50,
        severity=req.severity or "MEDIUM",
        confidence=85,
        threat_category=req.threat_category or req.threat_type or "SUSPICIOUS_ACTIVITY",
        status=req.status or "NEW",
        escalation_status="NONE"
    )
    db.add(new_inc)
    
    event = IncidentEvent(
        incident_id=new_inc.id,
        event_type="INCIDENT_CREATED",
        description=f"Security incident {inc_code} reported by user.",
        actor="USER"
    )
    db.add(event)
    db.commit()
    db.refresh(new_inc)
    return {
        "id": new_inc.id,
        "incident_id": new_inc.incident_id,
        "title": new_inc.title,
        "threat_category": new_inc.threat_category,
        "risk_score": new_inc.risk_score,
        "severity": new_inc.severity,
        "status": new_inc.status,
        "created_at": new_inc.created_at.isoformat() if new_inc.created_at else None
    }


@router.get("")
def list_incidents(
    status: Optional[str] = None,
    severity: Optional[str] = None,
    threat_category: Optional[str] = None,
    search: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(15, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Incident)
    if current_user.role == "USER":
        query = query.filter(Incident.user_id == current_user.id)

    
    if status and status != "ALL":
        query = query.filter(Incident.status == status)
    if severity and severity != "ALL":
        query = query.filter(Incident.severity == severity)
    if threat_category and threat_category != "ALL":
        query = query.filter(Incident.threat_category == threat_category)
    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            (Incident.title.ilike(search_pattern)) |
            (Incident.incident_id.ilike(search_pattern)) |
            (Incident.submitted_content.ilike(search_pattern))
        )

    total = query.count()
    incidents = query.order_by(Incident.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()

    items = []
    for inc in incidents:
        items.append({
            "id": inc.id,
            "incident_id": inc.incident_id,
            "title": inc.title,
            "source": inc.source,
            "incident_type": inc.incident_type,
            "risk_score": inc.risk_score,
            "severity": inc.severity,
            "confidence": inc.confidence,
            "threat_category": inc.threat_category,
            "status": inc.status,
            "escalation_status": inc.escalation_status,
            "created_at": inc.created_at.isoformat() if inc.created_at else None
        })

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "items": items
    }

@router.get("/my")
def list_my_incidents(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    incidents = db.query(Incident).filter(Incident.user_id == current_user.id).order_by(Incident.created_at.desc()).all()
    results = []
    for inc in incidents:
        results.append({
            "id": inc.id,
            "incident_id": inc.incident_id,
            "title": inc.title,
            "incident_type": inc.incident_type,
            "risk_score": inc.risk_score,
            "severity": inc.severity,
            "status": inc.status,
            "threat_category": inc.threat_category,
            "created_at": inc.created_at.isoformat() if inc.created_at else None
        })
    return results

@router.get("/{id}")
def get_incident_detail(
    id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    inc = db.query(Incident).filter((Incident.id == id) | (Incident.incident_id == id)).first()
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")

    # Regular users can only access their own incidents
    if current_user.role == "USER" and inc.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to access this incident")

    # Get tool calls from investigation
    tool_calls = []
    if inc.ai_investigation:
        tcs = db.query(AgentToolCall).filter(AgentToolCall.investigation_id == inc.ai_investigation.id).order_by(AgentToolCall.execution_order).all()
        for tc in tcs:
            tool_calls.append({
                "id": tc.id,
                "tool_name": tc.tool_name,
                "execution_order": tc.execution_order,
                "input_arguments": tc.input_arguments,
                "output_result": tc.output_result,
                "status": tc.status
            })

    # Indicators
    indicators = [{
        "id": ind.id,
        "indicator_type": ind.indicator_type,
        "value": ind.value,
        "weight": ind.weight,
        "description": ind.description,
        "severity": ind.severity
    } for ind in inc.indicators]

    # Recommendations ("What Should I Do Now?")
    recs = [{
        "id": r.id,
        "step_order": r.step_order,
        "title": r.title,
        "action_type": r.action_type,
        "description": r.description,
        "rationale": r.rationale
    } for r in inc.recommendations]

    # Timeline Events
    timeline = [{
        "id": ev.id,
        "event_type": ev.event_type,
        "description": ev.description,
        "actor": ev.actor,
        "timestamp": ev.timestamp.isoformat() if ev.timestamp else None,
        "metadata": ev.event_metadata
    } for ev in inc.events]

    # Analyst Notes
    notes = [{
        "id": n.id,
        "author_name": n.author_name,
        "note_text": n.note_text,
        "created_at": n.created_at.isoformat() if n.created_at else None
    } for n in inc.notes]

    return {
        "id": inc.id,
        "incident_id": inc.incident_id,
        "user_id": inc.user_id,
        "incident_type": inc.incident_type,
        "title": inc.title,
        "description": inc.description,
        "source": inc.source,
        "submitted_content": inc.submitted_content,
        "risk_score": inc.risk_score,
        "severity": inc.severity,
        "confidence": inc.confidence,
        "threat_category": inc.threat_category,
        "status": inc.status,
        "escalation_status": inc.escalation_status,
        "ai_summary": inc.ai_summary,
        "ai_recommendation": inc.ai_recommendation,
        "created_at": inc.created_at.isoformat() if inc.created_at else None,
        "updated_at": inc.updated_at.isoformat() if inc.updated_at else None,
        "risk_breakdown": inc.risk_assessment.score_breakdown if inc.risk_assessment else [],
        "indicators": indicators,
        "recommendations": recs,
        "timeline": timeline,
        "tool_calls": tool_calls,
        "analyst_notes": notes,
        "ai_investigation": {
            "model_used": inc.ai_investigation.model_used if inc.ai_investigation else "gemini-1.5-flash",
            "provider": inc.ai_investigation.provider if inc.ai_investigation else "SentriAI Companion Engine",
            "execution_time_ms": inc.ai_investigation.execution_time_ms if inc.ai_investigation else 1200,
            "conclusion": inc.ai_investigation.conclusion if inc.ai_investigation else inc.ai_recommendation,
            "rag_sources": (inc.ai_investigation.findings or {}).get("rag_sources", [])
        } if inc.ai_investigation else None
    }

@router.patch("/{id}/status")
def update_incident_status(
    id: str,
    req: StatusUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["SOC_ANALYST", "ADMIN"]))
):
    inc = db.query(Incident).filter(Incident.id == id).first()
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")

    old_status = inc.status
    inc.status = req.status
    inc.assigned_analyst_id = current_user.id

    # Record Timeline Event
    ev = IncidentEvent(
        incident_id=inc.id,
        event_type=f"STATUS_CHANGED_TO_{req.status}",
        description=f"Status changed from {old_status} to {req.status} by Analyst {current_user.full_name}. {req.notes or ''}",
        actor="SOC_ANALYST"
    )
    db.add(ev)

    # Add Note if provided
    if req.notes:
        note = IncidentNote(
            incident_id=inc.id,
            author_id=current_user.id,
            author_name=current_user.full_name,
            note_text=f"Status transition note: {req.notes}"
        )
        db.add(note)

    # Audit log
    audit = AuditLog(
        user_id=current_user.id,
        action="UPDATE_INCIDENT_STATUS",
        resource_type="INCIDENT",
        resource_id=inc.id,
        details={"from": old_status, "to": req.status}
    )
    db.add(audit)

    db.commit()
    return {"message": "Status updated successfully", "new_status": inc.status}

@router.post("/{id}/notes")
def add_incident_note(
    id: str,
    req: AddNoteRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["SOC_ANALYST", "ADMIN"]))
):
    inc = db.query(Incident).filter(Incident.id == id).first()
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")

    note = IncidentNote(
        incident_id=inc.id,
        author_id=current_user.id,
        author_name=current_user.full_name,
        note_text=req.note
    )
    db.add(note)

    # Add timeline event
    ev = IncidentEvent(
        incident_id=inc.id,
        event_type="ANALYST_NOTE_ADDED",
        description=f"Analyst {current_user.full_name} added an internal investigation note.",
        actor="SOC_ANALYST"
    )
    db.add(ev)
    db.commit()

    return {"message": "Note added successfully"}

@router.post("/{id}/action")
def execute_analyst_action(
    id: str,
    req: AnalystActionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["SOC_ANALYST", "ADMIN"]))
):
    inc = db.query(Incident).filter(Incident.id == id).first()
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")

    action_map = {
        "SIMULATE_BLOCK": "Simulated defensive domain/IP firewall block rules applied across gateway.",
        "REVOKE_SESSION": "Simulated active session token invalidation triggered via SSO/IdP.",
        "PASSWORD_RESET": "Simulated forced self-service password reset initiated for compromised identity.",
        "ESCALATE": "Incident escalated to Tier-2 incident response team.",
        "RESOLVE": "Incident marked as verified and contained."
    }
    desc = action_map.get(req.action_type, f"Action {req.action_type} executed.")

    action = AnalystAction(
        incident_id=inc.id,
        analyst_id=current_user.id,
        action_type=req.action_type,
        notes=req.notes or desc
    )
    db.add(action)

    ev = IncidentEvent(
        incident_id=inc.id,
        event_type=f"ACTION_{req.action_type}",
        description=desc,
        actor="SOC_ANALYST"
    )
    db.add(ev)

    if req.action_type == "RESOLVE":
        inc.status = "RESOLVED"

    db.commit()
    return {"message": desc, "action": req.action_type}

@router.get("/{id}/timeline")
def get_incident_timeline(
    id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    inc = db.query(Incident).filter(Incident.id == id).first()
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")
    if current_user.role == "USER" and inc.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Forbidden")
    
    events = db.query(IncidentEvent).filter(IncidentEvent.incident_id == id).order_by(IncidentEvent.timestamp.asc()).all()
    return [{
        "id": ev.id,
        "event_type": ev.event_type,
        "description": ev.description,
        "actor": ev.actor,
        "timestamp": ev.timestamp.isoformat() if ev.timestamp else None
    } for ev in events]

@router.post("/{id}/resolve")
@router.patch("/{id}/resolve")
def resolve_incident(
    id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["SOC_ANALYST", "ADMIN"]))
):
    return update_incident_status(id, StatusUpdateRequest(status="RESOLVED", notes="Marked resolved by analyst"), db, current_user)

@router.post("/{id}/escalate")
@router.patch("/{id}/escalate")
def escalate_incident(
    id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["SOC_ANALYST", "ADMIN"]))
):
    return update_incident_status(id, StatusUpdateRequest(status="ESCALATED", notes="Escalated for immediate review"), db, current_user)
