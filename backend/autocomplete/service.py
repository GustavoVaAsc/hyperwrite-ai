from __future__ import annotations

import asyncio
from collections.abc import AsyncIterator

from agents import llm
from agents.llm import LLMError


SYSTEM_PROMPT = (
    "You are an autocomplete assistant. Based on the provided context, "
    "suggest the most likely continuation of the text. Return only the "
    "completion text, no explanations. Keep it concise (max 50 tokens).\n\n"
    "Context: {context}\n\n"
    "Completion:"
)

DOCUMENT_CONTEXT_PROMPT = (
    "You are an autocomplete assistant. The user is writing a document and "
    "needs suggestions for what to type next. Based on the document content "
    "and current context, suggest a natural continuation.\n\n"
    "Document so far:\n{document_content}\n\n"
    "Current position context:\n{context}\n\n"
    "Completion:"
)


async def get_completion(
    context: str,
    document_content: str | None = None,
    max_tokens: int = 50,
) -> str:
    if document_content:
        prompt = DOCUMENT_CONTEXT_PROMPT.format(
            document_content=document_content,
            context=context,
        )
    else:
        prompt = SYSTEM_PROMPT.format(context=context)

    messages = [
        {"role": "system", "content": "You are a helpful autocomplete assistant."},
        {"role": "user", "content": prompt},
    ]

    try:
        result = await llm.complete(messages)
        return result.strip()
    except LLMError:
        return ""


async def stream_completion(
    context: str,
    document_content: str | None = None,
    max_tokens: int = 50,
) -> AsyncIterator[str]:
    if document_content:
        prompt = DOCUMENT_CONTEXT_PROMPT.format(
            document_content=document_content,
            context=context,
        )
    else:
        prompt = SYSTEM_PROMPT.format(context=context)

    messages = [
        {"role": "system", "content": "You are a helpful autocomplete assistant."},
        {"role": "user", "content": prompt},
    ]

    try:
        async for delta in llm.stream(messages):
            yield delta
    except LLMError:
        return