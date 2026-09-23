from typing import Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.schema import User
from app.services.agent.orchestrator import agent_orchestrator

router = APIRouter(prefix="/analysis", tags=["Security Analysis"])

class EmailAnalysisRequest(BaseModel):
    sender: str
    subject: str
    body: str
    user_mode: Optional[str] = "STUDENT"

class MessageAnalysisRequest(BaseModel):
    content: str
    user_mode: Optional[str] = "STUDENT"

class UrlAnalysisRequest(BaseModel):
    url: str
    user_mode: Optional[str] = "STUDENT"

class CompromiseReportRequest(BaseModel):
    scenario: str
    credentials_entered: bool = False
    clicked_link: bool = True
    user_mode: Optional[str] = "STUDENT"

@router.post("/email")
async def analyze_email(
    req: EmailAnalysisRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not req.body.strip():
        raise HTTPException(status_code=400, detail="Email body content cannot be empty")
    
    full_text = f"Subject: {req.subject}\nFrom: {req.sender}\n\n{req.body}"
    result = await agent_orchestrator.investigate_submission(
        db=db,
        content=full_text,
        submission_type="EMAIL",
        user_mode=req.user_mode or current_user.user_mode,
        user_id=current_user.id,
        source_details={"sender": req.sender, "subject": req.subject, "body": req.body}
    )
    return result

@router.post("/message")
async def analyze_message(
    req: MessageAnalysisRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not req.content.strip():
        raise HTTPException(status_code=400, detail="Message content cannot be empty")

    result = await agent_orchestrator.investigate_submission(
        db=db,
        content=req.content,
        submission_type="MESSAGE",
        user_mode=req.user_mode or current_user.user_mode,
        user_id=current_user.id
    )
    return result

@router.post("/url")
async def analyze_url(
    req: UrlAnalysisRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not req.url.strip():
        raise HTTPException(status_code=400, detail="URL cannot be empty")

    result = await agent_orchestrator.investigate_submission(
        db=db,
        content=f"Suspicious URL submitted for deep verification: {req.url}",
        submission_type="URL",
        user_mode=req.user_mode or current_user.user_mode,
        user_id=current_user.id
    )
    return result

@router.post("/file")
async def analyze_file(
    file: UploadFile = File(...),
    notes: Optional[str] = Form(""),
    user_mode: Optional[str] = Form("STUDENT"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    filename = file.filename or "unknown_file"
    file_ext = filename.split(".")[-1].lower() if "." in filename else ""
    
    # Safe static file assessment (never execute!)
    risky_extensions = ["exe", "scr", "vbs", "bat", "cmd", "ps1", "jar", "msi", "hta", "docm", "xlsm"]
    is_dangerous_ext = file_ext in risky_extensions

    content_preview = f"AI-assisted suspicious file assessment:\nFilename: {filename}\nType: {file.content_type}\nExtension: .{file_ext}\n"
    if is_dangerous_ext:
        content_preview += f"High-risk executable/macro extension detected (. {file_ext}). Common vector for trojans and info-stealers.\n"
    if notes:
        content_preview += f"User context: {notes}\n"

    result = await agent_orchestrator.investigate_submission(
        db=db,
        content=content_preview,
        submission_type="FILE",
        user_mode=user_mode or current_user.user_mode,
        user_id=current_user.id
    )
    return result

@router.post("/compromise")
async def report_compromise(
    req: CompromiseReportRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await agent_orchestrator.investigate_submission(
        db=db,
        content=req.scenario,
        submission_type="ACCOUNT_COMPROMISE",
        user_mode=req.user_mode or current_user.user_mode,
        user_id=current_user.id,
        credentials_entered=req.credentials_entered
    )
    return result
