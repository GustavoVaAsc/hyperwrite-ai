"""Seed predefined skills and assign them to built-in agents."""
from __future__ import annotations

import asyncio
import uuid

from sqlalchemy import select

from db.database import AsyncSessionLocal
from db.models import Agent, AgentSkill, AgentSkillAssignment


_SKILLS_DATA: list[dict] = [
    {
        "name": "Investigación Web",
        "description": "Instrucciones para buscar información en la web de manera efectiva y citar fuentes.",
        "content": (
            "## Investigación Web\n\n"
            "Cuando necesites buscar información en la web:\n\n"
            "1. **Formula consultas específicas** — Usa términos clave precisos, evita preguntas genéricas.\n"
            "2. **Busca múltiples fuentes** — No te quedes con el primer resultado. Compara al menos 2-3 fuentes.\n"
            "3. **Evalúa la fiabilidad** — Prioriza fuentes académicas, institucionales o de medios reconocidos.\n"
            "4. **Sintetiza la información** — No copies textualmente. Resume y conecta ideas de distintas fuentes.\n"
            "5. **Cita las fuentes** — Siempre indica de dónde proviene la información:\n"
            "   - Incluye el nombre de la fuente y la URL\n"
            "   - Usa formato: [Título de la fuente](URL)\n"
            "6. **Verifica fechas** — Asegúrate de que la información sea reciente y relevante.\n"
            "7. **Reconoce limitaciones** — Si no encuentras información confiable, indícalo claramente.\n\n"
            "### Ejemplo de citación\n"
            "Según un estudio de la Universidad de X [Fuente](url), el fenómeno Y...\n"
        ),
    },
    {
        "name": "Formato y Estructura",
        "description": "Cómo estructurar documentos con encabezados, listas, tablas y formato adecuado.",
        "content": (
            "## Formato y Estructura de Documentos\n\n"
            "Aplica estas reglas al estructurar contenido:\n\n"
            "### Jerarquía de encabezados\n"
            "- **H1**: Título principal del documento (solo uno)\n"
            "- **H2**: Secciones principales\n"
            "- **H3**: Subsecciones\n"
            "- No saltes niveles (no H1 → H3 directamente)\n\n"
            "### Párrafos\n"
            "- Un párrafo = una idea central\n"
            "- Máximo 4-5 oraciones por párrafo\n"
            "- Usa transiciones entre párrafos\n\n"
            "### Listas\n"
            "- **Listas con viñetas**: para elementos sin orden específico\n"
            "- **Listas numeradas**: para secuencias, pasos o rankings\n"
            "- Mantén paralelismo gramatical entre ítems\n\n"
            "### Tablas\n"
            "- Usa tablas para comparaciones o datos estructurados\n"
            "- Siempre incluye encabezados descriptivos\n"
            "- Mantén las celdas concisas\n\n"
            "### Formato de texto\n"
            "- **Negrita**: para términos clave y énfasis importante\n"
            "- *Cursiva*: para títulos de obras, términos extranjeros, énfasis suave\n"
            "- `Código`: para nombres técnicos, variables, comandos\n"
        ),
    },
    {
        "name": "Escritura Académica",
        "description": "Convenciones de escritura académica: precisión, citación, metodología y tono formal.",
        "content": (
            "## Escritura Académica\n\n"
            "Sigue estas convenciones al redactar textos académicos:\n\n"
            "### Tono y registro\n"
            "- Usa tercera persona o primera persona plural (nosotros)\n"
            "- Evita expresiones coloquiales, metáforas informales\n"
            "- Sé preciso: prefiere \"el 73% de los participantes\" sobre \"la mayoría\"\n"
            "- Usa voz activa cuando sea posible: \"El estudio demuestra\" > \"Es demostrado por el estudio\"\n\n"
            "### Estructura típica\n"
            "1. **Introducción**: contexto, problema, objetivo, pregunta de investigación\n"
            "2. **Marco teórico**: conceptos clave, antecedentes\n"
            "3. **Metodología**: cómo se realizó el estudio\n"
            "4. **Resultados**: hallazgos objetivos\n"
            "5. **Discusión**: interpretación, implicaciones, limitaciones\n"
            "6. **Conclusiones**: síntesis y aportaciones\n\n"
            "### Citación\n"
            "- Cita toda afirmación que no sea de conocimiento común\n"
            "- Usa formato APA por defecto: (Autor, año)\n"
            "- Parafrasea en lugar de citar textualmente cuando sea posible\n"
            "- Incluye número de página en citas textuales: (Autor, año, p. XX)\n\n"
            "### Vocabulario\n"
            "- \"Cabe señalar\" > \"Es importante mencionar\"\n"
            "- \"Se evidencia\" > \"Se ve\"\n"
            "- \"Los hallazgos sugieren\" > \"Los resultados dicen\"\n"
            "- \"En este contexto\" > \"Aquí\"\n"
        ),
    },
    {
        "name": "Redacción Legal",
        "description": "Redacción jurídica: registro formal, citación de jurisprudencia y estructura de cláusulas.",
        "content": (
            "## Redacción Legal\n\n"
            "Aplica estas convenciones en textos jurídicos:\n\n"
            "### Registro y estilo\n"
            "- Usa lenguaje formal, preciso y técnicamente correcto\n"
            "- Evita ambigüedades: cada término debe tener un solo significado posible\n"
            "- Prefiere oraciones declarativas y construcciones lógicas\n"
            "- Define términos técnicos la primera vez que aparecen\n\n"
            "### Estructura de documentos legales\n"
            "- **Encabezado**: identificación de las partes, fecha, lugar\n"
            "- **Antecedentes/Considerandos**: contexto y hechos relevantes\n"
            "- **Cláusulas**: numeradas, con sub-incisos (a, b, c) si necesario\n"
            "- **Disposiciones finales**: jurisdicción, notificaciones, firmas\n\n"
            "### Citación de jurisprudencia\n"
            "- Formato: Tribunal, Número de expediente, Fecha, Nombre del caso\n"
            "- Ejemplo: SCJN, Amparo en Revisión 1234/2020, 15 de marzo de 2021\n"
            "- Indica el principio jurídico relevante de cada cita\n\n"
            "### Vocabulario jurídico\n"
            "- \"El que suscribe\" / \"Las partes contratantes\"\n"
            "- \"En virtud de\" / \"Con fundamento en\"\n"
            "- \"Queda estrictamente prohibido\" > \"No se permite\"\n"
            "- \"Surtirá efectos\" > \"Aplicará\"\n"
            "- Usa locuciones latinas cuando corresponda: ad hoc, ipso facto, prima facie\n"
        ),
    },
    {
        "name": "Narrativa Creativa",
        "description": "Técnicas de escritura creativa: voz narrativa, ritmo, imágenes y diálogo.",
        "content": (
            "## Narrativa Creativa\n\n"
            "Aplica estas técnicas al escribir o mejorar textos creativos:\n\n"
            "### Voz narrativa\n"
            "- Mantén consistencia en el punto de vista (1ra, 2da, 3ra persona)\n"
            "- Desarrolla una voz distintiva: vocabulario, ritmo, actitud\n"
            "- Muestra, no cuentes: \"Sus manos temblaban\" > \"Estaba nervioso\"\n\n"
            "### Ritmo y flujo\n"
            "- Alterna oraciones largas y cortas para crear dinamismo\n"
            "- Usa oraciones cortas para tensión y acción\n"
            "- Usa oraciones largas para descripción y reflexión\n"
            "- Los párrafos cortos aceleran el ritmo\n\n"
            "### Imágenes y sensaciones\n"
            "- Involucra los cinco sentidos, no solo la vista\n"
            "- Usa metáforas y símiles originales (evita clichés)\n"
            "- Sé específico: \"roble centenario\" > \"árbol grande\"\n"
            "- Elige verbos expresivos: \"arrastrarse\", \"deslizarse\" > \"moverse\"\n\n"
            "### Diálogo\n"
            "- Cada personaje debe sonar diferente\n"
            "- El diálogo debe avanzar la trama o revelar carácter\n"
            "- Evita adverbios en acotaciones: \"dijo\" basta en la mayoría de casos\n"
            "- Incluye acciones entre líneas de diálogo (beats)\n\n"
            "### Estructura narrativa\n"
            "- Gancho inicial que capture atención\n"
            "- Conflicto claro y escalamiento de tensión\n"
            "- Cada escena debe tener un propósito\n"
            "- Cierra con impacto: imagen, revelación o pregunta\n"
        ),
    },
    {
        "name": "Matemáticas y Fórmulas",
        "description": "Cómo insertar y formatear fórmulas matemáticas LaTeX correctamente.",
        "content": (
            "## Matemáticas y Fórmulas\n\n"
            "Usa estas convenciones para insertar contenido matemático:\n\n"
            "### Fórmulas en bloque (display)\n"
            "- Para ecuaciones importantes o destacadas\n"
            "- Usa la herramienta insert_formula con type=\"block\"\n"
            "- Ejemplo: $$\\int_{a}^{b} f(x) \\, dx = F(b) - F(a)$$\n\n"
            "### Fórmulas en línea (inline)\n"
            "- Para menciones dentro del texto\n"
            "- Usa la herramienta insert_formula con type=\"inline\"\n"
            "- Ejemplo: donde $x \\in \\mathbb{R}$\n\n"
            "### Sintaxis LaTeX común\n"
            "- Fracciones: \\frac{a}{b}\n"
            "- Potencias: x^{2}, x^{n+1}\n"
            "- Subíndices: x_{i}, a_{n}\n"
            "- Raíces: \\sqrt{x}, \\sqrt[3]{x}\n"
            "- Sumatorias: \\sum_{i=1}^{n} x_i\n"
            "- Integrales: \\int_{a}^{b} f(x) \\, dx\n"
            "- Límites: \\lim_{x \\to \\infty} f(x)\n"
            "- Matrices: \\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}\n"
            "- Conjuntos: \\mathbb{R}, \\mathbb{N}, \\mathbb{Z}\n"
            "- Operadores: \\leq, \\geq, \\neq, \\approx, \\pm\n\n"
            "### Buenas prácticas\n"
            "- Define variables antes de usarlas en ecuaciones\n"
            "- Numera ecuaciones importantes para referencia\n"
            "- Usa \\text{} dentro de fórmulas para texto explicativo\n"
            "- Alinea ecuaciones múltiples con el signo =\n"
        ),
    },
    {
        "name": "Edición y Revisión",
        "description": "Cómo editar y revisar texto: gramática, estilo, consistencia y claridad.",
        "content": (
            "## Edición y Revisión\n\n"
            "Aplica estos criterios al editar o revisar texto:\n\n"
            "### Claridad\n"
            "- Elimina palabras innecesarias: \"en el caso de que\" → \"si\"\n"
            "- Una idea por oración\n"
            "- Evita dobles negaciones\n"
            "- Prefiere verbos sobre sustantivos abstractos: \"decidir\" > \"tomar una decisión\"\n\n"
            "### Gramática y ortografía\n"
            "- Concordancia sujeto-verbo y género-número\n"
            "- Uso correcto de tildes (aún/aun, sólo/solo, éste/este)\n"
            "- Puntuación: comas en enumeraciones, punto y coma en enumeraciones complejas\n"
            "- Evita gerundios encadenados y abuso del \"mismo/a\" como pronombre\n\n"
            "### Estilo\n"
            "- Mantén consistencia de tono a lo largo del texto\n"
            "- Evita repeticiones: varía vocabulario sin sacrificar claridad\n"
            "- Mantén paralelismo en listas y enumeraciones\n"
            "- Verifica que las transiciones entre párrafos sean fluidas\n\n"
            "### Consistencia\n"
            "- Verifica que los nombres propios se escriban igual siempre\n"
            "- Mantén el mismo formato de fechas, números y unidades\n"
            "- Si usas abreviaturas, defínelas la primera vez\n"
            "- Verifica que los tiempos verbales sean consistentes\n\n"
            "### Proceso de revisión\n"
            "1. Primera pasada: estructura y organización\n"
            "2. Segunda pasada: claridad y estilo\n"
            "3. Tercera pasada: gramática y ortografía\n"
            "4. Lectura final: fluidez general\n"
        ),
    },
]

_AGENT_SKILL_MAP: dict[str, list[str]] = {
    "cientifico": ["Investigación Web", "Escritura Académica", "Matemáticas y Fórmulas", "Formato y Estructura"],
    "narrativo": ["Narrativa Creativa", "Edición y Revisión", "Formato y Estructura"],
    "legal": ["Redacción Legal", "Investigación Web", "Formato y Estructura"],
}


async def seed_skills() -> None:
    async with AsyncSessionLocal() as session:
        skill_map: dict[str, uuid.UUID] = {}

        for skill_data in _SKILLS_DATA:
            result = await session.execute(
                select(AgentSkill).where(AgentSkill.name == skill_data["name"])
            )
            existing = result.scalar_one_or_none()

            if existing:
                existing.description = skill_data["description"]
                existing.content = skill_data["content"]
                existing.is_builtin = True
                skill_map[existing.name] = existing.id
            else:
                skill_id = uuid.uuid4()
                skill = AgentSkill(
                    id=skill_id,
                    owner_id=None,
                    name=skill_data["name"],
                    description=skill_data["description"],
                    content=skill_data["content"],
                    is_builtin=True,
                )
                session.add(skill)
                skill_map[skill_data["name"]] = skill_id

        await session.flush()

        for agent_id, skill_names in _AGENT_SKILL_MAP.items():
            result = await session.execute(
                select(Agent).where(Agent.agent_id == agent_id)
            )
            agent = result.scalar_one_or_none()
            if agent is None:
                continue

            await session.execute(
                AgentSkillAssignment.__table__.delete().where(
                    AgentSkillAssignment.agent_id == agent.id
                )
            )

            for skill_name in skill_names:
                skill_id = skill_map.get(skill_name)
                if skill_id:
                    session.add(AgentSkillAssignment(agent_id=agent.id, skill_id=skill_id))

        await session.commit()
        print(f"Seeded {len(_SKILLS_DATA)} skills with agent assignments.")


if __name__ == "__main__":
    asyncio.run(seed_skills())
