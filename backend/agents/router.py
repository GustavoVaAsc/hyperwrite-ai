from __future__ import annotations

import uuid
from typing import Any, AsyncIterator

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from auth.router import fastapi_users
from db.models import User

from . import llm
from .executor import AgentExecutor
from .schemas import (
    ActionResult,
    ActionResultMetadata,
    AgentSchema,
    CapabilitySchema,
    ConversationSchema,
    CreateAgentRequest,
    CreateConversationRequest,
    MessageSchema,
    ToolSchema,
    UpdateAgentRequest,
)
from tools import get_all_tool_schemas
from . import service

router = APIRouter(prefix="/api/agentes", tags=["agentes"])

current_active_user = fastapi_users.current_user(active=True)


class ActionRequest(BaseModel):
    agent_id: str
    action: str
    text: str = Field(min_length=1)
    options: dict[str, Any] | None = None


class ActionResponse(BaseModel):
    agent_id: str
    action: str
    result: str


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

    return [
        {"role": "system", "content": agent.system_prompt},
        {"role": "user", "content": user_prompt},
    ]


@router.get("", response_model=list[AgentSchema])
async def list_agents(_: User = Depends(current_active_user)) -> list[AgentSchema]:
    agents = await service.get_agents_for_user()
    return [_agent_to_schema(agent) for agent in agents]


@router.post("", response_model=AgentSchema, status_code=status.HTTP_201_CREATED)
async def create_agent(
    payload: CreateAgentRequest,
    user: User = Depends(current_active_user),
) -> AgentSchema:
    agent = await service.create_agent(
        owner_id=user.id,
        name=payload.name,
        description=payload.description,
        system_prompt=payload.system_prompt,
        capability_ids=payload.capability_ids,
        linked_folder_ids=payload.linked_folder_ids,
    )
    return _agent_to_schema(agent)


@router.get("/{agent_uuid}", response_model=AgentSchema)
async def get_agent(
    agent_uuid: uuid.UUID,
    _: User = Depends(current_active_user),
) -> AgentSchema:
    agent = await service.get_agent_by_id(agent_uuid)
    if agent is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Agent not found",
        )
    return _agent_to_schema(agent)


@router.put("/{agent_uuid}", response_model=AgentSchema)
async def update_agent(
    agent_uuid: uuid.UUID,
    payload: UpdateAgentRequest,
    user: User = Depends(current_active_user),
) -> AgentSchema:
    agent = await service.update_agent(
        agent_uuid=agent_uuid,
        name=payload.name,
        description=payload.description,
        system_prompt=payload.system_prompt,
        capability_ids=payload.capability_ids,
        linked_folder_ids=payload.linked_folder_ids,
    )
    if agent is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Agent not found",
        )
    return _agent_to_schema(agent)


@router.delete("/{agent_uuid}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_agent(
    agent_uuid: uuid.UUID,
    user: User = Depends(current_active_user),
) -> None:
    success = await service.delete_agent(agent_uuid)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Agent not found or cannot be deleted",
        )


@router.get("/{agent_uuid}/actions", response_model=list[CapabilitySchema])
async def list_agent_actions(
    agent_uuid: uuid.UUID,
    _: User = Depends(current_active_user),
) -> list[CapabilitySchema]:
    agent = await service.get_agent_by_id(agent_uuid)
    if agent is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Agent not found",
        )
    return [CapabilitySchema.model_validate(c) for c in agent.capabilities]


class ActionStreamingRequest(BaseModel):
    text: str = Field(min_length=1)
    options: dict[str, Any] | None = None


@router.post("/{agent_uuid}/actions/{action_id}/stream")
async def stream_action(
    agent_uuid: uuid.UUID,
    action_id: str,
    payload: ActionStreamingRequest,
    user: User = Depends(current_active_user),
) -> StreamingResponse:
    agent = await service.get_agent_by_id(agent_uuid)
    if agent is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Agent not found",
        )

    agent_schema = _agent_to_schema(agent)

    cap = next((c for c in agent_schema.capabilities if c.id == action_id), None)
    if not cap:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Agent does not support action '{action_id}'",
        )

    try:
        messages = _build_messages_from_db(agent_schema, action_id, payload.text, payload.options)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        )

    async def event_stream() -> AsyncIterator[str]:
        executor = AgentExecutor(agent_schema, user.id)

        tool_schemas = get_all_tool_schemas()
        first_chunk = True

        try:
            async for delta in executor.execute(messages):
                if first_chunk:
                    first_chunk = False
                yield f"data: {delta}\n"
        except llm.LLMError as exc:
            yield f"data: [ERROR] {exc}\n"

        metadata = ActionResultMetadata(
            action=action_id,
            agent_id=agent_schema.agent_id,
            agent_name=agent_schema.name,
            capability=cap.name,
        )
        yield f"data: [DONE] {metadata.model_dump_json()}\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/accion", response_model=ActionResponse)
async def run_action(
    payload: ActionRequest,
    _: User = Depends(current_active_user),
) -> ActionResponse:
    agent = await service.get_agent_by_agent_id(payload.agent_id)
    if agent is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Agent '{payload.agent_id}' not found",
        )

    try:
        messages = _build_messages_from_db(agent, payload.action, payload.text, payload.options)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc

    try:
        result = await llm.complete(messages)
    except llm.LLMError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(exc),
        ) from exc

    return ActionResponse(agent_id=payload.agent_id, action=payload.action, result=result)


@router.get("/conversations", response_model=list[ConversationSchema])
async def list_conversations(
    user: User = Depends(current_active_user),
) -> list[ConversationSchema]:
    conversations = await service.get_conversations_for_user(user.id)
    return [_conversation_to_schema(c) for c in conversations]


@router.post("/conversations", response_model=ConversationSchema, status_code=status.HTTP_201_CREATED)
async def create_conversation(
    payload: CreateConversationRequest,
    user: User = Depends(current_active_user),
) -> ConversationSchema:
    conversation = await service.create_conversation(
        user_id=user.id,
        agent_id=payload.agent_id,
        document_id=payload.document_id,
        title=payload.title,
    )
    return _conversation_to_schema(conversation)


@router.get("/conversations/{conversation_id}", response_model=ConversationSchema)
async def get_conversation(
    conversation_id: uuid.UUID,
    user: User = Depends(current_active_user),
) -> ConversationSchema:
    conversation = await service.get_conversation_by_id(conversation_id, user.id)
    if conversation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found",
        )
    return _conversation_to_schema(conversation)


@router.delete("/conversations/{conversation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_conversation(
    conversation_id: uuid.UUID,
    user: User = Depends(current_active_user),
) -> None:
    success = await service.delete_conversation(conversation_id, user.id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found",
        )


@router.get("/conversations/{conversation_id}/messages", response_model=list[MessageSchema])
async def get_conversation_messages(
    conversation_id: uuid.UUID,
    user: User = Depends(current_active_user),
) -> list[MessageSchema]:
    messages = await service.get_messages_for_conversation(conversation_id, user.id)
    return [_message_to_schema(m) for m in messages]


@router.get("/tools", response_model=list[ToolSchema])
async def list_tools(
    _: User = Depends(current_active_user),
) -> list[ToolSchema]:
    return [ToolSchema(**t) for t in get_all_tool_schemas()]


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
    )


def _conversation_to_schema(conversation) -> ConversationSchema:
    return ConversationSchema(
        id=conversation.id,
        user_id=conversation.user_id,
        agent_id=conversation.agent_id,
        document_id=conversation.document_id,
        title=conversation.title,
        created_at=conversation.created_at,
        updated_at=conversation.updated_at,
        messages=[
            _message_to_schema(m) for m in conversation.messages
        ] if hasattr(conversation, 'messages') else [],
    )


def _message_to_schema(message) -> MessageSchema:
    return MessageSchema(
        id=message.id,
        role=message.role,
        content=message.content,
        tool_calls=message.tool_calls,
        created_at=message.created_at,
    )