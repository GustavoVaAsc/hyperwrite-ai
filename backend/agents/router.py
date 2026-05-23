from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from auth.router import fastapi_users
from db.models import User

from . import llm
from .prompts import build_messages
from .registry import AGENTS, Agent, agent_supports

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


@router.get("", response_model=list[Agent])
async def list_agents(_: User = Depends(current_active_user)) -> list[Agent]:
    return list(AGENTS.values())


@router.post("/accion", response_model=ActionResponse)
async def run_action(
    payload: ActionRequest,
    _: User = Depends(current_active_user),
) -> ActionResponse:
    if not agent_supports(payload.agent_id, payload.action):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Agent '{payload.agent_id}' does not support action '{payload.action}'",
        )

    try:
        messages = build_messages(payload.agent_id, payload.action, payload.text, payload.options)
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
