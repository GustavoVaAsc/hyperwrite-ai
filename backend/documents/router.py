from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from auth.router import fastapi_users
from db.database import get_async_session
from db.models import Document, User

router = APIRouter(prefix="/api/documentos", tags=["documentos"])

current_active_user = fastapi_users.current_user(active=True)

EXCERPT_MAX_CHARS = 200
EMPTY_DOC: dict[str, Any] = {"type": "doc", "content": []}


def _extract_excerpt(content: dict[str, Any] | None, limit: int = EXCERPT_MAX_CHARS) -> str:
    if not content:
        return ""
    chunks: list[str] = []
    total = 0

    def walk(node: Any) -> bool:
        nonlocal total
        if isinstance(node, dict):
            text = node.get("text")
            if isinstance(text, str):
                remaining = limit - total
                if remaining <= 0:
                    return True
                chunks.append(text[:remaining])
                total += min(len(text), remaining)
                if total >= limit:
                    return True
            for child in node.get("content", []) or []:
                if walk(child):
                    return True
        elif isinstance(node, list):
            for child in node:
                if walk(child):
                    return True
        return False

    walk(content)
    return "".join(chunks).strip()


class DocumentSummary(BaseModel):
    id: uuid.UUID
    title: str
    updated_at: datetime
    excerpt: str


class DocumentRead(BaseModel):
    id: uuid.UUID
    title: str
    content_json: dict[str, Any]
    created_at: datetime
    updated_at: datetime


class DocumentCreate(BaseModel):
    title: str = Field(default="Untitled", max_length=255)
    content_json: dict[str, Any] | None = None


class DocumentUpdate(BaseModel):
    title: str | None = Field(default=None, max_length=255)
    content_json: dict[str, Any] | None = None


async def _get_owned_document(
    doc_id: uuid.UUID,
    user: User,
    session: AsyncSession,
    *,
    include_archived: bool = False,
) -> Document:
    stmt = select(Document).where(
        Document.uuid == doc_id,
        Document.owner_id == user.id,
    )
    if not include_archived:
        stmt = stmt.where(Document.archived_at.is_(None))
    result = await session.execute(stmt)
    document = result.scalar_one_or_none()
    if document is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    return document


@router.get("", response_model=list[DocumentSummary])
async def list_documents(
    user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session),
) -> list[DocumentSummary]:
    stmt = (
        select(Document)
        .where(Document.owner_id == user.id, Document.archived_at.is_(None))
        .order_by(Document.updated_at.desc())
    )
    result = await session.execute(stmt)
    documents = result.scalars().all()
    return [
        DocumentSummary(
            id=doc.uuid,
            title=doc.title,
            updated_at=doc.updated_at,
            excerpt=_extract_excerpt(doc.content_json),
        )
        for doc in documents
    ]


@router.post("", response_model=DocumentRead, status_code=status.HTTP_201_CREATED)
async def create_document(
    payload: DocumentCreate,
    user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session),
) -> DocumentRead:
    document = Document(
        owner_id=user.id,
        title=payload.title,
        content_json=payload.content_json or EMPTY_DOC,
    )
    session.add(document)
    await session.commit()
    await session.refresh(document)
    return DocumentRead(
        id=document.uuid,
        title=document.title,
        content_json=document.content_json,
        created_at=document.created_at,
        updated_at=document.updated_at,
    )


@router.get("/{doc_id}", response_model=DocumentRead)
async def get_document(
    doc_id: uuid.UUID,
    user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session),
) -> DocumentRead:
    document = await _get_owned_document(doc_id, user, session)
    return DocumentRead(
        id=document.uuid,
        title=document.title,
        content_json=document.content_json,
        created_at=document.created_at,
        updated_at=document.updated_at,
    )


@router.put("/{doc_id}", response_model=DocumentRead)
async def update_document(
    doc_id: uuid.UUID,
    payload: DocumentUpdate,
    user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session),
) -> DocumentRead:
    if payload.title is None and payload.content_json is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one of 'title' or 'content_json' must be provided",
        )
    document = await _get_owned_document(doc_id, user, session)
    if payload.title is not None:
        document.title = payload.title
    if payload.content_json is not None:
        document.content_json = payload.content_json
    await session.commit()
    await session.refresh(document)
    return DocumentRead(
        id=document.uuid,
        title=document.title,
        content_json=document.content_json,
        created_at=document.created_at,
        updated_at=document.updated_at,
    )


@router.delete("/{doc_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(
    doc_id: uuid.UUID,
    user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session),
) -> None:
    document = await _get_owned_document(doc_id, user, session)
    document.archived_at = datetime.now(timezone.utc)
    await session.commit()
