from __future__ import annotations

from pydantic import BaseModel


class Capability(BaseModel):
    id: str
    name: str
    description: str


class Agent(BaseModel):
    id: str
    name: str
    description: str
    capabilities: list[Capability]


_CAPS: dict[str, Capability] = {
    "resumir": Capability(
        id="resumir",
        name="Resumir",
        description="Condensa el texto seleccionado manteniendo las ideas clave.",
    ),
    "traducir": Capability(
        id="traducir",
        name="Traducir",
        description="Traduce el texto al idioma indicado en options.target_language.",
    ),
    "cambiar_tono": Capability(
        id="cambiar_tono",
        name="Cambiar tono",
        description="Reescribe el texto con el tono indicado en options.tone (formal, casual, neutro, ...).",
    ),
    "expandir": Capability(
        id="expandir",
        name="Expandir",
        description="Amplía el texto agregando detalle, ejemplos y contexto.",
    ),
    "explicar_concepto": Capability(
        id="explicar_concepto",
        name="Explicar concepto",
        description="Explica el concepto seleccionado en lenguaje accesible.",
    ),
    "formalizar": Capability(
        id="formalizar",
        name="Formalizar",
        description="Convierte el texto a registro jurídico formal.",
    ),
    "citar_jurisprudencia": Capability(
        id="citar_jurisprudencia",
        name="Sugerir jurisprudencia",
        description="Propone referencias y citas relevantes para el texto.",
    ),
    "generar_continuacion": Capability(
        id="generar_continuacion",
        name="Generar continuación",
        description="Continúa la narración a partir del texto provisto.",
    ),
}


AGENTS: dict[str, Agent] = {
    "cientifico": Agent(
        id="cientifico",
        name="Scientist",
        description="Specialist in academic and technical texts.",
        capabilities=[
            _CAPS["resumir"],
            _CAPS["explicar_concepto"],
            _CAPS["traducir"],
            _CAPS["expandir"],
        ],
    ),
    "narrativo": Agent(
        id="narrativo",
        name="Narrative",
        description="Creative writing and storytelling assistant.",
        capabilities=[
            _CAPS["cambiar_tono"],
            _CAPS["expandir"],
            _CAPS["generar_continuacion"],
            _CAPS["resumir"],
        ],
    ),
    "legal": Agent(
        id="legal",
        name="Legal",
        description="Legal drafting assistant.",
        capabilities=[
            _CAPS["formalizar"],
            _CAPS["resumir"],
            _CAPS["traducir"],
            _CAPS["citar_jurisprudencia"],
        ],
    ),
}


def get_agent(agent_id: str) -> Agent | None:
    return AGENTS.get(agent_id)


def agent_supports(agent_id: str, action_id: str) -> bool:
    agent = AGENTS.get(agent_id)
    if agent is None:
        return False
    return any(cap.id == action_id for cap in agent.capabilities)
