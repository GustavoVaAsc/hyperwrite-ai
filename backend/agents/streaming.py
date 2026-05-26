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
from .executor import AgentExecutor, DocumentModifiedEvent
from .prompts import TOOL_SYSTEM_PROMPT
from .schemas import AgentSchema, CapabilitySchema, SkillSchema
from . import service

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


def _build_messages_from_db(agent: AgentSchema, action: str, text: str, options: dict[str, Any] | None) -> list[dict[str, str]]:
    cap = next((c for c in agent.capabilities if c.id == action), None)
    if not cap:
        raise ValueError(f"Agent '{agent.agent_id}' does not support action '{action}'")

    defaults: dict[str, Any] = {}
    if action == "traducir":
        defaults["target_language"] = "inglés"
    elif action == "cambiar_tono":
        defaults["tone"] = "formal"

    resolved = {"text": text, **defaults}
    if options:
        resolved.update(options)

    try:
        user_prompt = cap.action_template.format(**resolved)
    except KeyError as exc:
        missing = exc.args[0]
        raise ValueError(f"Missing required option '{missing}' for action '{action}'") from exc

    system_prompt = agent.system_prompt + _build_skills_prompt(agent)

    return [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt},
    ]


def _tiptap_to_plain_text(doc: dict[str, Any]) -> str:
    parts = []

    def extract_text(node: dict[str, Any]) -> str:
        if not isinstance(node, dict):
            return ""
        node_type = node.get("type", "")
        if node_type == "text":
            return node.get("text", "")
        if node_type == "paragraph":
            content = node.get("content", [])
            return "".join(extract_text(c) for c in content)
        if node_type in ("heading",):
            content = node.get("content", [])
            level = node.get("attrs", {}).get("level", 1)
            text = "".join(extract_text(c) for c in content)
            return f"{'#' * level} {text}\n\n"
        if node_type in ("bulletList", "orderedList"):
            content = node.get("content", [])
            return "".join(extract_text(c) for c in content)
        if node_type == "listItem":
            content = node.get("content", [])
            text = "".join(extract_text(c) for c in content)
            return f"- {text}\n"
        if node_type == "blockquote":
            content = node.get("content", [])
            text = "".join(extract_text(c) for c in content)
            return f"> {text}\n\n"
        if node_type == "codeBlock":
            content = node.get("content", [])
            text = "".join(extract_text(c) for c in content)
            return f"```{text}```\n\n"
        if node_type == "doc":
            content = node.get("content", [])
            return "".join(extract_text(c) for c in content)
        if node_type in ("hardBreak", "horizontalRule"):
            return "\n---\n"
        return ""

    text = extract_text(doc)
    text = text.strip()
    return text


async def _handle_action(
    websocket: WebSocket,
    payload: dict[str, Any],
    user_id: int | None = None,
) -> None:
    agent_id = payload.get("agent_id")
    action = payload.get("action")
    text = payload.get("text")
    options = payload.get("options")
    conversation_id = payload.get("conversation_id")

    if not isinstance(agent_id, str) or not isinstance(action, str) or not isinstance(text, str) or not text:
        await websocket.send_json({"type": "error", "detail": "Missing agent_id, action, or text"})
        return

    agent = await service.get_agent_by_agent_id(agent_id)
    if agent is None:
        await websocket.send_json({
            "type": "error",
            "detail": f"Agent '{agent_id}' not found",
        })
        return

    agent_schema = _agent_to_schema(agent)

    try:
        messages = _build_messages_from_db(agent_schema, action, text, options)
    except ValueError as exc:
        await websocket.send_json({"type": "error", "detail": str(exc)})
        return

    full_response = ""
    try:
        executor = AgentExecutor(agent_schema, user_id or 0)
        async for delta in executor.execute(messages):
            if isinstance(delta, DocumentModifiedEvent):
                await websocket.send_json({
                    "type": "document_updated",
                    "content": delta.content_json,
                })
            else:
                full_response += delta
                await websocket.send_json({"type": "token", "text": delta})
    except llm.LLMError as exc:
        await websocket.send_json({"type": "error", "detail": str(exc)})
        return

    if conversation_id and user_id:
        try:
            conv_uuid = uuid.UUID(conversation_id) if isinstance(conversation_id, str) else conversation_id
            await service.add_message(conv_uuid, "user", text)
            await service.add_message(conv_uuid, "assistant", full_response)
        except Exception:
            pass

    cap = next((c for c in agent_schema.capabilities if c.id == action), None)
    await websocket.send_json({
        "type": "done",
        "metadata": {
            "action": action,
            "agent_id": agent_schema.agent_id,
            "agent_name": agent_schema.name,
            "capability": cap.name if cap else action,
        } if cap else None,
    })


def _agent_to_schema(agent) -> AgentSchema:
    return AgentSchema(
        id=agent.id,
        agent_id=agent.agent_id,
        name=agent.name,
        description=agent.description,
        system_prompt=agent.system_prompt,
        is_builtin=agent.is_builtin,
        capabilities=[
            CapabilitySchema(
                id=c.capability_id,
                name=c.name,
                description=c.description,
                action_template=c.action_template,
            )
            for c in agent.capabilities
        ],
        linked_folder_ids=[f.id for f in agent.linked_folders] if hasattr(agent, 'linked_folders') else [],
        skills=[
            SkillSchema(
                id=s.id,
                name=s.name,
                description=s.description,
                content=s.content,
                is_builtin=s.is_builtin,
                owner_id=s.owner_id,
            )
            for s in agent.skills
        ] if hasattr(agent, 'skills') else [],
    )


def _build_skills_prompt(agent_schema: AgentSchema) -> str:
    if not agent_schema.skills:
        return ""
    sections = []
    for skill in agent_schema.skills:
        sections.append(f"### {skill.name}\n{skill.content}")
    return "\n\n## Skills\n\n" + "\n\n".join(sections)


@router.websocket("/ws/editor/{doc_id}")
async def ws_editor(
    websocket: WebSocket,
    doc_id: uuid.UUID,
    token: str | None = None,
) -> None:
    if not token:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Missing token")
        return

    user_id: int | None = None
    async with AsyncSessionLocal() as session:
        user = await _authenticate(token, session)
        if user is None or not user.is_active:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Invalid token")
            return

        if not await _owns_document(doc_id, user, session):
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Document not found")
            return

        user_id = user.id

    await websocket.accept()
    try:
        while True:
            payload = await websocket.receive_json()
            msg_type = payload.get("type")
            if msg_type == "action":
                await _handle_action(websocket, payload, user_id)
            elif msg_type == "ping":
                await websocket.send_json({"type": "pong"})
            else:
                await websocket.send_json({
                    "type": "error",
                    "detail": f"Unknown message type: {msg_type!r}",
                })
    except WebSocketDisconnect:
        return


@router.websocket("/ws/chat/{conversation_id}")
async def ws_chat(
    websocket: WebSocket,
    conversation_id: uuid.UUID,
    token: str | None = None,
) -> None:
    if not token:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Missing token")
        return

    user_id: int | None = None
    async with AsyncSessionLocal() as session:
        user = await _authenticate(token, session)
        if user is None or not user.is_active:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Invalid token")
            return

        conversation = await service.get_conversation_by_id(conversation_id, user.id)
        if conversation is None:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Conversation not found")
            return

        user_id = user.id

    await websocket.accept()
    try:
        while True:
            payload = await websocket.receive_json()
            msg_type = payload.get("type")
            if msg_type == "message":
                content = payload.get("content")
                if not content:
                    await websocket.send_json({"type": "error", "detail": "Missing content"})
                    continue

                conversation = await service.get_conversation_by_id(conversation_id, user_id)
                if not conversation:
                    await websocket.send_json({"type": "error", "detail": "Conversation not found"})
                    continue
                agent = await service.get_agent_by_id(conversation.agent_id)
                if not agent:
                    await websocket.send_json({"type": "error", "detail": "Agent not found"})
                    continue
                agent_schema = _agent_to_schema(agent)

                messages_history = await service.get_messages_for_conversation(conversation_id, user_id)

                document_content = ""
                doc_id_str = None
                if conversation.document_id:
                    doc_id_str = str(conversation.document_id)
                    doc = await service.get_document_by_id(conversation.document_id, user_id)
                    if doc:
                        doc_json = doc.content_json or {}
                        doc_text = _tiptap_to_plain_text(doc_json)
                        if doc_text:
                            document_content = f"\n\nThe user is currently editing a document with the following content:\n\n{doc_text}\n"

                skills_prompt = _build_skills_prompt(agent_schema)
                system_with_tools = agent_schema.system_prompt + skills_prompt + "\n\n" + document_content + "\n\n" + TOOL_SYSTEM_PROMPT
                messages_for_llm = [
                    {"role": "system", "content": system_with_tools}
                ]
                for msg in messages_history:
                    messages_for_llm.append({"role": msg.role, "content": msg.content})
                messages_for_llm.append({"role": "user", "content": content})

                await service.add_message(conversation_id, "user", content)
                await websocket.send_json({"type": "token", "text": ""})

                full_response = ""
                try:
                    executor = AgentExecutor(agent_schema, user_id, doc_id_str)
                    async for delta in executor.execute(messages_for_llm):
                        if isinstance(delta, DocumentModifiedEvent):
                            await websocket.send_json({
                                "type": "document_updated",
                                "content": delta.content_json,
                            })
                        else:
                            full_response += delta
                            await websocket.send_json({"type": "token", "text": delta})
                except llm.LLMError as exc:
                    await websocket.send_json({"type": "error", "detail": str(exc)})
                    return

                if not full_response:
                    full_response = "[No response generated]"
                await service.add_message(conversation_id, "assistant", full_response)
                await websocket.send_json({"type": "done"})

            elif msg_type == "ping":
                await websocket.send_json({"type": "pong"})
            else:
                await websocket.send_json({
                    "type": "error",
                    "detail": f"Unknown message type: {msg_type!r}",
                })
    except WebSocketDisconnect:
        return
