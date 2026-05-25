from __future__ import annotations

import json
import uuid
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm.attributes import flag_modified

from db.database import AsyncSessionLocal
from db.models import Document

from .base import BaseTool


def _parse_table_content(text: str) -> tuple[list[list[str]], bool]:
    """Parse table content from various formats."""
    text = text.strip()

    xml_pattern = r'<table\s+rows="(\d+)"\s+cols="(\d+)"\s*(?:header="true")?\s*>(.*?)</table>'
    m = re.search(xml_pattern, text, re.DOTALL | re.IGNORECASE)
    if m:
        header = "header=\"true\"" in m.group().lower()
        rows_text = m.group(3)
        rows = []
        for row_m in re.finditer(r'<row>(.*?)</row>', rows_text, re.DOTALL | re.IGNORECASE):
            cells = []
            for cell_m in re.finditer(r'<cell>(.*?)</cell>', row_m.group(1), re.DOTALL | re.IGNORECASE):
                cells.append(cell_m.group(1).strip())
            if cells:
                rows.append(cells)
        if rows:
            return rows, header

    markdown_pattern = r'\|(.+)\|(\n\|[-:\s|]+\|)?(\n(?:\|.+\|.*)+)?'
    m = re.match(markdown_pattern, text)
    if m:
        rows = []
        header_line = m.group(1)
        rows.append([c.strip() for c in header_line.split("|") if c.strip()])

        all_lines = text.strip().split("\n")
        for line in all_lines:
            line = line.strip()
            if not line or line == "":
                continue
            if re.match(r'^\|[-:\s|]+\|$', line):
                continue
            if line.startswith("|"):
                cells = [c.strip() for c in line.split("|") if c.strip()]
                if cells:
                    rows.append(cells)

        if len(rows) > 1:
            return rows[1:], rows[0] != []

    if "\t" in text:
        lines = text.split("\n")
        rows = []
        for line in lines:
            if line.strip():
                cells = [c.strip() for c in line.split("\t")]
                rows.append(cells)
        if rows:
            return rows, False

    lines = text.split("\n")
    rows = []
    for line in lines:
        if line.strip():
            cells = [c.strip() for c in re.split(r'\s{2,}', line)]
            if any(cells):
                rows.append(cells)

    return rows, False


import re


class InsertTableTool(BaseTool):
    name = "insert_table"
    description = "Inserts a table into the document. Use this when the user wants to add tabular data, comparisons, or structured information. Tables support header rows, and cells can contain text."
    parameters = {
        "type": "object",
        "properties": {
            "table": {
                "type": "string",
                "description": "The table data. Can be provided in multiple formats: (1) XML: <table rows=\"N\" cols=\"M\" header=\"true\"><row><cell>Header 1</cell><cell>Header 2</cell></row>...</table> (2) Markdown: | Header 1 | Header 2 | with rows below (3) Tab-separated: Row1Col1\\tRow1Col2 on each line",
            },
            "position": {
                "type": "string",
                "description": "Where to insert the table. Use 'end' to append at the end, or 'start' to prepend at the beginning.",
                "default": "end",
                "enum": ["start", "end"],
            },
        },
        "required": ["table"],
    }

    def __init__(self):
        super().__init__(self.name, self.description, self.parameters)

    async def execute(
        self,
        user_id: int,
        document_id: str | None = None,
        table: str = "",
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
            rows, with_header = _parse_table_content(table)
            if not rows or not rows[0]:
                return "Error: No valid table data found."

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

                def make_cell(text: str):
                    return {
                        "type": "tableCell",
                        "content": [{"type": "paragraph", "content": [{"type": "text", "text": text}]}],
                    }

                def make_header_cell(text: str):
                    return {
                        "type": "tableHeader",
                        "content": [{"type": "paragraph", "content": [{"type": "text", "text": text}]}],
                    }

                table_content = []
                header_idx = 1 if with_header else 0

                for r_idx, row in enumerate(rows):
                    tiptap_row = {
                        "type": "tableRow",
                        "content": [],
                    }
                    for cell_text in row:
                        if r_idx == 0 and with_header:
                            tiptap_row["content"].append(make_header_cell(cell_text))
                        else:
                            tiptap_row["content"].append(make_cell(cell_text))
                    table_content.append(tiptap_row)

                table_node = {
                    "type": "table",
                    "attrs": {"withHeaderRow": with_header},
                    "content": table_content,
                }

                if position == "start":
                    content["content"].insert(0, table_node)
                else:
                    content["content"].append(table_node)

                document.content_json = content
                flag_modified(document, "content_json")
                await session.commit()

                return f"Successfully inserted table with {len(rows)} row(s) and {len(rows[0]) if rows else 0} column(s)."

        except Exception as exc:
            return f"Error inserting table: {exc}"


def create_insert_table_tool() -> InsertTableTool:
    return InsertTableTool()