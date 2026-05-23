"""
LLM client — the *only* place provider details live.

To swap to a different local server (llama.cpp, LM Studio, vLLM, OpenAI proper,
etc.), change the env vars; the code does not need to change. All servers below
expose an OpenAI-compatible `/v1` API:

    Ollama:    LLM_BASE_URL=http://host.docker.internal:11434/v1
    llama.cpp: LLM_BASE_URL=http://host.docker.internal:8080/v1
    LM Studio: LLM_BASE_URL=http://host.docker.internal:1234/v1
    vLLM:      LLM_BASE_URL=http://host.docker.internal:8000/v1
    OpenAI:    LLM_BASE_URL=https://api.openai.com/v1 + a real LLM_API_KEY
"""
from __future__ import annotations

import os
from collections.abc import AsyncIterator

from openai import AsyncOpenAI, APIConnectionError, APIError, APITimeoutError


class LLMError(RuntimeError):
    """Raised when the LLM call fails (unreachable, timeout, bad response, ...)."""


def _client() -> AsyncOpenAI:
    return AsyncOpenAI(
        base_url=os.getenv("LLM_BASE_URL", "http://host.docker.internal:11434/v1"),
        api_key=os.getenv("LLM_API_KEY", "local-no-key"),
        timeout=float(os.getenv("LLM_TIMEOUT", "60")),
    )


def _model() -> str:
    return os.getenv("LLM_MODEL", "llama3.2")


async def complete(messages: list[dict[str, str]]) -> str:
    """One-shot completion. Returns the full assistant message text."""
    try:
        response = await _client().chat.completions.create(
            model=_model(),
            messages=messages,
            stream=False,
        )
    except (APIConnectionError, APITimeoutError) as exc:
        raise LLMError(f"LLM unreachable: {exc}") from exc
    except APIError as exc:
        raise LLMError(f"LLM error: {exc}") from exc

    choice = response.choices[0].message.content if response.choices else None
    if not choice:
        raise LLMError("LLM returned an empty response")
    return choice


async def stream(messages: list[dict[str, str]]) -> AsyncIterator[str]:
    """Token-by-token streaming. Yields content deltas as they arrive."""
    try:
        response = await _client().chat.completions.create(
            model=_model(),
            messages=messages,
            stream=True,
        )
        async for chunk in response:
            if not chunk.choices:
                continue
            delta = chunk.choices[0].delta.content
            if delta:
                yield delta
    except (APIConnectionError, APITimeoutError) as exc:
        raise LLMError(f"LLM unreachable: {exc}") from exc
    except APIError as exc:
        raise LLMError(f"LLM error: {exc}") from exc
