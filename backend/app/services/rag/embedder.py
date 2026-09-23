import math
import hashlib
import json
from typing import List
import httpx
from app.core.config import settings

class Embedder:
    def __init__(self, dimension: int = 128):
        self.dimension = dimension

    def _local_semantic_embedding(self, text: str) -> List[float]:
        """
        Deterministic, zero-dependency semantic vector generator.
        Combines token bag-of-words hashing, character 3-grams, and length signals
        into a normalized unit vector of fixed dimension.
        """
        vector = [0.0] * self.dimension
        clean = text.lower().strip()
        tokens = [t for t in clean.replace('\n', ' ').split() if len(t) > 1]
        
        if not tokens:
            return vector

        # Security-critical domain terms weighting
        security_weights = {
            "phish": 3.0, "credential": 3.5, "password": 3.5, "urgent": 2.5,
            "scholarship": 3.0, "internship": 3.0, "hr": 2.5, "support": 2.0,
            "bank": 3.0, "verify": 2.5, "disable": 2.5, "suspend": 2.5,
            "login": 3.0, "otp": 3.5, "mfa": 3.0, "compromise": 3.0,
            "attachment": 2.5, "malware": 3.0, "url": 2.0, "link": 2.0,
            "invoice": 2.5, "payment": 2.5, "student": 2.0, "employee": 2.0,
            "playbook": 2.5, "incident": 2.5, "response": 2.0, "remediate": 2.5
        }

        # Token hashing
        for idx, token in enumerate(tokens):
            h = int(hashlib.md5(token.encode('utf-8')).hexdigest(), 16)
            dim_idx = h % self.dimension
            weight = 1.0
            for sec_key, sec_val in security_weights.items():
                if sec_key in token:
                    weight = max(weight, sec_val)
                    break
            # Add positional decay
            pos_weight = 1.0 / (1.0 + 0.05 * math.log(idx + 1))
            vector[dim_idx] += weight * pos_weight

            # Character 3-grams
            if len(token) >= 3:
                for j in range(len(token) - 2):
                    tri = token[j:j+3]
                    tri_h = int(hashlib.sha256(tri.encode('utf-8')).hexdigest(), 16)
                    tri_idx = tri_h % self.dimension
                    vector[tri_idx] += 0.3 * weight

        # Normalize to unit vector
        magnitude = math.sqrt(sum(v * v for v in vector))
        if magnitude > 0:
            vector = [round(v / magnitude, 6) for v in vector]
        return vector

    async def get_embedding(self, text: str) -> List[float]:
        # If Gemini API key is configured, attempt Gemini text-embedding
        if settings.GEMINI_API_KEY:
            try:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{settings.EMBEDDING_MODEL}:embedContent?key={settings.GEMINI_API_KEY}"
                payload = {
                    "model": f"models/{settings.EMBEDDING_MODEL}",
                    "content": {"parts": [{"text": text}]}
                }
                async with httpx.AsyncClient(timeout=10.0) as client:
                    resp = await client.post(url, json=payload)
                    if resp.status_code == 200:
                        data = resp.json()
                        values = data.get("embedding", {}).get("values", [])
                        if values:
                            # Normalize
                            mag = math.sqrt(sum(v * v for v in values))
                            return [round(v / mag, 6) for v in values] if mag > 0 else values
            except Exception:
                pass  # Fall back gracefully

        # If OpenAI API key is configured
        if settings.OPENAI_API_KEY:
            try:
                url = "https://api.openai.com/v1/embeddings"
                headers = {"Authorization": f"Bearer {settings.OPENAI_API_KEY}"}
                payload = {"input": text, "model": "text-embedding-3-small"}
                async with httpx.AsyncClient(timeout=10.0) as client:
                    resp = await client.post(url, headers=headers, json=payload)
                    if resp.status_code == 200:
                        data = resp.json()
                        values = data.get("data", [{}])[0].get("embedding", [])
                        if values:
                            return values
            except Exception:
                pass

        # Resilient local fallback
        return self._local_semantic_embedding(text)

    def cosine_similarity(self, vec_a: List[float], vec_b: List[float]) -> float:
        if not vec_a or not vec_b:
            return 0.0
        # If dimensions differ, truncate to minimum length
        min_len = min(len(vec_a), len(vec_b))
        if min_len == 0:
            return 0.0
        dot_product = sum(vec_a[i] * vec_b[i] for i in range(min_len))
        norm_a = math.sqrt(sum(vec_a[i] * vec_a[i] for i in range(min_len)))
        norm_b = math.sqrt(sum(vec_b[i] * vec_b[i] for i in range(min_len)))
        if norm_a == 0.0 or norm_b == 0.0:
            return 0.0
        return round(dot_product / (norm_a * norm_b), 4)

embedder = Embedder()
