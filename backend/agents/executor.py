from __future__ import annotations

import json
import uuid
from collections.abc import AsyncIterator
from dataclasses import dataclass
from typing import Any

from sqlalchemy import select

from . import llm
from .schemas import AgentSchema

MAX_TOOL_ITERATIONS = 10

DOCUMENT_MODIFYING_TOOLS = ("insert_text", "replace_content", "insert_formula", "insert_table", "format_text")


@dataclass
class DocumentModifiedEvent:
    document_id: str
    content_json: dict[str, Any]


class AgentExecutor:
    def __init__(self, agent: AgentSchema, user_id: int, document_id: str | None = None):
        self.agent = agent
        self.user_id = user_id
        self.document_id = document_id

    async def _fetch_document_content(self) -> dict[str, Any] | None:
        if not self.document_id:
            return None
        from db.database import AsyncSessionLocal
        from db.models import Document
        async with AsyncSessionLocal() as session:
            result = await session.execute(
                select(Document.content_json).where(
                    Document.uuid == uuid.UUID(self.document_id)
                )
            )
            return result.scalar_one_or_none()

    async def execute(
        self,
        messages: list[dict[str, str]],
    ) -> AsyncIterator[str | DocumentModifiedEvent]:
        full_response = ""
        iterations = 0

        while iterations < MAX_TOOL_ITERATIONS:
            iterations += 1
            content, tool_calls = await llm.complete_with_tools(messages)

            if content:
                full_response += content
                yield content

            if not tool_calls:
                break

            assistant_msg: dict = {"role": "assistant", "content": content or ""}
            assistant_msg["tool_calls"] = [
                {
                    "id": tc["id"],
                    "type": "function",
                    "function": {"name": tc["name"], "arguments": tc["arguments"]},
                }
                for tc in tool_calls
            ]
            messages.append(assistant_msg)

            from tools import get_tool
            for tool_call in tool_calls:
                tool_name = tool_call["name"]
                try:
                    tool_args = json.loads(tool_call["arguments"])
                except json.JSONDecodeError:
                    tool_args = {}

                if tool_name in DOCUMENT_MODIFYING_TOOLS and self.document_id:
                    tool_args["document_id"] = self.document_id

                tool = get_tool(tool_name)
                if not tool:
                    messages.append({
                        "role": "tool",
                        "tool_call_id": tool_call["id"],
                        "content": f"Error: Unknown tool '{tool_name}'",
                    })
                    continue

                try:
                    if tool_name in ("rag_lookup", *DOCUMENT_MODIFYING_TOOLS):
                        result = await tool.execute(user_id=self.user_id, **tool_args)
                    else:
                        result = await tool.execute(**tool_args)
                except Exception as exc:
                    import traceback
                    result = f"Tool execution error: {exc}\n{traceback.format_exc()}"

                messages.append({
                    "role": "tool",
                    "tool_call_id": tool_call["id"],
                    "content": result,
                })

                if tool_name in DOCUMENT_MODIFYING_TOOLS and "Error" not in result:
                    updated_content = await self._fetch_document_content()
                    if updated_content is not None:
                        yield DocumentModifiedEvent(
                            document_id=self.document_id,
                            content_json=updated_content,
                        )

        if iterations >= MAX_TOOL_ITERATIONS:
            yield "\n\n[Stopped: maximum tool call iterations reached]"

    async def execute_simple(self, messages: list[dict[str, str]]) -> str:
        full_response = ""
        async for delta in self.execute(messages):
            if isinstance(delta, str):
                full_response += delta
        return full_response
