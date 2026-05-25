from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import delete, select
from sqlalchemy.orm import selectinload
from db.database import AsyncSessionLocal
from db.models import Agent, AgentCapability, AgentSkill, AgentSkillAssignment, Document


async def get_agents_for_user(user_id: int | None = None) -> list[Agent]:
    async with AsyncSessionLocal() as session:
        query = select(Agent).options(
            selectinload(Agent.capabilities),
            selectinload(Agent.skills),
        )
        if user_id is not None:
            query = query.where((Agent.owner_id == user_id) | (Agent.is_builtin == True))
        else:
            query = query.where(Agent.is_builtin == True)

        result = await session.execute(query)
        return list(result.scalars().all())


async def get_agent_by_id(agent_uuid: uuid.UUID) -> Agent | None:
    async with AsyncSessionLocal() as session:
        query = select(Agent).options(
            selectinload(Agent.capabilities),
            selectinload(Agent.skills),
        ).where(Agent.id == agent_uuid)
        result = await session.execute(query)
        return result.scalar_one_or_none()


async def get_agent_by_agent_id(agent_id: str) -> Agent | None:
    async with AsyncSessionLocal() as session:
        query = select(Agent).options(
            selectinload(Agent.capabilities),
            selectinload(Agent.skills),
        ).where(Agent.agent_id == agent_id)
        result = await session.execute(query)
        return result.scalar_one_or_none()


async def create_agent(
    owner_id: int,
    name: str,
    description: str,
    system_prompt: str,
    capability_ids: list[str],
    linked_folder_ids: list[uuid.UUID],
    skill_ids: list[uuid.UUID] | None = None,
) -> Agent:
    async with AsyncSessionLocal() as session:
        agent_uuid = uuid.uuid4()
        agent = Agent(
            id=agent_uuid,
            owner_id=owner_id,
            agent_id=f"custom_{agent_uuid.hex[:12]}",
            name=name,
            description=description,
            system_prompt=system_prompt,
            is_builtin=False,
        )
        session.add(agent)

        if capability_ids:
            caps_result = await session.execute(
                select(AgentCapability).where(AgentCapability.capability_id.in_(capability_ids))
            )
            caps = caps_result.scalars().all()
            for cap in caps:
                new_cap = AgentCapability(
                    id=uuid.uuid4(),
                    agent_id=agent_uuid,
                    capability_id=cap.capability_id,
                    name=cap.name,
                    description=cap.description,
                    action_template=cap.action_template,
                )
                session.add(new_cap)

        if skill_ids:
            for skill_id in skill_ids:
                session.add(AgentSkillAssignment(agent_id=agent_uuid, skill_id=skill_id))

        await session.commit()
        await session.refresh(agent)

        query = select(Agent).options(
            selectinload(Agent.capabilities),
            selectinload(Agent.skills),
        ).where(Agent.id == agent_uuid)
        result = await session.execute(query)
        return result.scalar_one()


async def update_agent(
    agent_uuid: uuid.UUID,
    name: str | None,
    description: str | None,
    system_prompt: str | None,
    capability_ids: list[str] | None,
    linked_folder_ids: list[uuid.UUID] | None,
    skill_ids: list[uuid.UUID] | None = None,
) -> Agent | None:
    async with AsyncSessionLocal() as session:
        query = select(Agent).where(Agent.id == agent_uuid)
        result = await session.execute(query)
        agent = result.scalar_one_or_none()

        if agent is None:
            return None

        if name is not None:
            agent.name = name
        if description is not None:
            agent.description = description
        if system_prompt is not None:
            agent.system_prompt = system_prompt

        if capability_ids is not None:
            await session.execute(
                AgentCapability.__table__.delete().where(AgentCapability.agent_id == agent_uuid)
            )
            caps_result = await session.execute(
                select(AgentCapability).where(AgentCapability.capability_id.in_(capability_ids))
            )
            caps = caps_result.scalars().all()
            for cap in caps:
                new_cap = AgentCapability(
                    id=uuid.uuid4(),
                    agent_id=agent_uuid,
                    capability_id=cap.capability_id,
                    name=cap.name,
                    description=cap.description,
                    action_template=cap.action_template,
                )
                session.add(new_cap)

        if skill_ids is not None:
            await session.execute(
                delete(AgentSkillAssignment).where(AgentSkillAssignment.agent_id == agent_uuid)
            )
            for skill_id in skill_ids:
                session.add(AgentSkillAssignment(agent_id=agent_uuid, skill_id=skill_id))

        await session.commit()

        query = select(Agent).options(
            selectinload(Agent.capabilities),
            selectinload(Agent.skills),
        ).where(Agent.id == agent_uuid)
        result = await session.execute(query)
        return result.scalar_one()


async def delete_agent(agent_uuid: uuid.UUID) -> bool:
    async with AsyncSessionLocal() as session:
        query = select(Agent).where(Agent.id == agent_uuid)
        result = await session.execute(query)
        agent = result.scalar_one_or_none()

        if agent is None:
            return False

        if agent.is_builtin:
            return False

        await session.delete(agent)
        await session.commit()
        return True


async def get_conversations_for_user(user_id: int) -> list[Conversation]:
    from db.models import Conversation
    async with AsyncSessionLocal() as session:
        query = select(Conversation).where(Conversation.user_id == user_id).order_by(Conversation.updated_at.desc())
        result = await session.execute(query)
        return list(result.scalars().all())


async def get_conversation_by_id(conversation_id: uuid.UUID, user_id: int) -> Conversation | None:
    from db.models import Conversation
    async with AsyncSessionLocal() as session:
        query = select(Conversation).where(
            Conversation.id == conversation_id,
            Conversation.user_id == user_id,
        )
        result = await session.execute(query)
        return result.scalar_one_or_none()


async def create_conversation(
    user_id: int,
    agent_id: uuid.UUID,
    document_id: uuid.UUID | None,
    title: str | None,
) -> Conversation:
    from db.models import Conversation
    async with AsyncSessionLocal() as session:
        conversation = Conversation(
            id=uuid.uuid4(),
            user_id=user_id,
            agent_id=agent_id,
            document_id=document_id,
            title=title or "Nueva conversación",
        )
        session.add(conversation)
        await session.commit()
        await session.refresh(conversation)
        return conversation


async def delete_conversation(conversation_id: uuid.UUID, user_id: int) -> bool:
    from db.models import Conversation
    async with AsyncSessionLocal() as session:
        query = select(Conversation).where(
            Conversation.id == conversation_id,
            Conversation.user_id == user_id,
        )
        result = await session.execute(query)
        conversation = result.scalar_one_or_none()

        if conversation is None:
            return False

        await session.delete(conversation)
        await session.commit()
        return True


async def add_message(
    conversation_id: uuid.UUID,
    role: str,
    content: str,
    tool_calls: dict[str, Any] | None = None,
) -> Message:
    from db.models import Conversation, Message
    async with AsyncSessionLocal() as session:
        message = Message(
            id=uuid.uuid4(),
            conversation_id=conversation_id,
            role=role,
            content=content,
            tool_calls=tool_calls,
        )
        session.add(message)

        query = select(Conversation).where(Conversation.id == conversation_id)
        result = await session.execute(query)
        conversation = result.scalar_one_or_none()
        if conversation:
            conversation.updated_at = datetime.now(timezone.utc)

        await session.commit()
        await session.refresh(message)
        return message


async def get_messages_for_conversation(conversation_id: uuid.UUID, user_id: int) -> list[Message]:
    from db.models import Conversation, Message
    async with AsyncSessionLocal() as session:
        query = select(Conversation).where(
            Conversation.id == conversation_id,
            Conversation.user_id == user_id,
        )
        result = await session.execute(query)
        conversation = result.scalar_one_or_none()

        if conversation is None:
            return []

        msg_query = select(Message).where(Message.conversation_id == conversation_id).order_by(Message.created_at)
        msg_result = await session.execute(msg_query)
        return list(msg_result.scalars().all())


async def get_document_by_id(doc_id: uuid.UUID, user_id: int) -> Document | None:
    from db.models import Document
    async with AsyncSessionLocal() as session:
        query = select(Document).where(
            Document.uuid == doc_id,
            Document.owner_id == user_id,
            Document.archived_at.is_(None),
        )
        result = await session.execute(query)
        return result.scalar_one_or_none()


# ─── Skill CRUD ─────────────────────────────────────────────────────────────


async def get_skills_for_user(user_id: int | None = None) -> list[AgentSkill]:
    async with AsyncSessionLocal() as session:
        query = select(AgentSkill)
        if user_id is not None:
            query = query.where((AgentSkill.owner_id == user_id) | (AgentSkill.is_builtin == True))
        else:
            query = query.where(AgentSkill.is_builtin == True)
        result = await session.execute(query)
        return list(result.scalars().all())


async def get_skill_by_id(skill_id: uuid.UUID) -> AgentSkill | None:
    async with AsyncSessionLocal() as session:
        query = select(AgentSkill).where(AgentSkill.id == skill_id)
        result = await session.execute(query)
        return result.scalar_one_or_none()


async def create_skill(
    owner_id: int,
    name: str,
    description: str,
    content: str,
) -> AgentSkill:
    async with AsyncSessionLocal() as session:
        skill = AgentSkill(
            id=uuid.uuid4(),
            owner_id=owner_id,
            name=name,
            description=description,
            content=content,
            is_builtin=False,
        )
        session.add(skill)
        await session.commit()
        await session.refresh(skill)
        return skill


async def update_skill(
    skill_id: uuid.UUID,
    owner_id: int,
    name: str | None = None,
    description: str | None = None,
    content: str | None = None,
) -> AgentSkill | None:
    async with AsyncSessionLocal() as session:
        query = select(AgentSkill).where(AgentSkill.id == skill_id)
        result = await session.execute(query)
        skill = result.scalar_one_or_none()

        if skill is None:
            return None
        if skill.is_builtin or (skill.owner_id != owner_id):
            return None

        if name is not None:
            skill.name = name
        if description is not None:
            skill.description = description
        if content is not None:
            skill.content = content

        await session.commit()
        await session.refresh(skill)
        return skill


async def delete_skill(skill_id: uuid.UUID, owner_id: int) -> bool:
    async with AsyncSessionLocal() as session:
        query = select(AgentSkill).where(AgentSkill.id == skill_id)
        result = await session.execute(query)
        skill = result.scalar_one_or_none()

        if skill is None:
            return False
        if skill.is_builtin or (skill.owner_id != owner_id):
            return False

        await session.delete(skill)
        await session.commit()
        return True


async def set_agent_skills(
    agent_uuid: uuid.UUID,
    skill_ids: list[uuid.UUID],
    owner_id: int,
) -> Agent | None:
    async with AsyncSessionLocal() as session:
        query = select(Agent).where(Agent.id == agent_uuid)
        result = await session.execute(query)
        agent = result.scalar_one_or_none()

        if agent is None:
            return None
        if not agent.is_builtin and agent.owner_id != owner_id:
            return None

        await session.execute(
            delete(AgentSkillAssignment).where(AgentSkillAssignment.agent_id == agent_uuid)
        )
        for skill_id in skill_ids:
            session.add(AgentSkillAssignment(agent_id=agent_uuid, skill_id=skill_id))

        await session.commit()

        query = select(Agent).options(
            selectinload(Agent.capabilities),
            selectinload(Agent.skills),
        ).where(Agent.id == agent_uuid)
        result = await session.execute(query)
        return result.scalar_one()