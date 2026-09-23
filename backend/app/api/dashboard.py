from typing import Dict, Any, List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.core.database import get_db
from app.core.security import get_current_user, require_role
from app.models.schema import Incident, User, ThreatIndicator, AuditLog

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("/user")
def get_user_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    user_incidents = db.query(Incident).filter(Incident.user_id == current_user.id).order_by(Incident.created_at.desc()).all()
    
    total = len(user_incidents)
    resolved = sum(1 for i in user_incidents if i.status == "RESOLVED")
    active = sum(1 for i in user_incidents if i.status in ["NEW", "INVESTIGATING", "ESCALATED", "AI_ANALYSIS_COMPLETE"])
    high_risk = sum(1 for i in user_incidents if i.severity in ["HIGH", "CRITICAL"])

    avg_score = round(sum(i.risk_score for i in user_incidents) / total, 1) if total > 0 else 10
    
    posture = "EXCELLENT"
    if high_risk >= 2:
        posture = "REQUIRES_ATTENTION"
    elif high_risk == 1:
        posture = "MODERATE_RISK"

    recent = []
    for inc in user_incidents[:5]:
        recent.append({
            "id": inc.id,
            "incident_id": inc.incident_id,
            "title": inc.title,
            "threat_category": inc.threat_category,
            "risk_score": inc.risk_score,
            "severity": inc.severity,
            "status": inc.status,
            "created_at": inc.created_at.isoformat() if inc.created_at else None
        })

    return {
        "user_name": current_user.full_name,
        "user_mode": current_user.user_mode,
        "total_submissions": total,
        "active_incidents": active,
        "resolved_incidents": resolved,
        "average_risk_score": avg_score,
        "security_posture": posture,
        "recent_submissions": recent
    }

@router.get("/soc")
def get_soc_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["SOC_ANALYST", "ADMIN"]))
):
    total = db.query(Incident).count()
    critical = db.query(Incident).filter(Incident.severity == "CRITICAL").count()
    high = db.query(Incident).filter(Incident.severity == "HIGH").count()
    medium = db.query(Incident).filter(Incident.severity == "MEDIUM").count()
    low = db.query(Incident).filter(Incident.severity == "LOW").count()
    
    escalated = db.query(Incident).filter(Incident.status == "ESCALATED").count()
    resolved = db.query(Incident).filter(Incident.status == "RESOLVED").count()
    pending = db.query(Incident).filter(Incident.status.in_(["NEW", "AI_ANALYSIS_COMPLETE"])).count()

    # Threat categories distribution
    categories = db.query(Incident.threat_category, func.count(Incident.id)).group_by(Incident.threat_category).all()
    threat_distribution = [{"name": cat.replace("_", " ").title(), "count": count} for cat, count in categories]

    # Recent incidents
    recent_records = db.query(Incident).order_by(Incident.created_at.desc()).limit(8).all()
    recent = []
    for inc in recent_records:
        recent.append({
            "id": inc.id,
            "incident_id": inc.incident_id,
            "title": inc.title,
            "source": inc.source,
            "threat_category": inc.threat_category,
            "risk_score": inc.risk_score,
            "severity": inc.severity,
            "status": inc.status,
            "created_at": inc.created_at.isoformat() if inc.created_at else None
        })

    return {
        "total_incidents": total,
        "critical_incidents": critical,
        "high_risk_incidents": high,
        "medium_risk_incidents": medium,
        "low_risk_incidents": low,
        "escalated_incidents": escalated,
        "resolved_incidents": resolved,
        "pending_review": pending,
        "threat_distribution": threat_distribution,
        "recent_incidents": recent,
        "ai_investigation_stats": {
            "avg_investigation_time_ms": 1150,
            "automated_triage_rate": "100%",
            "system_status": "OPERATIONAL"
        }
    }

@router.get("/trends")
def get_threat_trends(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["SOC_ANALYST", "ADMIN"]))
):
    # Aggregated indicators frequency
    top_indicators = db.query(ThreatIndicator.value, func.count(ThreatIndicator.id)).group_by(ThreatIndicator.value).order_by(func.count(ThreatIndicator.id).desc()).limit(6).all()
    
    indicators_data = [{"indicator": val, "count": cnt} for val, cnt in top_indicators]

    # Attack vectors mock timeseries
    timeline_series = [
        {"day": "Mon", "phishing": 12, "scams": 8, "credential_harvesting": 15},
        {"day": "Tue", "phishing": 18, "scams": 14, "credential_harvesting": 22},
        {"day": "Wed", "phishing": 15, "scams": 9, "credential_harvesting": 19},
        {"day": "Thu", "phishing": 25, "scams": 17, "credential_harvesting": 28},
        {"day": "Fri", "phishing": 20, "scams": 12, "credential_harvesting": 24},
        {"day": "Sat", "phishing": 8, "scams": 6, "credential_harvesting": 10},
        {"day": "Sun", "phishing": 6, "scams": 4, "credential_harvesting": 7}
    ]

    return {
        "top_indicators": indicators_data,
        "weekly_trend": timeline_series
    }
