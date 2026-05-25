from __future__ import annotations

from .rag_lookup import RAGLookupTool
from .web_search import WebSearchTool
from .insert_text import InsertTextTool
from .replace_content import ReplaceContentTool
from .insert_formula import InsertFormulaTool
from .insert_table import InsertTableTool
from .format_text import FormatTextTool
from .base import BaseTool

TOOLS: dict[str, BaseTool] = {
    "rag_lookup": RAGLookupTool(),
    "web_search": WebSearchTool(),
    "insert_text": InsertTextTool(),
    "replace_content": ReplaceContentTool(),
    "insert_formula": InsertFormulaTool(),
    "insert_table": InsertTableTool(),
    "format_text": FormatTextTool(),
}


def get_tool(tool_name: str) -> BaseTool | None:
    return TOOLS.get(tool_name)


def get_all_tool_schemas() -> list[dict]:
    return [tool.to_schema() for tool in TOOLS.values()]