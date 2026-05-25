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
import json
import os
import re
from collections.abc import AsyncIterator

from openai import AsyncOpenAI, APIConnectionError, APIError, APITimeoutError


class LLMError(RuntimeError):
    """Raised when the LLM call fails (unreachable, timeout, bad response, ...)."""


def _extract_json_from_content(content: str) -> tuple[str, list[dict] | None]:
    """Extract JSON tool calls from content text when model outputs them as text instead of proper tool_calls."""
    tool_calls = None

    json_pattern = r'```json\s*(\{[^}]*(?:\{[^}]*\}[^}]*)*\})\s*```'
    match = re.search(json_pattern, content, re.DOTALL)
    if match:
        try:
            parsed = json.loads(match.group(1))
            if isinstance(parsed, dict) and "name" in parsed and "arguments" in parsed:
                tool_calls = [{
                    "id": f"call_{abs(hash(parsed['name'])) % (10**9)}",
                    "name": parsed["name"],
                    "arguments": json.dumps(parsed["arguments"]) if isinstance(parsed["arguments"], dict) else parsed["arguments"],
                }]
                content = content[:match.start()] + content[match.end():]
        except json.JSONDecodeError:
            pass

    if not tool_calls:
        tool_call_pattern = r'\{"name":\s*"(\w+)",\s*"arguments":\s*(\{[^}]*(?:\{[^}]*\}[^}]*)*\})\}'
        for match in re.finditer(tool_call_pattern, content):
            try:
                name = match.group(1)
                args = json.loads(match.group(2))
                tool_calls = [{
                    "id": f"call_{abs(hash(name)) % (10**9)}",
                    "name": name,
                    "arguments": json.dumps(args),
                }]
                content = content[:match.start()] + content[match.end():]
                break
            except json.JSONDecodeError:
                continue

    if not tool_calls:
        xml_tool_pattern = r'<(\w+)\s+([^>]+)/>'
        for match in re.finditer(xml_tool_pattern, content):
            tag_name = match.group(1)
            attrs_str = match.group(2)
            if tag_name in ("insert_text", "replace_content", "rag_lookup", "web_search", "insert_formula", "insert_table", "format_text"):
                try:
                    args = {}
                    for arg_match in re.finditer(r'(\w+)=\"(.*?)\"(?:\s|$)', attrs_str):
                        args[arg_match.group(1)] = arg_match.group(2)
                    tool_calls = [{
                        "id": f"call_{abs(hash(tag_name)) % (10**9)}",
                        "name": tag_name,
                        "arguments": json.dumps(args),
                    }]
                    content = content[:match.start()] + content[match.end():]
                    break
                except Exception:
                    continue

    if not tool_calls:
        xml_multiline_pattern = r'<(\w+)\s*([^>]*)>(.*?)</\1>'
        for match in re.finditer(xml_multiline_pattern, content, re.DOTALL):
            tag_name = match.group(1)
            attrs_str = match.group(2)
            inner_content = match.group(3).strip()
            if tag_name in ("insert_text", "replace_content", "rag_lookup", "web_search", "insert_formula", "insert_table", "format_text"):
                try:
                    args = {}
                    for arg_match in re.finditer(r'(\w+)=\"(.*?)\"(?:\s|$)', attrs_str):
                        args[arg_match.group(1)] = arg_match.group(2)
                    if inner_content:
                        args["text"] = inner_content
                    tool_calls = [{
                        "id": f"call_{abs(hash(tag_name)) % (10**9)}",
                        "name": tag_name,
                        "arguments": json.dumps(args),
                    }]
                    content = content[:match.start()] + content[match.end():]
                    break
                except Exception:
                    continue

    if not tool_calls:
        bare_json_pattern = r'\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}'
        for match in re.finditer(bare_json_pattern, content):
            try:
                parsed = json.loads(match.group())
                if isinstance(parsed, dict) and "name" in parsed and "arguments" in parsed:
                    tool_calls = [{
                        "id": f"call_{abs(hash(parsed['name'])) % (10**9)}",
                        "name": parsed["name"],
                        "arguments": json.dumps(parsed["arguments"]) if isinstance(parsed["arguments"], dict) else parsed["arguments"],
                    }]
                    content = content[:match.start()] + content[match.end():]
                    break
            except json.JSONDecodeError:
                continue

    content = re.sub(r'^[\s\n]+|[\s\n]+$', '', content)
    return content, tool_calls


def _client() -> AsyncOpenAI:
    return AsyncOpenAI(
        base_url=os.getenv("LLM_BASE_URL", "http://host.docker.internal:11434/v1"),
        api_key=os.getenv("LLM_API_KEY", "local-no-key"),
        timeout=float(os.getenv("LLM_TIMEOUT", "60")),
    )


def _model() -> str:
    return os.getenv("LLM_MODEL", "llama3.2")


def _sanitize_content(content: str) -> str:
    for token in ["<|im_end|>", "<|im_start|>", "<|endoftext|>"]:
        content = content.replace(token, "")
    return content


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
                stop=["<|im_end|>"],
            )
            choice = response.choices[0].message.content if response.choices else None
            if not choice:
                raise LLMError("LLM returned an empty response")
            return _sanitize_content(choice)
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
                stop=["<|im_end|>"],
            )
            async for chunk in response:
                if not chunk.choices:
                    continue
                delta = chunk.choices[0].delta.content
                if delta:
                    yield _sanitize_content(delta)
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
            stop=["<|im_end|>"],
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
    else:
        content, tool_calls = _extract_json_from_content(content)

    return _sanitize_content(content), tool_calls
