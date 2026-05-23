from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from pydantic import BaseModel
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from auth.router import fastapi_users
from db.database import get_async_session
from db.models import KnowledgeFolder, KnowledgeFile, KnowledgeChunk, User

from .embedding import get_embeddings
from .extractor import extract_text
from . import storage

router = APIRouter(prefix="/knowledge", tags=["knowledge"])

current_active_user = fastapi_users.current_user(active=True)

ALLOWED_EXTENSIONS = {"pdf", "txt", "md", "text"}


class FolderResponse(BaseModel):
    id: uuid.UUID
    name: str
    file_count: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class FileResponse(BaseModel):
    id: uuid.UUID
    original_name: str
    file_type: str
    chunk_count: int
    created_at: datetime

    model_config = {"from_attributes": True}


class FolderDetailResponse(BaseModel):
    id: uuid.UUID
    name: str
    files: list[FileResponse]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class UploadResponse(BaseModel):
    file_id: uuid.UUID
    chunks_created: int
    message: str


class KnowledgeListResponse(BaseModel):
    folders: list[FolderResponse]


async def get_folder_or_404(
    folder_id: uuid.UUID,
    user: User,
    session: AsyncSession,
) -> KnowledgeFolder:
    stmt = select(KnowledgeFolder).where(
        KnowledgeFolder.id == folder_id,
        KnowledgeFolder.owner_id == user.id,
    )
    result = await session.execute(stmt)
    folder = result.scalar_one_or_none()
    if not folder:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Folder not found",
        )
    return folder


@router.get("", response_model=KnowledgeListResponse)
async def list_folders(
    user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session),
) -> KnowledgeListResponse:
    stmt = (
        select(
            KnowledgeFolder,
            func.count(KnowledgeFile.id).label("file_count"),
        )
        .outerjoin(KnowledgeFile, KnowledgeFile.folder_id == KnowledgeFolder.id)
        .where(KnowledgeFolder.owner_id == user.id)
        .group_by(KnowledgeFolder.id)
        .order_by(KnowledgeFolder.updated_at.desc())
    )
    result = await session.execute(stmt)
    rows = result.all()

    folders = [
        FolderResponse(
            id=row[0].id,
            name=row[0].name,
            file_count=row[1] or 0,
            created_at=row[0].created_at,
            updated_at=row[0].updated_at,
        )
        for row in rows
    ]
    return KnowledgeListResponse(folders=folders)


@router.get("/folder/{folder_id}", response_model=FolderDetailResponse)
async def get_folder(
    folder_id: uuid.UUID,
    user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session),
) -> FolderDetailResponse:
    folder = await get_folder_or_404(folder_id, user, session)

    files_stmt = select(KnowledgeFile).where(KnowledgeFile.folder_id == folder_id)
    files_result = await session.execute(files_stmt)
    files = files_result.scalars().all()

    chunk_counts_stmt = (
        select(KnowledgeChunk.file_id, func.count(KnowledgeChunk.id))
        .where(KnowledgeChunk.file_id.in_([f.id for f in files]))
        .group_by(KnowledgeChunk.file_id)
    )
    chunk_result = await session.execute(chunk_counts_stmt)
    chunk_counts = dict(chunk_result.all())

    file_responses = [
        FileResponse(
            id=f.id,
            original_name=f.original_name,
            file_type=f.file_type,
            chunk_count=chunk_counts.get(f.id, 0),
            created_at=f.created_at,
        )
        for f in files
    ]

    return FolderDetailResponse(
        id=folder.id,
        name=folder.name,
        files=file_responses,
        created_at=folder.created_at,
        updated_at=folder.updated_at,
    )


@router.post("/folder", response_model=FolderResponse, status_code=status.HTTP_201_CREATED)
async def create_folder(
    payload: dict[str, Any],
    user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session),
) -> FolderResponse:
    name = payload.get("name", "Untitled Folder")
    folder = KnowledgeFolder(owner_id=user.id, name=name)
    session.add(folder)
    await session.commit()
    await session.refresh(folder)
    return FolderResponse(
        id=folder.id,
        name=folder.name,
        file_count=0,
        created_at=folder.created_at,
        updated_at=folder.updated_at,
    )


@router.post("/folder/{folder_id}/upload", response_model=UploadResponse)
async def upload_file(
    folder_id: uuid.UUID,
    file: UploadFile = File(...),
    user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session),
) -> UploadResponse:
    folder = await get_folder_or_404(folder_id, user, session)

    ext = file.filename.split(".")[-1] if "." in file.filename else ""
    if ext.lower() not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type '{ext}' not allowed. Supported: {', '.join(ALLOWED_EXTENSIONS)}",
        )

    content = await file.read()
    if not content:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Empty file",
        )

    try:
        chunks: list[str] = []
        async for chunk_text in extract_text(content, ext):
            if chunk_text.strip():
                chunks.append(chunk_text)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    if not chunks:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No text could be extracted from file",
        )

    embedding_vectors = await get_embeddings(chunks)

    knowledge_file = KnowledgeFile(
        folder_id=folder.id,
        owner_id=user.id,
        original_name=file.filename or "unknown",
        file_type=ext.lower(),
    )
    session.add(knowledge_file)
    await session.flush()

    saved_path = await storage.save_file(content, user.id, knowledge_file.id, file.filename or "unknown")
    knowledge_file.file_path = saved_path

    chunks_to_insert: list[KnowledgeChunk] = []
    for idx, (chunk_text, embedding) in enumerate(zip(chunks, embedding_vectors)):
        chunk = KnowledgeChunk(
            file_id=knowledge_file.id,
            owner_id=user.id,
            content=chunk_text,
            chunk_index=idx,
            embedding=embedding,
        )
        chunks_to_insert.append(chunk)

    session.add_all(chunks_to_insert)
    await session.commit()

    return UploadResponse(
        file_id=knowledge_file.id,
        chunks_created=len(chunks_to_insert),
        message=f"Successfully processed '{file.filename}' into {len(chunks_to_insert)} chunks",
    )


@router.delete("/folder/{knowledge_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_folder(
    knowledge_id: uuid.UUID,
    user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session),
) -> None:
    folder = await get_folder_or_404(knowledge_id, user, session)
    await session.delete(folder)
    await session.commit()


@router.get("/file/{file_id}/download")
async def download_file(
    file_id: uuid.UUID,
    user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session),
):
    stmt = select(KnowledgeFile).where(
        KnowledgeFile.id == file_id,
        KnowledgeFile.owner_id == user.id,
    )
    result = await session.execute(stmt)
    kf = result.scalar_one_or_none()
    if not kf:
        raise HTTPException(status_code=404, detail="File not found")

    if not kf.file_path:
        raise HTTPException(status_code=404, detail="File not stored")

    path = storage.resolve_file_path(kf.file_path, user.id)
    if not path:
        raise HTTPException(status_code=404, detail="File not found on disk")

    from fastapi.responses import FileResponse
    return FileResponse(
        path,
        filename=kf.original_name,
        media_type="application/octet-stream",
    )