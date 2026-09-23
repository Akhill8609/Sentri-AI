import re
from typing import List, Dict, Any

class DocumentChunker:
    def __init__(self, chunk_size: int = 400, chunk_overlap: int = 50):
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap

    def clean_text(self, text: str) -> str:
        # Normalize whitespace while preserving structural paragraph breaks
        text = re.sub(r'\r\n', '\n', text)
        text = re.sub(r'\n{3,}', '\n\n', text)
        return text.strip()

    def chunk_document(self, text: str, metadata: Dict[str, Any] = None) -> List[Dict[str, Any]]:
        text = self.clean_text(text)
        if not text:
            return []
        
        metadata = metadata or {}
        
        # Split by sections or paragraphs first
        paragraphs = text.split('\n\n')
        chunks = []
        current_chunk = []
        current_word_count = 0
        current_section = metadata.get("title", "General")

        for para in paragraphs:
            para = para.strip()
            if not para:
                continue
            
            # Check if this paragraph is a header
            if para.startswith('#'):
                header_match = re.match(r'^(#+)\s*(.+)', para)
                if header_match:
                    current_section = header_match.group(2).strip()

            words = para.split()
            para_word_count = len(words)

            if current_word_count + para_word_count > self.chunk_size and current_chunk:
                chunk_text = "\n\n".join(current_chunk)
                chunks.append({
                    "chunk_text": chunk_text,
                    "metadata": {
                        **metadata,
                        "section": current_section,
                        "word_count": current_word_count
                    }
                })
                # Keep overlap if possible
                overlap_words = " ".join(words[:self.chunk_overlap]) if len(words) >= self.chunk_overlap else ""
                current_chunk = [overlap_words] if overlap_words else []
                current_word_count = len(current_chunk[0].split()) if current_chunk else 0

            current_chunk.append(para)
            current_word_count += para_word_count

        if current_chunk:
            chunk_text = "\n\n".join(current_chunk)
            chunks.append({
                "chunk_text": chunk_text,
                "metadata": {
                    **metadata,
                    "section": current_section,
                    "word_count": current_word_count
                }
            })

        return chunks

chunker = DocumentChunker()
