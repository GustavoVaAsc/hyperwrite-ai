from __future__ import annotations

import os
from openai import AsyncOpenAI

EMBEDDING_MODEL = os.getenv("LLM_EMBEDDING_MODEL", "nomic-embed-text-v1.5.Q8_0.gguf")
EMBEDDING_URL = os.getenv("LLM_EMBEDDING_URL", "http://host.docker.internal:8080/v1")


def _client() -> AsyncOpenAI:
    return AsyncOpenAI(
        base_url=EMBEDDING_URL,
        api_key=os.getenv("LLM_API_KEY", "local-no-key"),
        timeout=float(os.getenv("LLM_TIMEOUT", "120")),
    )


async def get_embedding(text: str) -> list[float]:
    """Generate embedding vector for given text via LLM API."""
    client = _client()
    response = await client.embeddings.create(
        model=EMBEDDING_MODEL,
        input=text,
    )
    return response.data[0].embedding


async def get_embeddings(texts: list[str]) -> list[list[float]]:
    """Generate embedding vectors for multiple texts via LLM API."""
    if not texts:
        return []
    client = _client()
    response = await client.embeddings.create(
        model=EMBEDDING_MODEL,
        input=texts,
    )
    return [item.embedding for item in response.data]