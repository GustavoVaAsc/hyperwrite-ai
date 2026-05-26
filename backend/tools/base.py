from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any


class BaseTool(ABC):
    def __init__(self, name: str, description: str, parameters: dict[str, Any]):
        self.name = name
        self.description = description
        self.parameters = parameters

    @abstractmethod
    async def execute(self, **kwargs) -> str:
        pass

    def to_schema(self) -> dict[str, Any]:
        return {
            "type": "function",
            "function": {
                "name": self.name,
                "description": self.description,
                "parameters": self.parameters,
            },
        }