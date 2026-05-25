from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from fastapi_users_db_sqlalchemy import SQLAlchemyBaseUserTable
from sqlalchemy import JSON, DateTime, ForeignKey, String, Uuid, func, Text, Integer
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base


class User(SQLAlchemyBaseUserTable, Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    username: Mapped[str] = mapped_column(String(20), unique=True, index=True, nullable=False)
    display_name: Mapped[str | None] = mapped_column(String(50), nullable=True)
    email: Mapped[str] = mapped_column(String(length=255), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(length=255), nullable=False)


class Document(Base):
    __tablename__ = "documents"

    uuid: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    owner_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False, default="Untitled")
    content_json: Mapped[dict[str, Any]] = mapped_column(
        JSON().with_variant(JSONB, "postgresql"),
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
    archived_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )


class KnowledgeFolder(Base):
    __tablename__ = "knowledge_folders"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    owner_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    files: Mapped[list["KnowledgeFile"]] = relationship(
        "KnowledgeFile",
        back_populates="folder",
        cascade="all, delete-orphan",
        lazy="selectin",
    )


class KnowledgeFile(Base):
    __tablename__ = "knowledge_files"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    folder_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("knowledge_folders.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    owner_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    original_name: Mapped[str] = mapped_column(String(255), nullable=False)
    file_type: Mapped[str] = mapped_column(String(50), nullable=False)
    file_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    folder: Mapped["KnowledgeFolder"] = relationship(
        "KnowledgeFolder",
        back_populates="files",
        lazy="selectin",
    )
    chunks: Mapped[list["KnowledgeChunk"]] = relationship(
        "KnowledgeChunk",
        back_populates="file",
        cascade="all, delete-orphan",
        lazy="selectin",
    )


class KnowledgeChunk(Base):
    __tablename__ = "knowledge_chunks"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    file_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("knowledge_files.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    owner_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    content: Mapped[str] = mapped_column(Text, nullable=False)
    chunk_index: Mapped[int] = mapped_column(Integer, nullable=False)
    embedding: Mapped[list[float]] = mapped_column(
        JSONB(),
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    file: Mapped["KnowledgeFile"] = relationship(
        "KnowledgeFile",
        back_populates="chunks",
        lazy="selectin",
    )


class Agent(Base):
    __tablename__ = "agents"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    owner_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=True,
    )
    agent_id: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    system_prompt: Mapped[str] = mapped_column(Text, nullable=False)
    is_builtin: Mapped[bool] = mapped_column(default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    capabilities: Mapped[list["AgentCapability"]] = relationship(
        "AgentCapability",
        back_populates="agent",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    linked_folders: Mapped[list["KnowledgeFolder"]] = relationship(
        "KnowledgeFolder",
        secondary="agent_knowledge_folders",
        lazy="selectin",
    )
    skills: Mapped[list["AgentSkill"]] = relationship(
        "AgentSkill",
        secondary="agent_skill_assignments",
        lazy="selectin",
    )


class AgentCapability(Base):
    __tablename__ = "agent_capabilities"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    agent_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("agents.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    capability_id: Mapped[str] = mapped_column(String(50), nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    action_template: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    agent: Mapped["Agent"] = relationship(
        "Agent",
        back_populates="capabilities",
        lazy="selectin",
    )


class AgentKnowledgeFolder(Base):
    __tablename__ = "agent_knowledge_folders"

    agent_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("agents.id", ondelete="CASCADE"),
        primary_key=True,
    )
    folder_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("knowledge_folders.id", ondelete="CASCADE"),
        primary_key=True,
    )


class AgentSkill(Base):
    __tablename__ = "agent_skills"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    owner_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=True,
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    is_builtin: Mapped[bool] = mapped_column(default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )


class AgentSkillAssignment(Base):
    __tablename__ = "agent_skill_assignments"

    agent_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("agents.id", ondelete="CASCADE"),
        primary_key=True,
    )
    skill_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("agent_skills.id", ondelete="CASCADE"),
        primary_key=True,
    )


class Conversation(Base):
    __tablename__ = "conversations"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    agent_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("agents.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    document_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("documents.uuid", ondelete="CASCADE"),
        index=True,
        nullable=True,
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False, default="Nueva conversación")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    messages: Mapped[list["Message"]] = relationship(
        "Message",
        back_populates="conversation",
        cascade="all, delete-orphan",
        lazy="selectin",
        order_by="Message.created_at",
    )


class Message(Base):
    __tablename__ = "messages"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    conversation_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("conversations.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    role: Mapped[str] = mapped_column(String(20), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    tool_calls: Mapped[dict[str, Any] | None] = mapped_column(
        JSON().with_variant(JSONB, "postgresql"),
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    conversation: Mapped["Conversation"] = relationship(
        "Conversation",
        back_populates="messages",
        lazy="selectin",
    )


class Tool(Base):
    __tablename__ = "tools"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    owner_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=True,
    )
    tool_id: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    endpoint: Mapped[str] = mapped_column(String(255), nullable=False)
    parameters_schema: Mapped[dict[str, Any]] = mapped_column(
        JSON().with_variant(JSONB, "postgresql"),
        nullable=False,
    )
    is_builtin: Mapped[bool] = mapped_column(default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
