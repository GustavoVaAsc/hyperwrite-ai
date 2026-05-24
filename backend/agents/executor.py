from __future__ import annotations

import json
from collections.abc import AsyncIterator

from . import llm
from .schemas import AgentSchema


MAX_TOOL_ITERATIONS = 10


class AgentExecutor:
    def __init__(self, agent: AgentSchema, user_id: int, document_id: str | None = None):
        self.agent = agent
        self.user_id = user_id
        self.document_id = document_id

    async def execute(
        self,
        messages: list[dict[str, str]],
    ) -> AsyncIterator[str]:
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

                if tool_name == "insert_text" and self.document_id:
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
                    if tool_name == "rag_lookup":
                        result = await tool.execute(user_id=self.user_id, **tool_args)
                    elif tool_name == "insert_text":
                        result = await tool.execute(user_id=self.user_id, **tool_args)
                    else:
                        result = await tool.execute(**tool_args)
                except Exception as exc:
                    result = f"Tool execution error: {exc}"

                messages.append({
                    "role": "tool",
                    "tool_call_id": tool_call["id"],
                    "content": result,
                })

        if iterations >= MAX_TOOL_ITERATIONS:
            yield "\n\n[Stopped: maximum tool call iterations reached]"

    async def execute_simple(self, messages: list[dict[str, str]]) -> str:
        full_response = ""
        async for delta in self.execute(messages):
            full_response += delta
        return full_response