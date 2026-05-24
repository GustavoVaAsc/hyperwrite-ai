from __future__ import annotations

import aiofiles
from pathlib import Path
import uuid
import shutil

STORAGE_DIR = Path(__file__).parent / "files"


def get_file_path(user_id: int, file_id: uuid.UUID, original_name: str) -> Path:
    ext = original_name.split(".")[-1] if "." in original_name else ""
    safe_name = f"{file_id}.{ext}" if ext else str(file_id)
    user_dir = STORAGE_DIR / str(user_id)
    return user_dir / safe_name


async def save_file(content: bytes, user_id: int, file_id: uuid.UUID, original_name: str) -> str:
    user_dir = STORAGE_DIR / str(user_id)
    user_dir.mkdir(parents=True, exist_ok=True)
    file_path = get_file_path(user_id, file_id, original_name)
    async with aiofiles.open(file_path, "wb") as f:
        await f.write(content)
    return str(file_path)


def resolve_file_path(file_path: str, user_id: int | None = None) -> Path | None:
    path = Path(file_path)
    try:
        path = path.resolve()
        if user_id is not None:
            expected_base = (STORAGE_DIR / str(user_id)).resolve()
            if expected_base not in [path, *path.parents]:
                return None
        else:
            if STORAGE_DIR.resolve() not in [STORAGE_DIR.resolve(), *STORAGE_DIR.resolve().parents]:
                return None
        if path.exists():
            return path
    except Exception:
        pass
    return None


async def delete_user_files(user_id: int) -> None:
    user_dir = STORAGE_DIR / str(user_id)
    if user_dir.exists():
        shutil.rmtree(user_dir)