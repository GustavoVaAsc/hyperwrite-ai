from __future__ import annotations

import json
from collections.abc import AsyncIterator

from . import llm
from .schemas import AgentSchema


class AgentExecutor:
    def __init__(self, agent: AgentSchema, user_id: int):
        self.agent = agent
        self.user_id = user_id

    async def execute(
        self,
        messages: list[dict[str, str]],
    ) -> AsyncIterator[str]:
        full_response = ""

        while True:
            content, tool_calls = await llm.complete_with_tools(messages)

            if content:
                full_response += content
                yield content

            if tool_calls:
                for tool_call in tool_calls:
                    tool_name = tool_call["name"]
                    tool_args = json.loads(tool_call["arguments"])

                    from tools import get_tool
                    tool = get_tool(tool_name)

                    if not tool:
                        messages.append({
                            "role": "assistant",
                            "content": content,
                            "tool_calls": tool_calls,
                        })
                        messages.append({
                            "role": "tool",
                            "tool_call_id": tool_call["id"],
                            "content": f"Error: Unknown tool '{tool_name}'",
                        })
                        continue

                    try:
                        if tool_name == "rag_lookup":
                            result = await tool.execute(user_id=self.user_id, **tool_args)
                        else:
                            result = await tool.execute(**tool_args)
                    except Exception as exc:
                        result = f"Tool execution error: {exc}"

                    messages.append({
                        "role": "assistant",
                        "content": content,
                        "tool_calls": tool_calls,
                    })
                    messages.append({
                        "role": "tool",
                        "tool_call_id": tool_call["id"],
                        "content": result,
                    })

                if content:
                    continue
                else:
                    next_content, next_tool_calls = await llm.complete_with_tools(messages)
                    if next_content:
                        full_response += next_content
                        yield next_content
                    if not next_tool_calls:
                        break
            else:
                break

    async def execute_simple(self, messages: list[dict[str, str]]) -> str:
        full_response = ""
        async for delta in self.execute(messages):
            full_response += delta
        return full_response