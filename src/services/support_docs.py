from __future__ import annotations

from dataclasses import dataclass
from typing import List


@dataclass
class RetrievedSnippet:
    source_name: str
    snippet: str
    score: int


def retrieve_relevant_snippets(claim_element: str, supporting_docs: List[dict], limit: int = 3) -> List[RetrievedSnippet]:
    claim_terms = {token.lower() for token in claim_element.split() if len(token) > 3}
    candidates: List[RetrievedSnippet] = []
    for doc in supporting_docs:
        text = doc.get("text", "")
        for snippet in [part.strip() for part in text.splitlines() if part.strip()]:
            snippet_terms = snippet.lower()
            score = sum(1 for token in claim_terms if token in snippet_terms)
            if score:
                candidates.append(
                    RetrievedSnippet(
                        source_name=doc["name"],
                        snippet=snippet,
                        score=score,
                    )
                )
    candidates.sort(key=lambda item: item.score, reverse=True)
    return candidates[:limit]
