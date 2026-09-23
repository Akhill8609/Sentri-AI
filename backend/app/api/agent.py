from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.schema import User, Incident
from app.services.agent.orchestrator import agent_orchestrator
from app.services.rag.retriever import rag_retriever
from app.services.llm.provider import llm_service

router = APIRouter(prefix="/agent", tags=["AI SOC Agent"])

class ChatMessage(BaseModel):
    role: str
    content: str

class AgentChatRequest(BaseModel):
    messages: Optional[List[ChatMessage]] = None
    message: Optional[str] = None
    incident_id: Optional[str] = None
    user_mode: Optional[str] = None
    mode: Optional[str] = None

class AgentChatResponse(BaseModel):
    reply: str
    rag_sources: List[Dict[str, Any]]
    suggested_actions: List[str]

class InvestigateRequest(BaseModel):
    content: str
    submission_type: Optional[str] = "MESSAGE"
    user_mode: Optional[str] = "STUDENT"
    credentials_entered: Optional[bool] = False

@router.post("/investigate")
async def run_investigation(
    req: InvestigateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not req.content.strip():
        raise HTTPException(status_code=400, detail="Submission content cannot be empty")

    return await agent_orchestrator.investigate_submission(
        db=db,
        content=req.content,
        submission_type=req.submission_type or "MESSAGE",
        user_mode=req.user_mode or current_user.user_mode,
        user_id=current_user.id,
        credentials_entered=req.credentials_entered or False
    )

@router.post("/chat", response_model=AgentChatResponse)
async def agent_chat(
    req: AgentChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    effective_messages = req.messages or []
    if not effective_messages and req.message:
        effective_messages = [ChatMessage(role="user", content=req.message)]

    if not effective_messages:
        raise HTTPException(status_code=400, detail="At least one message is required")

    effective_mode = (req.mode or req.user_mode or current_user.user_mode or "STUDENT").upper()
    last_user_query = effective_messages[-1].content
    
    # Context Assembly
    context_blocks = []
    
    # If discussing a specific incident, retrieve it
    if req.incident_id:
        inc = db.query(Incident).filter(Incident.id == req.incident_id).first()
        if inc:
            context_blocks.append(
                f"Incident Context: ID={inc.incident_id}, Title={inc.title}, "
                f"Threat={inc.threat_category}, RiskScore={inc.risk_score}/100, Severity={inc.severity}. "
                f"Submitted content: {inc.submitted_content}"
            )

    # Retrieve RAG Knowledge
    rag_results = await rag_retriever.retrieve(
        db=db,
        query=f"{effective_mode} {last_user_query}",
        top_k=3
    )
    for chunk in rag_results:
        context_blocks.append(f"Knowledge [{chunk['document_title']}]: {chunk['chunk_text']}")

    combined_context = "\n\n".join(context_blocks)
    
    system_prompt = (
        f"You are SentriAI, an intelligent, empathetic, and digital security companion "
        f"assisting a {effective_mode.lower()}. "
        f"Provide clear, non-intimidating, step-by-step guidance. "
        f"Grounded in verified digital safety and security knowledge."
    )

    formatted_msgs = [{"role": m.role, "content": m.content} for m in effective_messages]
    reply_text = await llm_service.generate_chat_response(
        messages=formatted_msgs,
        context=combined_context,
        system_prompt=system_prompt
    )

    suggested = [
        "Is this email suspicious?",
        "What should I do if I clicked the link?",
        "How do I verify if a scholarship is authentic?",
        "What is multi-factor authentication (MFA)?"
    ]

    return AgentChatResponse(
        reply=reply_text,
        rag_sources=rag_results,
        suggested_actions=suggested
    )
