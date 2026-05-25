from __future__ import annotations

from .rag_lookup import RAGLookupTool
from .web_search import WebSearchTool
from .insert_text import InsertTextTool
from .replace_content import ReplaceContentTool
from .base import BaseTool

TOOLS: dict[str, BaseTool] = {
    "rag_lookup": RAGLookupTool(),
    "web_search": WebSearchTool(),
    "insert_text": InsertTextTool(),
    "replace_content": ReplaceContentTool(),
}


def get_tool(tool_name: str) -> BaseTool | None:
    return TOOLS.get(tool_name)


def get_all_tool_schemas() -> list[dict]:
    return [tool.to_schema() for tool in TOOLS.values()]