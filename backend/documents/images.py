from __future__ import annotations

import uuid
from pathlib import Path

import aiofiles
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession

from auth.router import fastapi_users
from db.database import get_async_session
from db.models import User

from .router import _get_owned_document

router = APIRouter(prefix="/api/documentos", tags=["document-images"])

current_active_user = fastapi_users.current_user(active=True)

IMAGES_DIR = Path(__file__).parent / "images"
MAX_IMAGE_SIZE = 5 * 1024 * 1024  # 5 MB
ALLOWED_MIME_TYPES = {
    "image/png",
    "image/jpeg",
    "image/gif",
    "image/webp",
    "image/svg+xml",
}
MAGIC_BYTES = {
    b"\x89PNG\r\n\x1a\n": "image/png",
    b"\xff\xd8\xff": "image/jpeg",
    b"GIF87a": "image/gif",
    b"GIF89a": "image/gif",
    b"RIFF": "image/webp",
}


def _detect_mime(data: bytes) -> str | None:
    for magic, mime in MAGIC_BYTES.items():
        if data[:len(magic)] == magic:
            if mime == "image/webp" and b"WEBP" not in data[:12]:
                continue
            return mime
    if data.lstrip()[:5] in (b"<?xml", b"<svg "):
        return "image/svg+xml"
    return None


@router.post("/{doc_id}/images", status_code=status.HTTP_201_CREATED)
async def upload_image(
    doc_id: uuid.UUID,
    file: UploadFile = File(...),
    user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session),
):
    await _get_owned_document(doc_id, user, session)

    content = await file.read()

    if len(content) > MAX_IMAGE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Image exceeds {MAX_IMAGE_SIZE // (1024 * 1024)}MB limit",
        )

    if not content:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Empty file",
        )

    detected_mime = _detect_mime(content)
    if detected_mime not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported image type. Allowed: PNG, JPEG, GIF, WebP, SVG",
        )

    ext_map = {
        "image/png": ".png",
        "image/jpeg": ".jpg",
        "image/gif": ".gif",
        "image/webp": ".webp",
        "image/svg+xml": ".svg",
    }
    ext = ext_map.get(detected_mime, ".bin")
    filename = f"{uuid.uuid4()}{ext}"

    doc_dir = IMAGES_DIR / str(doc_id)
    doc_dir.mkdir(parents=True, exist_ok=True)

    file_path = doc_dir / filename
    async with aiofiles.open(file_path, "wb") as f:
        await f.write(content)

    return {"filename": filename, "url": f"/api/documentos/{doc_id}/images/{filename}"}


@router.get("/{doc_id}/images/{filename}")
async def get_image(
    doc_id: uuid.UUID,
    filename: str,
    user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session),
):
    await _get_owned_document(doc_id, user, session)

    safe_filename = Path(filename).name
    file_path = (IMAGES_DIR / str(doc_id) / safe_filename).resolve()
    expected_base = (IMAGES_DIR / str(doc_id)).resolve()

    if expected_base not in [file_path, *file_path.parents]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid filename")

    if not file_path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Image not found")

    return FileResponse(file_path)
