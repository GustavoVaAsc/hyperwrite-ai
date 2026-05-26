from __future__ import annotations

import uuid
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm.attributes import flag_modified

from db.database import AsyncSessionLocal
from db.models import Document

from .base import BaseTool


def _parse_formula_content(text: str) -> tuple[str | None, str | None]:
    """Parse formula content to extract LaTeX and mode (inline/block)."""
    text = text.strip()

    if text.startswith("$$") and text.endswith("$$"):
        return text[2:-2].strip(), "block"
    if text.startswith("$") and text.endswith("$") and text.count("$") == 2:
        return text[1:-1].strip(), "inline"

    inline_patterns = [
        r'<formula\s+type="inline"\s+latex="([^"]+)"',
        r'<math\s+type="inline"\s+latex="([^"]+)"',
        r'<equation\s+mode="inline"\s+content="([^"]+)"',
    ]
    for pattern in inline_patterns:
        import re
        m = re.search(pattern, text)
        if m:
            return m.group(1), "inline"

    block_patterns = [
        r'<formula\s+type="block"\s+latex="([^"]+)"',
        r'<math\s+type="block"\s+latex="([^"]+)"',
        r'<equation\s+mode="block"\s+content="([^"]+)"',
    ]
    for pattern in block_patterns:
        import re
        m = re.search(pattern, text)
        if m:
            return m.group(1), "block"

    if "\n" in text and not text.startswith("$"):
        return text, "block"

    return text, "inline"


class InsertFormulaTool(BaseTool):
    name = "insert_formula"
    description = "Inserts a LaTeX mathematical formula into the document. Use this when the user wants to add mathematical equations, formulas, or scientific notation. Supports both inline (within text) and block (display) formulas."
    parameters = {
        "type": "object",
        "properties": {
            "formula": {
                "type": "string",
                "description": "The LaTeX formula content (e.g., 'E = mc^2', '\\sum_{i=1}^{n} x_i'). Can be provided as plain LaTeX, or wrapped in XML tags like <formula type=\"inline\" latex=\"...\"/> or <formula type=\"block\" latex=\"...\"/>.",
            },
            "position": {
                "type": "string",
                "description": "Where to insert the formula. Use 'end' to append at the end, or 'start' to prepend at the beginning. Use 'cursor' to insert at the current cursor position (if document_id and block_index are provided).",
                "default": "end",
                "enum": ["start", "end", "cursor"],
            },
            "block_index": {
                "type": "integer",
                "description": "Optional block index for cursor-based insertion. If position='cursor' and this is provided, inserts after the specified block.",
            },
        },
        "required": ["formula"],
    }

    def __init__(self):
        super().__init__(self.name, self.description, self.parameters)

    async def execute(
        self,
        user_id: int,
        document_id: str | None = None,
        formula: str = "",
        position: str = "end",
        block_index: int | None = None,
        **kwargs: Any,
    ) -> str:
        if not document_id:
            return "Error: No document_id provided. The document context is not available."

        try:
            doc_uuid = uuid.UUID(document_id)
        except ValueError:
            return f"Error: Invalid document_id format: {document_id}"

        try:
            latex, mode = _parse_formula_content(formula)
            if not latex:
                return "Error: No valid LaTeX formula found in the input."

            async with AsyncSessionLocal() as session:
                result = await session.execute(
                    select(Document).where(
                        Document.uuid == doc_uuid,
                        Document.owner_id == user_id,
                        Document.archived_at.is_(None),
                    )
                )
                document = result.scalar_one_or_none()

                if not document:
                    return "Error: Document not found or access denied."

                content = document.content_json or {"type": "doc", "content": []}
                if "content" not in content:
                    content["content"] = []

                node_type = "inlineMath" if mode == "inline" else "blockMath"
                math_node = {
                    "type": node_type,
                    "attrs": {"latex": latex},
                    "content": [],
                }

                insert_idx = len(content["content"])
                if position == "start":
                    insert_idx = 0
                elif position == "cursor" and block_index is not None:
                    insert_idx = min(block_index + 1, len(content["content"]))

                content["content"].insert(insert_idx, math_node)

                document.content_json = content
                flag_modified(document, "content_json")
                await session.commit()

                return f"Successfully inserted {mode} formula at position {insert_idx}. Document now has {len(content['content'])} blocks."

        except Exception as exc:
            return f"Error inserting formula: {exc}"


def create_insert_formula_tool() -> InsertFormulaTool:
    return InsertFormulaTool()