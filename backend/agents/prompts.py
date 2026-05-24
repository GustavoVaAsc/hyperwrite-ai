from __future__ import annotations

from typing import Any

AGENT_SYSTEM_PROMPTS: dict[str, str] = {
    "cientifico": (
        "Eres un asistente de escritura científica. Tu prioridad es la precisión, "
        "la claridad y el rigor técnico. Usa terminología adecuada y mantén un "
        "tono académico. Responde únicamente con el texto resultante, sin "
        "introducciones ni comentarios meta."
    ),
    "narrativo": (
        "Eres un asistente de escritura creativa. Cuidas el ritmo, las imágenes y "
        "la voz narrativa. Responde únicamente con el texto resultante, sin "
        "introducciones ni comentarios meta."
    ),
    "legal": (
        "Eres un asistente de redacción jurídica. Usa un registro formal, preciso "
        "y técnicamente correcto. Responde únicamente con el texto resultante, "
        "sin introducciones ni comentarios meta."
    ),
}

TOOL_SYSTEM_PROMPT = """You have access to tools that you can use to help the user. When you decide to use a tool, respond with the appropriate function call.

Available tools:
- insert_text: Insert text into the user's document. Use when the user wants to add, append, or insert content into their document.
- rag_lookup: Search the user's knowledge base for relevant information. Use when answering questions that might be covered in uploaded documents.
- web_search: Search the web for current information. Use when you need information that might not be in the knowledge base.

After calling a tool, you will receive the result and should continue your response or call another tool if needed."""


_ACTION_TEMPLATES: dict[str, str] = {
    "resumir": "Resume el siguiente texto manteniendo las ideas clave:\n\n{text}",
    "traducir": "Traduce el siguiente texto al idioma '{target_language}':\n\n{text}",
    "cambiar_tono": "Reescribe el siguiente texto con un tono '{tone}':\n\n{text}",
    "expandir": "Amplía el siguiente texto agregando detalle, ejemplos y contexto:\n\n{text}",
    "explicar_concepto": "Explica el siguiente concepto en lenguaje accesible:\n\n{text}",
    "formalizar": "Reescribe el siguiente texto en registro jurídico formal:\n\n{text}",
    "citar_jurisprudencia": (
        "Sugiere jurisprudencia y citas legales relevantes para el siguiente texto. "
        "Indica brevemente por qué cada cita es pertinente:\n\n{text}"
    ),
    "generar_continuacion": (
        "Continúa la siguiente narración manteniendo el estilo y la voz del autor:\n\n{text}"
    ),
}


_ACTION_DEFAULTS: dict[str, dict[str, Any]] = {
    "traducir": {"target_language": "inglés"},
    "cambiar_tono": {"tone": "formal"},
}


def build_messages(
    agent_id: str,
    action_id: str,
    text: str,
    options: dict[str, Any] | None = None,
) -> list[dict[str, str]]:
    system = AGENT_SYSTEM_PROMPTS.get(agent_id)
    template = _ACTION_TEMPLATES.get(action_id)
    if system is None or template is None:
        raise ValueError(f"Unknown agent/action combination: {agent_id}/{action_id}")

    resolved: dict[str, Any] = {"text": text, **_ACTION_DEFAULTS.get(action_id, {})}
    if options:
        resolved.update(options)
    try:
        user_prompt = template.format(**resolved)
    except KeyError as exc:
        missing = exc.args[0]
        raise ValueError(f"Missing required option '{missing}' for action '{action_id}'") from exc

    return [
        {"role": "system", "content": system},
        {"role": "user", "content": user_prompt},
    ]
