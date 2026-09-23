from typing import Optional, List
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import require_role
from app.models.schema import AuditLog, User

router = APIRouter(prefix="/audit", tags=["Audit Logs"])

@router.get("/logs")
def get_audit_logs(
    limit: int = Query(50, ge=1, le=200),
    action: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["ADMIN", "SOC_ANALYST"]))
):
    query = db.query(AuditLog)
    if action:
        query = query.filter(AuditLog.action == action)
    
    logs = query.order_by(AuditLog.created_at.desc()).limit(limit).all()
    
    results = []
    for log in logs:
        results.append({
            "id": log.id,
            "user_id": log.user_id,
            "user_email": log.user.email if log.user else "System",
            "action": log.action,
            "resource_type": log.resource_type,
            "resource_id": log.resource_id,
            "details": log.details,
            "ip_address": log.ip_address,
            "created_at": log.created_at.isoformat() if log.created_at else None
        })
    return results
