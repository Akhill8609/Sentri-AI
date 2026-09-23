from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from app.models.schema import KnowledgeDocument, KnowledgeChunk
from app.services.rag.chunker import chunker
from app.services.rag.embedder import embedder

class KnowledgeStoreService:
    async def ingest_document(
        self,
        db: Session,
        title: str,
        category: str,
        content: str,
        file_name: Optional[str] = None,
        author: str = "SOC Engineering Team",
        source: str = "Internal Security Manual"
    ) -> KnowledgeDocument:
        # Create Document record
        doc = KnowledgeDocument(
            title=title,
            category=category,
            file_name=file_name or f"{title.lower().replace(' ', '_')}.md",
            author=author,
            source=source
        )
        db.add(doc)
        db.flush()

        # Chunk document
        chunks_data = chunker.chunk_document(content, metadata={"title": title, "category": category})
        
        # Embed and save chunks
        for idx, item in enumerate(chunks_data):
            embedding_vec = await embedder.get_embedding(item["chunk_text"])
            chunk_record = KnowledgeChunk(
                document_id=doc.id,
                chunk_index=idx,
                chunk_text=item["chunk_text"],
                embedding=embedding_vec,
                metadata_json=item["metadata"]
            )
            db.add(chunk_record)

        doc.total_chunks = len(chunks_data)
        db.commit()
        db.refresh(doc)
        return doc

knowledge_store = KnowledgeStoreService()
