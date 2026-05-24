"""
WebSocket endpoint: WS /ws/editor/{doc_id}

Auth: browsers cannot set headers on a WebSocket handshake, so the JWT travels
as a query parameter:  ws://host/ws/editor/<doc_id>?token=<jwt>

Message protocol (JSON):

  Client -> Server:
    { "type": "action",
      "agent_id": "cientifico",
      "action": "resumir",
      "text": "<selección>",
      "options": { "tone": "formal" }   # optional
    }

  Server -> Client (during a streamed response):
    { "type": "token", "text": "Hola " }
    { "type": "token", "text": "mundo" }
    ...
    { "type": "done" }

  Server -> Client (on error):
    { "type": "error", "detail": "..." }

The connection stays open after a 'done' — the client can send another action
on the same socket (useful for repeated edits without reconnecting).
"""
from __future__ import annotations

import uuid
from typing import Any

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, status
from fastapi_users_db_sqlalchemy import SQLAlchemyUserDatabase
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from auth.router import UserManager, get_jwt_strategy
from db.database import AsyncSessionLocal
from db.models import Document, User

from . import llm
from .prompts import build_messages
from .registry import agent_supports

router = APIRouter()


async def _authenticate(token: str, session: AsyncSession) -> User | None:
    user_db = SQLAlchemyUserDatabase(session, User)
    user_manager = UserManager(user_db)
    try:
        return await get_jwt_strategy().read_token(token, user_manager)
    except Exception:
        return None


async def _owns_document(doc_id: uuid.UUID, user: User, session: AsyncSession) -> bool:
    stmt = select(Document.uuid).where(
        Document.uuid == doc_id,
        Document.owner_id == user.id,
        Document.archived_at.is_(None),
    )
    result = await session.execute(stmt)
    return result.scalar_one_or_none() is not None


async def _handle_action(websocket: WebSocket, payload: dict[str, Any]) -> None:
    agent_id = payload.get("agent_id")
    action = payload.get("action")
    text = payload.get("text")
    options = payload.get("options")

    if not isinstance(agent_id, str) or not isinstance(action, str) or not isinstance(text, str) or not text:
        await websocket.send_json({"type": "error", "detail": "Missing agent_id, action, or text"})
        return
    if not agent_supports(agent_id, action):
        await websocket.send_json({
            "type": "error",
            "detail": f"Agent '{agent_id}' does not support action '{action}'",
        })
        return

    try:
        messages = build_messages(agent_id, action, text, options)
    except ValueError as exc:
        await websocket.send_json({"type": "error", "detail": str(exc)})
        return

    try:
        async for delta in llm.stream(messages):
            await websocket.send_json({"type": "token", "text": delta})
    except llm.LLMError as exc:
        await websocket.send_json({"type": "error", "detail": str(exc)})
        return

    await websocket.send_json({"type": "done"})


@router.websocket("/ws/editor/{doc_id}")
async def ws_editor(
    websocket: WebSocket,
    doc_id: uuid.UUID,
    token: str | None = None,
) -> None:
    if not token:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Missing token")
        return

    async with AsyncSessionLocal() as session:
        user = await _authenticate(token, session)
        if user is None or not user.is_active:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Invalid token")
            return

        if not await _owns_document(doc_id, user, session):
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Document not found")
            return

    await websocket.accept()
    try:
        while True:
            payload = await websocket.receive_json()
            msg_type = payload.get("type")
            if msg_type == "action":
                await _handle_action(websocket, payload)
            elif msg_type == "ping":
                await websocket.send_json({"type": "pong"})
            else:
                await websocket.send_json({
                    "type": "error",
                    "detail": f"Unknown message type: {msg_type!r}",
                })
    except WebSocketDisconnect:
        return
