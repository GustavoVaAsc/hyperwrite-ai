from __future__ import annotations

import asyncio
from typing import AsyncIterator

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from pydantic import Field

from auth.router import fastapi_users
from db.models import User

from .schemas import AutocompleteRequest
from . import service

router = APIRouter(prefix="/api/autocomplete", tags=["autocomplete"])

current_active_user = fastapi_users.current_user(active=True)


@router.post("")
async def autocomplete(
    payload: AutocompleteRequest,
    _: User = Depends(current_active_user),
) -> StreamingResponse:
    async def event_stream() -> AsyncIterator[str]:
        try:
            async for delta in service.stream_completion(
                context=payload.context,
                document_content=payload.document_content,
                max_tokens=payload.max_tokens,
            ):
                yield f"data: {delta}\n"
                await asyncio.sleep(0.01)
        except Exception as exc:
            yield f"data: [ERROR] {exc}\n"
        yield "data: [DONE]\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/complete")
async def autocomplete_complete(
    payload: AutocompleteRequest,
    _: User = Depends(current_active_user),
) -> dict:
    result = await service.get_completion(
        context=payload.context,
        document_content=payload.document_content,
        max_tokens=payload.max_tokens,
    )
    return {"text": result}