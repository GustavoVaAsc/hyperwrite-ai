from __future__ import annotations

import uuid
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from db.database import AsyncSessionLocal
from db.models import KnowledgeChunk, KnowledgeFolder

from knowledge.embedding import get_embedding

from .base import BaseTool


class RAGLookupTool(BaseTool):
    name = "rag_lookup"
    description = "Searches the user's knowledge base for relevant information. Use this when answering questions that might be covered in uploaded documents."
    parameters = {
        "type": "object",
        "properties": {
            "query": {
                "type": "string",
                "description": "The search query to find relevant information in the knowledge base.",
            },
            "max_results": {
                "type": "integer",
                "description": "Maximum number of results to return.",
                "default": 5,
            },
        },
        "required": ["query"],
    }

    def __init__(self):
        super().__init__(self.name, self.description, self.parameters)

    async def execute(self, user_id: int, query: str, max_results: int = 5, **kwargs) -> str:
        try:
            query_embedding = await get_embedding(query)
        except Exception as exc:
            return f"Error generating embedding: {exc}"

        async with AsyncSessionLocal() as session:
            chunks_result = await session.execute(
                select(KnowledgeChunk).where(KnowledgeChunk.owner_id == user_id)
            )
            chunks = chunks_result.scalars().all()

            if not chunks:
                return "No documents found in knowledge base."

            similarities = []
            for chunk in chunks:
                embedding = chunk.embedding
                if not embedding or len(embedding) != len(query_embedding):
                    continue
                similarity = self._cosine_similarity(query_embedding, embedding)
                similarities.append((chunk, similarity))

            similarities.sort(key=lambda x: x[1], reverse=True)
            top_chunks = similarities[:max_results]

            if not top_chunks:
                return "No relevant information found."

            results = []
            for chunk, score in top_chunks:
                results.append(
                    f"[Relevance: {score:.2f}]\n"
                    f"{chunk.content}\n"
                )

            return "\n---\n".join(results)

    def _cosine_similarity(self, vec1: list[float], vec2: list[float]) -> float:
        dot = sum(a * b for a, b in zip(vec1, vec2))
        norm1 = sum(a * a for a in vec1) ** 0.5
        norm2 = sum(b * b for b in vec2) ** 0.5
        if norm1 == 0 or norm2 == 0:
            return 0.0
        return dot / (norm1 * norm2)