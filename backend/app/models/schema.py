import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column, String, Integer, Float, Text, Boolean, DateTime, ForeignKey, Enum as SQLEnum, JSON
)
from sqlalchemy.orm import relationship
from app.core.database import Base

def get_utc_now():
    return datetime.now(timezone.utc)

class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(String(50), default="USER", nullable=False)  # USER, SOC_ANALYST, ADMIN
    user_mode = Column(String(50), default="STUDENT", nullable=False)  # STUDENT, EMPLOYEE
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    created_at = Column(DateTime, default=get_utc_now)
    updated_at = Column(DateTime, default=get_utc_now, onupdate=get_utc_now)

    incidents = relationship("Incident", back_populates="user", foreign_keys="Incident.user_id")
    assigned_incidents = relationship("Incident", back_populates="assigned_analyst", foreign_keys="Incident.assigned_analyst_id")
    audit_logs = relationship("AuditLog", back_populates="user")

class EmailVerificationToken(Base):
    __tablename__ = "email_verification_tokens"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String(255), index=True, nullable=False)
    otp_hash = Column(String(255), nullable=False)
    expires_at = Column(DateTime, nullable=False)
    attempts = Column(Integer, default=0)
    is_used = Column(Boolean, default=False)
    created_at = Column(DateTime, default=get_utc_now)

class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String(255), index=True, nullable=False)
    otp_hash = Column(String(255), nullable=False)
    expires_at = Column(DateTime, nullable=False)
    attempts = Column(Integer, default=0)
    is_used = Column(Boolean, default=False)
    created_at = Column(DateTime, default=get_utc_now)

class Incident(Base):
    __tablename__ = "incidents"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    incident_id = Column(String(50), unique=True, index=True, nullable=False)  # e.g., INC-2026-1001
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    incident_type = Column(String(50), default="MESSAGE", nullable=False)  # EMAIL, MESSAGE, URL, FILE, GENERAL
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    source = Column(String(100), default="User Portal")
    submitted_content = Column(Text, nullable=False)
    
    # Assessment
    risk_score = Column(Integer, default=0)  # 0 to 100
    severity = Column(String(50), default="LOW")  # LOW, MEDIUM, HIGH, CRITICAL
    confidence = Column(Float, default=0.85)
    threat_category = Column(String(100), default="SUSPICIOUS_ACTIVITY")
    
    # Workflow Status
    status = Column(String(50), default="NEW")  # NEW, INVESTIGATING, AI_ANALYSIS_COMPLETE, ESCALATED, RESOLVED, FALSE_POSITIVE
    assigned_analyst_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    
    # Reports
    ai_summary = Column(Text, nullable=True)
    ai_recommendation = Column(Text, nullable=True)
    analyst_notes = Column(Text, nullable=True)
    resolution = Column(Text, nullable=True)
    escalation_status = Column(Boolean, default=False)
    
    created_at = Column(DateTime, default=get_utc_now)
    updated_at = Column(DateTime, default=get_utc_now, onupdate=get_utc_now)

    user = relationship("User", back_populates="incidents", foreign_keys=[user_id])
    assigned_analyst = relationship("User", back_populates="assigned_incidents", foreign_keys=[assigned_analyst_id])
    events = relationship("IncidentEvent", back_populates="incident", cascade="all, delete-orphan", order_by="IncidentEvent.timestamp")
    indicators = relationship("ThreatIndicator", back_populates="incident", cascade="all, delete-orphan")
    risk_assessment = relationship("RiskAssessment", back_populates="incident", uselist=False, cascade="all, delete-orphan")
    ai_investigation = relationship("AIInvestigation", back_populates="incident", uselist=False, cascade="all, delete-orphan")
    recommendations = relationship("Recommendation", back_populates="incident", cascade="all, delete-orphan", order_by="Recommendation.step_order")
    actions = relationship("AnalystAction", back_populates="incident", cascade="all, delete-orphan")
    notes = relationship("IncidentNote", back_populates="incident", cascade="all, delete-orphan", order_by="IncidentNote.created_at")

class IncidentEvent(Base):
    __tablename__ = "incident_events"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    incident_id = Column(String(36), ForeignKey("incidents.id"), nullable=False)
    event_type = Column(String(100), nullable=False)
    description = Column(Text, nullable=False)
    actor = Column(String(50), default="AI_AGENT")  # AI_AGENT, SOC_ANALYST, USER, SYSTEM
    timestamp = Column(DateTime, default=get_utc_now)
    event_metadata = Column(JSON, nullable=True)

    incident = relationship("Incident", back_populates="events")

class SecuritySubmission(Base):
    __tablename__ = "security_submissions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    submission_type = Column(String(50), nullable=False)  # EMAIL, MESSAGE, URL, FILE
    raw_content = Column(Text, nullable=False)
    extracted_artifacts = Column(JSON, nullable=True)
    status = Column(String(50), default="PROCESSED")
    created_at = Column(DateTime, default=get_utc_now)

class ThreatIndicator(Base):
    __tablename__ = "threat_indicators"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    incident_id = Column(String(36), ForeignKey("incidents.id"), nullable=False)
    indicator_type = Column(String(50), nullable=False)  # URL, SENDER, KEYWORD, BEHAVIOR, IMPERSONATION, FINANCIAL
    value = Column(String(255), nullable=False)
    weight = Column(Integer, default=10)
    description = Column(Text, nullable=False)
    severity = Column(String(50), default="MEDIUM")

    incident = relationship("Incident", back_populates="indicators")

class RiskAssessment(Base):
    __tablename__ = "risk_assessments"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    incident_id = Column(String(36), ForeignKey("incidents.id"), nullable=False)
    overall_score = Column(Integer, nullable=False)  # 0 to 100
    severity = Column(String(50), nullable=False)
    confidence = Column(Float, default=0.90)
    score_breakdown = Column(JSON, nullable=False)  # list of {indicator, points, explanation}
    assessed_at = Column(DateTime, default=get_utc_now)

    incident = relationship("Incident", back_populates="risk_assessment")

class AIInvestigation(Base):
    __tablename__ = "ai_investigations"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    incident_id = Column(String(36), ForeignKey("incidents.id"), nullable=False)
    model_used = Column(String(100), default="gemini-1.5-flash")
    provider = Column(String(50), default="SentriAI Companion Engine")
    execution_time_ms = Column(Integer, default=1200)
    agent_summary = Column(Text, nullable=False)
    findings = Column(JSON, nullable=True)
    conclusion = Column(Text, nullable=False)
    created_at = Column(DateTime, default=get_utc_now)

    incident = relationship("Incident", back_populates="ai_investigation")
    tool_calls = relationship("AgentToolCall", back_populates="investigation", cascade="all, delete-orphan", order_by="AgentToolCall.execution_order")

class AgentToolCall(Base):
    __tablename__ = "agent_tool_calls"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    investigation_id = Column(String(36), ForeignKey("ai_investigations.id"), nullable=False)
    tool_name = Column(String(100), nullable=False)
    input_arguments = Column(JSON, nullable=True)
    output_result = Column(JSON, nullable=True)
    execution_order = Column(Integer, default=1)
    status = Column(String(50), default="SUCCESS")
    created_at = Column(DateTime, default=get_utc_now)

    investigation = relationship("AIInvestigation", back_populates="tool_calls")

class KnowledgeDocument(Base):
    __tablename__ = "knowledge_documents"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    title = Column(String(255), nullable=False)
    category = Column(String(100), nullable=False)  # PHISHING, SOCIAL_ENGINEERING, PLAYBOOK, STUDENT_GUIDE, EMPLOYEE_GUIDE
    file_name = Column(String(255), nullable=True)
    file_type = Column(String(50), default="markdown")
    source = Column(String(255), default="SentriAI Knowledge Base")
    author = Column(String(100), default="Security Engineering Team")
    total_chunks = Column(Integer, default=0)
    created_at = Column(DateTime, default=get_utc_now)

    chunks = relationship("KnowledgeChunk", back_populates="document", cascade="all, delete-orphan")

class KnowledgeChunk(Base):
    __tablename__ = "knowledge_chunks"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    document_id = Column(String(36), ForeignKey("knowledge_documents.id"), nullable=False)
    chunk_index = Column(Integer, default=0)
    chunk_text = Column(Text, nullable=False)
    embedding = Column(JSON, nullable=True)  # vector representation as float array
    metadata_json = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=get_utc_now)

    document = relationship("KnowledgeDocument", back_populates="chunks")

class Recommendation(Base):
    __tablename__ = "recommendations"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    incident_id = Column(String(36), ForeignKey("incidents.id"), nullable=False)
    step_order = Column(Integer, default=1)
    title = Column(String(255), nullable=False)
    action_type = Column(String(50), default="IMMEDIATE")  # IMMEDIATE, PREVENTIVE, REPORTING
    description = Column(Text, nullable=False)
    rationale = Column(Text, nullable=True)
    rag_source_id = Column(String(36), ForeignKey("knowledge_documents.id"), nullable=True)

    incident = relationship("Incident", back_populates="recommendations")

class AnalystAction(Base):
    __tablename__ = "analyst_actions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    incident_id = Column(String(36), ForeignKey("incidents.id"), nullable=False)
    analyst_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    action_type = Column(String(50), nullable=False)  # APPROVE, ESCALATE, RESOLVE, FALSE_POSITIVE, SIMULATE_BLOCK
    notes = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=get_utc_now)

    incident = relationship("Incident", back_populates="actions")

class IncidentNote(Base):
    __tablename__ = "incident_notes"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    incident_id = Column(String(36), ForeignKey("incidents.id"), nullable=False)
    author_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    author_name = Column(String(255), nullable=False)
    note_text = Column(Text, nullable=False)
    created_at = Column(DateTime, default=get_utc_now)

    incident = relationship("Incident", back_populates="notes")

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    action = Column(String(100), nullable=False)
    resource_type = Column(String(100), nullable=False)
    resource_id = Column(String(100), nullable=True)
    details = Column(JSON, nullable=True)
    ip_address = Column(String(50), default="127.0.0.1")
    created_at = Column(DateTime, default=get_utc_now)

    user = relationship("User", back_populates="audit_logs")
