from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class CapabilitySchema(BaseModel):
    id: str
    name: str
    description: str
    action_template: str

    class Config:
        from_attributes = True


class SkillSchema(BaseModel):
    id: uuid.UUID
    name: str
    description: str
    content: str
    is_builtin: bool
    owner_id: int | None = None

    class Config:
        from_attributes = True


class AgentSchema(BaseModel):
    id: uuid.UUID
    agent_id: str
    name: str
    description: str
    system_prompt: str
    is_builtin: bool
    capabilities: list[CapabilitySchema] = []
    linked_folder_ids: list[uuid.UUID] = []
    skills: list[SkillSchema] = []

    class Config:
        from_attributes = True


class CreateSkillRequest(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    description: str = Field(min_length=1)
    content: str = Field(min_length=1)


class UpdateSkillRequest(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    description: str | None = Field(default=None, min_length=1)
    content: str | None = Field(default=None, min_length=1)


class CreateAgentRequest(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    description: str = Field(min_length=1)
    system_prompt: str = Field(min_length=1)
    capability_ids: list[str] = []
    linked_folder_ids: list[uuid.UUID] = []
    skill_ids: list[uuid.UUID] = []


class UpdateAgentRequest(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    description: str | None = Field(default=None, min_length=1)
    system_prompt: str | None = Field(default=None, min_length=1)
    capability_ids: list[str] | None = None
    linked_folder_ids: list[uuid.UUID] | None = None
    skill_ids: list[uuid.UUID] | None = None


class MessageSchema(BaseModel):
    id: uuid.UUID
    role: str
    content: str
    tool_calls: dict[str, Any] | None = None
    created_at: datetime

    class Config:
        from_attributes = True


class ConversationSchema(BaseModel):
    id: uuid.UUID
    user_id: int
    agent_id: uuid.UUID
    document_id: uuid.UUID | None = None
    title: str
    created_at: datetime
    updated_at: datetime
    messages: list[MessageSchema] = []

    class Config:
        from_attributes = True


class CreateConversationRequest(BaseModel):
    agent_id: uuid.UUID
    document_id: uuid.UUID | None = None
    title: str | None = None


class SendMessageRequest(BaseModel):
    content: str
    conversation_id: uuid.UUID


class ToolSchema(BaseModel):
    name: str
    description: str
    parameters: dict[str, Any]

    class Config:
        from_attributes = True


class ActionResultMetadata(BaseModel):
    action: str
    agent_id: str
    agent_name: str
    capability: str


class ActionResult(BaseModel):
    text: str
    type: str = "text"
    metadata: ActionResultMetadata | None = None


class StreamingToken(BaseModel):
    token: str
    done: bool = False