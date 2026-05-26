from __future__ import annotations

import uuid
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm.attributes import flag_modified

from db.database import AsyncSessionLocal
from db.models import Document

from .base import BaseTool


class ReplaceContentTool(BaseTool):
    name = "replace_content"
    description = "Replaces the entire content of the user's document. Use when the user asks to rewrite, restructure, or completely change the document content."
    parameters = {
        "type": "object",
        "properties": {
            "content": {
                "type": "string",
                "description": "The new full text content for the document. Each paragraph should be separated by a newline. This replaces all existing content.",
            },
        },
        "required": ["content"],
    }

    def __init__(self):
        super().__init__(self.name, self.description, self.parameters)

    async def execute(
        self,
        user_id: int,
        document_id: str | None = None,
        content: str = "",
        **kwargs: Any,
    ) -> str:
        if not document_id:
            return "Error: No document_id provided. The document context is not available."

        if not content.strip():
            return "Error: Cannot set empty content."

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
                    return "Error: Document not found or access denied."

                paragraphs = [p for p in content.split("\n") if p.strip()]
                tiptap_content = {
                    "type": "doc",
                    "content": [
                        {
                            "type": "paragraph",
                            "content": [{"type": "text", "text": p}],
                        }
                        for p in paragraphs
                    ],
                }

                document.content_json = tiptap_content
                flag_modified(document, "content_json")
                await session.commit()

                return f"Successfully replaced document content with {len(paragraphs)} paragraphs."

        except Exception as exc:
            return f"Error replacing content: {exc}"
