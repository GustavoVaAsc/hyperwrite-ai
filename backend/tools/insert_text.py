from __future__ import annotations

import re
import uuid
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm.attributes import flag_modified

from db.database import AsyncSessionLocal
from db.models import Document

from .base import BaseTool


def _parse_markdown_inline(text: str) -> list[dict[str, Any]]:
    """Parse inline Markdown formatting into TipTap marks."""
    segments = []
    remaining = text

    patterns = [
        (r'\*\*(.+?)\*\*', 'bold'),
        (r'__(.+?)__', 'bold'),
        (r'(?<!\*)\*([^*]+)\*(?!\*)', 'italic'),
        (r'(?<!_)_(?![_])([^_]+)_(?![_])', 'italic'),
        (r'`([^`]+)`', 'code'),
        (r'~~([^~]+)~~', 'strike'),
    ]

    while remaining:
        first_match = None
        first_pos = len(remaining)

        for pat, mark_type in patterns:
            m = re.search(pat, remaining)
            if m and m.start() < first_pos:
                first_match = (m, mark_type)
                first_pos = m.start()

        if not first_match:
            if remaining.strip():
                segments.append({"type": "text", "text": remaining})
            break

        m, mark_type = first_match
        start = m.start()
        if start > 0:
            prefix = remaining[:start]
            if prefix.strip():
                segments.append({"type": "text", "text": prefix})

        content = m.group(1)
        if content.strip():
            segments.append({"type": "text", "text": content, "marks": [{"type": mark_type}]})

        remaining = remaining[m.end():]

    return segments if segments else [{"type": "text", "text": text}]


def _parse_html_inline(text: str) -> list[dict[str, Any]]:
    """Parse inline HTML formatting into TipTap marks."""
    segments = []
    remaining = text

    inline_pattern = re.compile(
        r'<(b|strong|i|em|u|s|strike|code)(?:\s+[^>]*)?>(.*?)</\1>',
        re.DOTALL | re.IGNORECASE
    )

    while remaining:
        m = inline_pattern.search(remaining)
        if not m:
            if remaining.strip():
                segments.append({"type": "text", "text": remaining})
            break

        start = m.start()
        if start > 0:
            prefix = remaining[:start]
            if prefix.strip():
                segments.append({"type": "text", "text": prefix})

        tag = m.group(1).lower()
        content = m.group(2)
        marks = []

        if tag in ('b', 'strong'):
            marks = [{"type": "bold"}]
        elif tag in ('i', 'em'):
            marks = [{"type": "italic"}]
        elif tag == 'u':
            marks = [{"type": "underline"}]
        elif tag in ('s', 'strike'):
            marks = [{"type": "strike"}]
        elif tag == 'code':
            marks = [{"type": "code"}]

        if content.strip():
            segments.append({"type": "text", "text": content, "marks": marks})

        remaining = remaining[m.end():]

    return segments if segments else [{"type": "text", "text": text}]


def _detect_format(text: str) -> str:
    """Detect if text is primarily HTML, Markdown, or plain."""
    text = text.strip()
    if re.search(r'<[a-zA-Z][^>]*>.*</[a-zA-Z]>', text, re.DOTALL):
        return 'html'
    if re.search(r'^#{1,6}\s|\*\*|__|`{1,3}|~~|\n\s*[-*+]\s', text, re.MULTILINE):
        return 'markdown'
    return 'plain'


def _parse_markdown_block(text: str) -> list[dict[str, Any]]:
    """Parse Markdown text into TipTap blocks."""
    blocks = []
    lines = text.split('\n')
    i = 0

    while i < len(lines):
        line = lines[i]
        stripped = line.strip()

        if not stripped:
            i += 1
            continue

        if re.match(r'^#{1,6}\s+(.*)', stripped):
            m = re.match(r'^(#{1,6})\s+(.*)', stripped)
            level = len(m.group(1))
            content = m.group(2).strip()
            blocks.append({
                "type": "heading",
                "attrs": {"level": level},
                "content": _parse_markdown_inline(content),
            })
            i += 1

        elif stripped.startswith('```'):
            code_lines = []
            i += 1
            while i < len(lines) and not lines[i].strip().startswith('```'):
                code_lines.append(lines[i])
                i += 1
            i += 1
            code_text = '\n'.join(code_lines).strip()
            blocks.append({
                "type": "paragraph",
                "content": [{"type": "text", "text": code_text, "marks": [{"type": "code"}]}],
            })

        elif re.match(r'^(\*|[+-])\s+(.*)', stripped):
            list_items = []
            while i < len(lines) and re.match(r'^(\*|[+-])\s+(.*)', lines[i].strip()):
                m = re.match(r'^(\*|[+-])\s+(.*)', lines[i].strip())
                item_text = m.group(2)
                item_blocks = _parse_markdown_block(item_text)
                list_items.append({"type": "listItem", "content": item_blocks if item_blocks else [{"type": "paragraph", "content": [{"type": "text", "text": ""}]}]})
                i += 1
            if list_items:
                blocks.append({"type": "bulletList", "content": list_items})

        elif re.match(r'^\d+\.\s+(.*)', stripped):
            list_items = []
            while i < len(lines) and re.match(r'^\d+\.\s+(.*)', lines[i].strip()):
                m = re.match(r'^\d+\.\s+(.*)', lines[i].strip())
                item_text = m.group(1)
                item_blocks = _parse_markdown_block(item_text)
                list_items.append({"type": "listItem", "content": item_blocks if item_blocks else [{"type": "paragraph", "content": [{"type": "text", "text": ""}]}]})
                i += 1
            if list_items:
                blocks.append({"type": "orderedList", "content": list_items})

        elif re.match(r'^\|.*\|$', stripped):
            table_lines = []
            while i < len(lines) and re.match(r'^\|.*\|$', lines[i].strip()):
                table_lines.append(lines[i].strip())
                i += 1

            header_row = [c.strip() for c in table_lines[0].split('|') if c.strip()]
            rows = []
            for line_t in table_lines[2 if len(table_lines) > 2 else 0:]:
                if re.match(r'^\|[-:\s|]+\|$', line_t):
                    continue
                cells = [c.strip() for c in line_t.split('|') if c.strip()]
                if cells:
                    rows.append(cells)

            header_row_exists = len(table_lines) > 1 and not re.match(r'^\|[-:\s|]+\|$', table_lines[1])
            table_node = {
                "type": "table",
                "attrs": {"withHeaderRow": header_row_exists},
                "content": [],
            }

            if header_row:
                header_cells = [{"type": "tableHeader", "content": [{"type": "paragraph", "content": _parse_markdown_inline(cell)}]} for cell in header_row]
                table_node["content"].append({"type": "tableRow", "content": header_cells})

            for row_cells in rows:
                row_node = {"type": "tableRow", "content": []}
                for cell_text in row_cells:
                    row_node["content"].append({
                        "type": "tableCell",
                        "content": [{"type": "paragraph", "content": _parse_markdown_inline(cell_text)}],
                    })
                table_node["content"].append(row_node)

            blocks.append(table_node)

        elif stripped.startswith('>'):
            quote_lines = []
            while i < len(lines) and lines[i].strip().startswith('>'):
                quote_lines.append(lines[i].strip()[1:].strip())
                i += 1
            quote_text = ' '.join(quote_lines)
            blocks.append({
                "type": "paragraph",
                "content": _parse_markdown_inline(quote_text),
            })

        else:
            parts = re.split(r'(\s{2,})', stripped)
            if len(parts) > 1:
                for part in parts:
                    part = part.strip()
                    if not part:
                        continue
                    if re.match(r'^[-*+]\s+', part):
                        item_blocks = _parse_markdown_block(part[2:])
                        blocks.append({"type": "listItem", "content": item_blocks if item_blocks else [{"type": "paragraph", "content": [{"type": "text", "text": ""}]}]})
                    else:
                        blocks.append({"type": "paragraph", "content": _parse_markdown_inline(part)})
            else:
                blocks.append({
                    "type": "paragraph",
                    "content": _parse_markdown_inline(stripped),
                })
            i += 1

    return blocks


def _parse_html_block(text: str) -> list[dict[str, Any]]:
    """Parse HTML text into TipTap blocks."""
    blocks = []
    text = text.strip()

    block_pattern = re.compile(
        r'<(h[1-6]|p|blockquote|ul|ol|li|div|hr|pre|code)(?:\s+[^>]*)?>(.*?)</\1>',
        re.DOTALL | re.IGNORECASE
    )

    for match in block_pattern.finditer(text):
        tag = match.group(1).lower()
        content = match.group(2).strip()

        if tag.startswith('h') and len(tag) == 2:
            level = int(tag[1])
            blocks.append({
                "type": "heading",
                "attrs": {"level": level},
                "content": _parse_html_inline(content) if content else [],
            })
        elif tag == 'p':
            if content:
                blocks.append({"type": "paragraph", "content": _parse_html_inline(content)})
            else:
                blocks.append({"type": "paragraph", "content": []})
        elif tag in ('blockquote', 'pre'):
            if content:
                blocks.append({"type": "paragraph", "content": _parse_html_inline(content)})
        elif tag == 'code':
            if content:
                blocks.append({"type": "paragraph", "content": [{"type": "text", "text": content, "marks": [{"type": "code"}]}]})
        elif tag in ('ul', 'ol'):
            list_type = "bulletList" if tag == 'ul' else "orderedList"
            list_items = re.findall(r'<li(?:\s+[^>]*)?>(.*?)</li>', match.group(0), re.DOTALL | re.IGNORECASE)
            list_item_nodes = []
            for item_text in list_items:
                item_blocks = _parse_html_block(f'<p>{item_text}</p>')
                for b in item_blocks:
                    if b.get('content'):
                        list_item_nodes.append({"type": "listItem", "content": [b]})
            if list_item_nodes:
                blocks.append({"type": list_type, "content": list_item_nodes})
        elif tag == 'hr':
            blocks.append({"type": "horizontalRule"})
        elif tag == 'div':
            inner_blocks = _parse_html_block(content)
            blocks.extend(inner_blocks)

    remaining = block_pattern.sub('', text)
    remaining = remaining.strip()
    if remaining:
        remaining = re.sub(r'<[^>]+>', '', remaining)
        remaining = remaining.strip()
        if remaining:
            blocks.append({"type": "paragraph", "content": _parse_html_inline(remaining)})

    return blocks


def _parse_plain_text(text: str) -> list[dict[str, Any]]:
    """Parse plain text into TipTap blocks (one paragraph per line)."""
    blocks = []
    lines = text.split('\n')

    for line in lines:
        line = line.strip()
        if not line:
            continue

        parts = re.split(r'( {2,})', line)
        for part in parts:
            part = part.strip()
            if not part:
                continue
            blocks.append({
                "type": "paragraph",
                "content": [{"type": "text", "text": part}],
            })

    return blocks


def _any_to_tiptap(text: str) -> list[dict[str, Any]]:
    """Convert any format (HTML, Markdown, plain) to TipTap blocks."""
    text = text.strip()
    if not text:
        return [{"type": "paragraph", "content": [{"type": "text", "text": ""}]}]

    detected = _detect_format(text)

    if detected == 'html':
        blocks = _parse_html_block(text)
    elif detected == 'markdown':
        blocks = _parse_markdown_block(text)
    else:
        blocks = _parse_plain_text(text)

    return blocks if blocks else [{"type": "paragraph", "content": [{"type": "text", "text": ""}]}]


class InsertTextTool(BaseTool):
    name = "insert_text"
    description = "Inserts text into the user's document at a specified position. Supports HTML, Markdown, and plain text formats. Use when the user wants to add or append content."
    parameters = {
        "type": "object",
        "properties": {
            "text": {
                "type": "string",
                "description": "The text content to insert. Can be HTML (<h1>, <p>, <b>, <i>), Markdown (# Heading, **bold**, *italic*), or plain text. Format is auto-detected.",
            },
            "position": {
                "type": "string",
                "description": "Where to insert the text. Use 'end' to append at the end, or 'start' to prepend at the beginning.",
                "default": "end",
                "enum": ["start", "end"],
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
        position: str = "end",
        **kwargs: Any,
    ) -> str:
        if not document_id:
            return "Error: No document_id provided. The document context is not available."

        try:
            doc_uuid = uuid.UUID(document_id)
        except ValueError:
            return f"Error: Invalid document_id format: {document_id}"

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
                    return f"Error: Document not found or access denied."

                content = document.content_json or {"type": "doc", "content": []}
                if "content" not in content:
                    content["content"] = []

                if not text.strip():
                    return "Error: Cannot insert empty text."

                blocks = _any_to_tiptap(text)

                if position == "start":
                    content["content"] = blocks + content["content"]
                else:
                    content["content"].extend(blocks)

                document.content_json = content
                flag_modified(document, "content_json")
                await session.commit()

                return f"Successfully inserted {len(blocks)} block(s) at the {position} of the document."

        except Exception as exc:
            return f"Error inserting text: {exc}"


def create_insert_text_tool() -> InsertTextTool:
    return InsertTextTool()