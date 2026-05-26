import asyncio
import uuid
from sqlalchemy import select
from db.database import AsyncSessionLocal
from db.models import Agent, AgentCapability


_AGENTS_DATA = [
    {
        "agent_id": "cientifico",
        "name": "Scientist",
        "description": "Specialist in academic and technical texts.",
        "system_prompt": (
            "Eres un asistente de escritura científica. Tu prioridad es la precisión, "
            "la claridad y el rigor técnico. Usa terminología adecuada y mantén un "
            "tono académico. Respondes únicamente con el texto resultante, sin "
            "introducciones ni comentarios meta."
        ),
        "capabilities": [
            {
                "capability_id": "resumir",
                "name": "Resumir",
                "description": "Condensa el texto seleccionado manteniendo las ideas clave.",
                "action_template": "Resume el siguiente texto manteniendo las ideas clave:\n\n{text}",
            },
            {
                "capability_id": "explicar_concepto",
                "name": "Explicar concepto",
                "description": "Explica el concepto seleccionado en lenguaje accesible.",
                "action_template": "Explica el siguiente concepto en lenguaje accesible:\n\n{text}",
            },
            {
                "capability_id": "traducir",
                "name": "Traducir",
                "description": "Traduce el texto al idioma indicado en options.target_language.",
                "action_template": "Traduce el siguiente texto al idioma '{target_language}':\n\n{text}",
            },
            {
                "capability_id": "expandir",
                "name": "Expandir",
                "description": "Amplía el texto agregando detalle, ejemplos y contexto.",
                "action_template": "Amplía el siguiente texto agregando detalle, ejemplos y contexto:\n\n{text}",
            },
        ],
    },
    {
        "agent_id": "narrativo",
        "name": "Narrative",
        "description": "Creative writing and storytelling assistant.",
        "system_prompt": (
            "Eres un asistente de escritura creativa. Cuidas el ritmo, las imágenes y "
            "la voz narrativa. Respondes únicamente con el texto resultante, sin "
            "introducciones ni comentarios meta."
        ),
        "capabilities": [
            {
                "capability_id": "cambiar_tono",
                "name": "Cambiar tono",
                "description": "Reescribe el texto con el tono indicado en options.tone (formal, casual, neutro, ...).",
                "action_template": "Reescribe el siguiente texto con un tono '{tone}':\n\n{text}",
            },
            {
                "capability_id": "expandir",
                "name": "Expandir",
                "description": "Amplía el texto agregando detalle, ejemplos y contexto.",
                "action_template": "Amplía el siguiente texto agregando detalle, ejemplos y contexto:\n\n{text}",
            },
            {
                "capability_id": "generar_continuacion",
                "name": "Generar continuación",
                "description": "Continúa la narración a partir del texto provisto.",
                "action_template": "Continúa la siguiente narración manteniendo el estilo y la voz del autor:\n\n{text}",
            },
            {
                "capability_id": "resumir",
                "name": "Resumir",
                "description": "Condensa el texto seleccionado manteniendo las ideas clave.",
                "action_template": "Resume el siguiente texto manteniendo las ideas clave:\n\n{text}",
            },
        ],
    },
    {
        "agent_id": "legal",
        "name": "Legal",
        "description": "Legal drafting assistant.",
        "system_prompt": (
            "Eres un asistente de redacción jurídica. Usas un registro formal, preciso "
            "y técnicamente correcto. Respondes únicamente con el texto resultante, "
            "sin introducciones ni comentarios meta."
        ),
        "capabilities": [
            {
                "capability_id": "formalizar",
                "name": "Formalizar",
                "description": "Convierte el texto a registro jurídico formal.",
                "action_template": "Reescribe el siguiente texto en registro jurídico formal:\n\n{text}",
            },
            {
                "capability_id": "resumir",
                "name": "Resumir",
                "description": "Condensa el texto seleccionado manteniendo las ideas clave.",
                "action_template": "Resume el siguiente texto manteniendo las ideas clave:\n\n{text}",
            },
            {
                "capability_id": "traducir",
                "name": "Traducir",
                "description": "Traduce el texto al idioma indicado en options.target_language.",
                "action_template": "Traduce el siguiente texto al idioma '{target_language}':\n\n{text}",
            },
            {
                "capability_id": "cit_ar_jurisprudencia",
                "name": "Sugerir jurisprudencia",
                "description": "Propone referencias y citas relevantes para el texto.",
                "action_template": (
                    "Sugiere jurisprudencia y citas legales relevantes para el siguiente texto. "
                    "Indica brevemente por qué cada cita es pertinente:\n\n{text}"
                ),
            },
        ],
    },
]


async def seed_agents():
    async with AsyncSessionLocal() as session:
        for agent_data in _AGENTS_DATA:
            result = await session.execute(
                select(Agent).where(Agent.agent_id == agent_data["agent_id"])
            )
            existing = result.scalar_one_or_none()

            if existing is None:
                agent = Agent(
                    id=uuid.uuid4(),
                    owner_id=None,
                    agent_id=agent_data["agent_id"],
                    name=agent_data["name"],
                    description=agent_data["description"],
                    system_prompt=agent_data["system_prompt"],
                    is_builtin=True,
                )
                session.add(agent)

                for cap_data in agent_data["capabilities"]:
                    capability = AgentCapability(
                        id=uuid.uuid4(),
                        agent_id=agent.id,
                        capability_id=cap_data["capability_id"],
                        name=cap_data["name"],
                        description=cap_data["description"],
                        action_template=cap_data["action_template"],
                    )
                    session.add(capability)

                print(f"Seeded agent: {agent_data['name']}")
            else:
                existing.name = agent_data["name"]
                existing.description = agent_data["description"]
                existing.system_prompt = agent_data["system_prompt"]
                
                # Actualizar capacidades (borrar y recrear para simplificar)
                await session.execute(
                    AgentCapability.__table__.delete().where(
                        AgentCapability.agent_id == existing.id
                    )
                )
                for cap_data in agent_data["capabilities"]:
                    capability = AgentCapability(
                        id=uuid.uuid4(),
                        agent_id=existing.id,
                        capability_id=cap_data["capability_id"],
                        name=cap_data["name"],
                        description=cap_data["description"],
                        action_template=cap_data["action_template"],
                    )
                    session.add(capability)
                    
                print(f"Updated existing agent: {agent_data['name']}")

        await session.commit()


if __name__ == "__main__":
    asyncio.run(seed_agents())