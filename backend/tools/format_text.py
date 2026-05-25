from __future__ import annotations

import uuid
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm.attributes import flag_modified

from db.database import AsyncSessionLocal
from db.models import Document

from .base import BaseTool


def _parse_markdown_format(text: str) -> list[dict[str, Any]]:
    """Parse markdown-formatted text into TipTap marks."""
    import re

    segments = []
    remaining = text

    bold_pattern = r'\*\*(.+?)\*\*'
    bold_alt_pattern = r'__(.+?)__'
    italic_pattern = r'(?<!\*)\*([^*]+)\*(?!\*)'
    italic_alt_pattern = r'(?<!_)_(?![_])([^_]+)(?<!_)_(?![_])'
    code_pattern = r'`([^`]+)`'
    underline_pattern = r'<u>(.+?)</u>'
    strikethrough_pattern = r'~~([^~]+)~~'

    patterns = [
        (bold_pattern, "bold", 1),
        (bold_alt_pattern, "bold", 1),
        (italic_pattern, "italic", 1),
        (italic_alt_pattern, "italic", 1),
        (code_pattern, "code", 1),
        (underline_pattern, "underline", 1),
        (strikethrough_pattern, "strike", 1),
    ]

    while remaining:
        first_match = None
        first_pos = len(remaining)

        for pat, mark_type, group_idx in patterns:
            m = re.search(pat, remaining)
            if m and m.start() < first_pos:
                first_match = (m, mark_type, group_idx)
                first_pos = m.start()

        if not first_match:
            if remaining.strip():
                segments.append({"type": "text", "text": remaining})
            break

        m, mark_type, group_idx = first_match
        start = m.start()
        if start > 0:
            prefix = remaining[:start]
            if prefix.strip():
                segments.append({"type": "text", "text": prefix})

        content = m.group(group_idx)
        segments.append({"type": "text", "text": content, "marks": [{"type": mark_type}]})

        remaining = remaining[m.end():]

    return segments if segments else [{"type": "text", "text": text}]


def _apply_markup_to_blocks(content: dict[str, Any], block_index: int, text: str) -> bool:
    """Apply text formatting (bold, italic, etc.) to a block's text content."""
    if "content" not in content or block_index >= len(content["content"]):
        return False

    block = content["content"][block_index]
    if block.get("type") not in ("paragraph", "heading"):
        return False

    segments = _parse_markdown_format(text)

    block["content"] = segments
    return True


class FormatTextTool(BaseTool):
    name = "format_text"
    description = "Formats text in the document to be bold, italic, underlined, strikethrough, or code. Use this when the user wants to apply text formatting such as making text bold, italic, or other styles. The text should be provided with markdown or HTML markup."
    parameters = {
        "type": "object",
        "properties": {
            "text": {
                "type": "string",
                "description": "The text to format. Use markdown or HTML markup: **bold**, *italic*, __italic__, `code`, <u>underline</u>, ~~strikethrough~~. Only the marked text will be affected.",
            },
            "block_index": {
                "type": "integer",
                "description": "Optional index of the block to format. If not provided, a new paragraph with the formatted text will be appended.",
            },
        },
        "required": ["text"],
    }

    def __init__(self):
        super().__init__(self.name, self.description, self.parameters)

    async def execute(
        self,
        user_id: int,
        document_id: str | None = None,
        text: str = "",
        block_index: int | None = None,
        **kwargs: Any,
    ) -> str:
        if not document_id:
            return "Error: No document_id provided. The document context is not available."

        try:
            doc_uuid = uuid.UUID(document_id)
        except ValueError:
            return f"Error: Invalid document_id format: {document_id}"

        if not text.strip():
            return "Error: Cannot format empty text."

        try:
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

                if block_index is not None:
                    if _apply_markup_to_blocks(content, block_index, text):
                        document.content_json = content
                        flag_modified(document, "content_json")
                        await session.commit()
                        return f"Formatted text at block {block_index}."
                    else:
                        return f"Error: Block {block_index} does not support text formatting."

                segments = _parse_markdown_format(text)
                new_block = {
                    "type": "paragraph",
                    "content": segments,
                }
                content["content"].append(new_block)

                document.content_json = content
                flag_modified(document, "content_json")
                await session.commit()

                return f"Added formatted text as a new paragraph."

        except Exception as exc:
            return f"Error formatting text: {exc}"


def create_format_text_tool() -> FormatTextTool:
    return FormatTextTool()