from __future__ import annotations

import uuid
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from db.database import AsyncSessionLocal
from db.models import Document

from .base import BaseTool


class InsertTextTool(BaseTool):
    name = "insert_text"
    description = "Inserts text into the user's document at a specified position. Use this when the user wants to add, append, or insert content into their document."
    parameters = {
        "type": "object",
        "properties": {
            "text": {
                "type": "string",
                "description": "The text content to insert. This should be plain text or markdown that will be converted to a proper paragraph.",
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

                paragraph = {"type": "paragraph", "content": []}
                if text.strip():
                    paragraph["content"] = [
                        {"type": "text", "text": text}
                    ]
                else:
                    return "Error: Cannot insert empty text."

                if position == "start":
                    content["content"].insert(0, paragraph)
                else:
                    content["content"].append(paragraph)

                document.content_json = content
                await session.commit()

                return f"Successfully inserted text at the {position} of the document. The document now has {len(content['content'])} blocks."

        except Exception as exc:
            return f"Error inserting text: {exc}"


def create_insert_text_tool() -> InsertTextTool:
    return InsertTextTool()