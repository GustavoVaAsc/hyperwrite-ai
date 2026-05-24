from __future__ import annotations

from .rag_lookup import RAGLookupTool
from .web_search import WebSearchTool
from .base import BaseTool

TOOLS: dict[str, BaseTool] = {
    "rag_lookup": RAGLookupTool(),
    "web_search": WebSearchTool(),
}


def get_tool(tool_name: str) -> BaseTool | None:
    return TOOLS.get(tool_name)


def get_all_tool_schemas() -> list[dict]:
    return [tool.to_schema() for tool in TOOLS.values()]