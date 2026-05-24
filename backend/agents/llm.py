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

Retry logic: 3 attempts with exponential backoff (1s, 2s, 4s).
"""
from __future__ import annotations

import asyncio
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


async def _retry_complete(messages: list[dict[str, str]], max_retries: int = 3) -> str:
    delays = [1, 2, 4]
    last_error = None

    for attempt in range(max_retries):
        client = _client()
        try:
            response = await client.chat.completions.create(
                model=_model(),
                messages=messages,
                stream=False,
            )
            choice = response.choices[0].message.content if response.choices else None
            if not choice:
                raise LLMError("LLM returned an empty response")
            return choice
        except (APIConnectionError, APITimeoutError, APIError) as exc:
            last_error = exc
            if attempt < max_retries - 1:
                await asyncio.sleep(delays[attempt])
        finally:
            await client.close()

    raise LLMError(f"LLM failed after {max_retries} attempts: {last_error}") from last_error


async def complete(messages: list[dict[str, str]]) -> str:
    """One-shot completion. Returns the full assistant message text."""
    return await _retry_complete(messages)


async def _retry_stream(messages: list[dict[str, str]], max_retries: int = 3) -> AsyncIterator[str]:
    delays = [1, 2, 4]
    last_error = None

    for attempt in range(max_retries):
        client = _client()
        try:
            response = await client.chat.completions.create(
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
            return
        except (APIConnectionError, APITimeoutError, APIError) as exc:
            last_error = exc
            if attempt < max_retries - 1:
                await asyncio.sleep(delays[attempt])
        finally:
            await client.close()

    raise LLMError(f"LLM failed after {max_retries} attempts: {last_error}") from last_error


async def stream(messages: list[dict[str, str]]) -> AsyncIterator[str]:
    """Token-by-token streaming. Yields content deltas as they arrive."""
    async for delta in _retry_stream(messages):
        yield delta


def _tools_schema() -> list[dict]:
    from tools import get_all_tool_schemas
    return get_all_tool_schemas()


async def complete_with_tools(
    messages: list[dict[str, str]],
    tools: list[dict] | None = None,
    tool_choice: str | None = None,
) -> tuple[str, list[dict] | None]:
    """
    Completion that may trigger tool calls.
    Returns (text, tool_calls) where tool_calls is None if no tool call, otherwise list of {id, name, arguments}.
    """
    client = _client()
    try:
        response = await client.chat.completions.create(
            model=_model(),
            messages=messages,
            tools=tools or _tools_schema(),
            tool_choice=tool_choice or "auto",
            stream=False,
        )
    except (APIConnectionError, APITimeoutError) as exc:
        raise LLMError(f"LLM unreachable: {exc}") from exc
    except APIError as exc:
        raise LLMError(f"LLM error: {exc}") from exc
    finally:
        await client.close()

    choice = response.choices[0].message
    content = choice.content or ""

    tool_calls = None
    if choice.tool_calls:
        tool_calls = [
            {
                "id": tc.id,
                "name": tc.function.name,
                "arguments": tc.function.arguments,
            }
            for tc in choice.tool_calls
        ]

    return content, tool_calls
