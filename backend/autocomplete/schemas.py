from __future__ import annotations

from pydantic import BaseModel


class AutocompleteRequest(BaseModel):
    context: str
    max_tokens: int = 50
    document_content: str | None = None


class AutocompleteSuggestion(BaseModel):
    text: str
    confidence: float = 1.0