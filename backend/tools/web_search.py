from __future__ import annotations

import asyncio
import re
import time
from urllib.parse import quote_plus

import httpx

from .base import BaseTool

_last_search_time: float = 0.0
_MIN_INTERVAL: float = 2.0


class WebSearchTool(BaseTool):
    name = "web_search"
    description = "Searches the web for information. Use this when you need current events, facts not in the knowledge base, or general information."
    parameters = {
        "type": "object",
        "properties": {
            "query": {
                "type": "string",
                "description": "The search query to look up on the web.",
            },
            "max_results": {
                "type": "integer",
                "description": "Maximum number of search results to return.",
                "default": 5,
            },
        },
        "required": ["query"],
    }

    def __init__(self):
        super().__init__(self.name, self.description, self.parameters)

    async def execute(self, query: str, max_results: int = 5, **kwargs) -> str:
        global _last_search_time
        elapsed = time.time() - _last_search_time
        if elapsed < _MIN_INTERVAL:
            await asyncio.sleep(_MIN_INTERVAL - elapsed)
        _last_search_time = time.time()

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                encoded_query = quote_plus(query)
                url = f"https://html.duckduckgo.com/html/?q={encoded_query}"

                response = await client.get(url)
                response.raise_for_status()

                html = response.text
                results = self._parse_results(html, max_results)

                if not results:
                    return f"No search results found for: {query}"

                formatted = []
                for i, (title, snippet, link) in enumerate(results, 1):
                    formatted.append(
                        f"[{i}] {title}\n"
                        f"   {snippet}\n"
                        f"   Source: {link}"
                    )

                return "\n\n".join(formatted)

        except httpx.TimeoutException:
            return "Search timed out. Please try a more specific query."
        except httpx.HTTPStatusError as exc:
            return f"Search failed with status {exc.response.status_code}."
        except Exception as exc:
            return f"Search error: {exc}"

    def _parse_results(self, html: str, max_results: int) -> list[tuple[str, str, str]]:
        results = []

        result_pattern = re.compile(
            r'<a class="result__a" href="([^"]+)"[^>]*>([^<]+)</a>.*?'
            r'<a class="result__snippet"[^>]*>([^<]+)</a>',
            re.DOTALL | re.IGNORECASE,
        )

        for match in result_pattern.finditer(html):
            link = match.group(1).strip()
            title = self._clean_html(match.group(2).strip())
            snippet = self._clean_html(match.group(3).strip())

            if title and snippet and link.startswith("http"):
                results.append((title, snippet, link))

                if len(results) >= max_results:
                    break

        if not results:
            title_pattern = re.compile(r'<a class="result__a"[^>]*href="([^"]+)"[^>]*>([^<]+)</a>')
            snippet_pattern = re.compile(r'<a class="result__snippet"[^>]*>([^<]+)</a>')

            titles = [(m.group(1), self._clean_html(m.group(2))) for m in title_pattern.finditer(html)]
            snippets = [self._clean_html(m.group(1)) for m in snippet_pattern.finditer(html)]

            for i, ((link, title), snippet) in enumerate(zip(titles, snippets)):
                if title and snippet and link.startswith("http"):
                    results.append((title, snippet, link))
                    if len(results) >= max_results:
                        break

        return results

    def _clean_html(self, text: str) -> str:
        text = re.sub(r'<[^>]+>', '', text)
        text = re.sub(r'\s+', ' ', text)
        return text.strip()