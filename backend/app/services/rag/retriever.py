import json
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.models.schema import KnowledgeChunk, KnowledgeDocument
from app.services.rag.embedder import embedder

class RAGRetriever:
    async def retrieve(
        self,
        db: Session,
        query: str,
        top_k: int = 4,
        category: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Performs semantic vector search over knowledge chunks.
        """
        if not query or not query.strip():
            return []

        query_vec = await embedder.get_embedding(query)
        
        query_builder = db.query(KnowledgeChunk).join(KnowledgeDocument)
        if category:
            query_builder = query_builder.filter(KnowledgeDocument.category == category)
        
        chunks = query_builder.all()
        if not chunks:
            return []

        scored_chunks = []
        for chunk in chunks:
            chunk_embedding = chunk.embedding
            if isinstance(chunk_embedding, str):
                try:
                    chunk_embedding = json.loads(chunk_embedding)
                except Exception:
                    chunk_embedding = []
            
            if not chunk_embedding:
                continue

            similarity = embedder.cosine_similarity(query_vec, chunk_embedding)
            
            # Formulate clear rationale
            category_name = chunk.document.category.replace('_', ' ').title() if chunk.document else "General"
            relevance_reason = f"Retrieved {category_name} reference addressing indicators observed in query."

            scored_chunks.append({
                "chunk_id": chunk.id,
                "document_id": chunk.document_id,
                "document_title": chunk.document.title if chunk.document else "Knowledge Document",
                "category": chunk.document.category if chunk.document else "GENERAL",
                "chunk_text": chunk.chunk_text,
                "similarity_score": similarity,
                "relevance_reason": relevance_reason,
                "metadata": chunk.metadata_json or {}
            })

        # Sort descending by similarity
        scored_chunks.sort(key=lambda x: x["similarity_score"], reverse=True)
        return scored_chunks[:top_k]

rag_retriever = RAGRetriever()
