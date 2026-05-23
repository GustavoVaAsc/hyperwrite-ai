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
