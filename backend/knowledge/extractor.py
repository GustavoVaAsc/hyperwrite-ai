from __future__ import annotations

import io
from typing import AsyncIterator

from pypdf import PdfReader

CHUNK_SIZE = 350
CHUNK_OVERLAP = 35


async def extract_text_from_pdf(file_content: bytes) -> AsyncIterator[str]:
    reader = PdfReader(io.BytesIO(file_content))
    text_parts: list[str] = []

    for page in reader.pages:
        text = page.extract_text()
        if text:
            text_parts.append(text)

    full_text = "\n\n".join(text_parts)
    for chunk in _chunk_text(full_text):
        yield chunk


def _chunk_text(text: str) -> AsyncIterator[str]:
    words = text.split()
    if not words:
        return

    start = 0
    while start < len(words):
        end = start + CHUNK_SIZE
        chunk = " ".join(words[start:end])
        if chunk.strip():
            yield chunk.strip()
        start += CHUNK_SIZE - CHUNK_OVERLAP


async def extract_text_from_txt(file_content: bytes) -> AsyncIterator[str]:
    text = file_content.decode("utf-8", errors="replace")
    for chunk in _chunk_text(text):
        yield chunk


async def extract_text(file_content: bytes, file_type: str) -> AsyncIterator[str]:
    if file_type.lower() == "pdf":
        async for chunk in extract_text_from_pdf(file_content):
            yield chunk
    elif file_type.lower() in ("txt", "md", "text"):
        async for chunk in extract_text_from_txt(file_content):
            yield chunk
    else:
        raise ValueError(f"Unsupported file type: {file_type}")