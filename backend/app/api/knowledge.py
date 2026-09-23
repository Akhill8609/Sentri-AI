from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_current_user, require_role
from app.models.schema import KnowledgeDocument, KnowledgeChunk, User, AuditLog
from app.services.rag.knowledge_store import knowledge_store
from app.services.rag.retriever import rag_retriever

router = APIRouter(prefix="/knowledge", tags=["Knowledge Base & RAG"])

class QueryRequest(BaseModel):
    query: str
    category: Optional[str] = None
    top_k: Optional[int] = 4

class IngestTextRequest(BaseModel):
    title: str
    category: str
    content: str
    author: Optional[str] = "SOC Engineering Team"

@router.get("/documents")
def list_documents(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    docs = db.query(KnowledgeDocument).order_by(KnowledgeDocument.created_at.desc()).all()
    results = []
    for d in docs:
        results.append({
            "id": d.id,
            "title": d.title,
            "category": d.category,
            "file_name": d.file_name,
            "source": d.source,
            "author": d.author,
            "total_chunks": d.total_chunks,
            "created_at": d.created_at.isoformat() if d.created_at else None
        })
    return results

@router.post("/ingest")
async def ingest_knowledge_text(
    req: IngestTextRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["ADMIN", "SOC_ANALYST"]))
):
    if not req.content.strip():
        raise HTTPException(status_code=400, detail="Document content cannot be empty")

    doc = await knowledge_store.ingest_document(
        db=db,
        title=req.title,
        category=req.category.upper(),
        content=req.content,
        author=req.author or current_user.full_name
    )

    audit = AuditLog(
        user_id=current_user.id,
        action="INGEST_KNOWLEDGE_DOCUMENT",
        resource_type="KNOWLEDGE_DOCUMENT",
        resource_id=doc.id,
        details={"title": doc.title, "chunks": doc.total_chunks}
    )
    db.add(audit)
    db.commit()

    return {
        "message": "Knowledge document successfully chunked, embedded, and indexed in vector store.",
        "document_id": doc.id,
        "title": doc.title,
        "chunks_indexed": doc.total_chunks
    }

@router.post("/upload")
async def upload_document_file(
    file: UploadFile = File(...),
    title: str = Form(...),
    category: str = Form(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["ADMIN", "SOC_ANALYST"]))
):
    contents = await file.read()
    try:
        text = contents.decode("utf-8")
    except UnicodeDecodeError:
        text = contents.decode("latin-1", errors="ignore")

    doc = await knowledge_store.ingest_document(
        db=db,
        title=title,
        category=category.upper(),
        content=text,
        file_name=file.filename,
        author=current_user.full_name
    )

    return {
        "message": "Document file successfully uploaded and ingested into RAG knowledge store.",
        "document_id": doc.id,
        "chunks_indexed": doc.total_chunks
    }

@router.delete("/documents/{id}")
def delete_document(
    id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["ADMIN"]))
):
    doc = db.query(KnowledgeDocument).filter(KnowledgeDocument.id == id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    db.delete(doc)
    db.commit()
    return {"message": "Document and associated vector chunks deleted successfully"}

@router.post("/query")
@router.post("/search")
async def query_knowledge(
    req: QueryRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    results = await rag_retriever.retrieve(
        db=db,
        query=req.query,
        top_k=req.top_k or 4,
        category=req.category
    )
    return {
        "query": req.query,
        "matches_count": len(results),
        "results": results
    }
