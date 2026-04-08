from __future__ import annotations

from src.services.support_docs import retrieve_relevant_snippets


class RetrievalAgent:
    def retrieve(self, claim_element: str, supporting_docs: list[dict]) -> list[dict]:
        snippets = retrieve_relevant_snippets(claim_element, supporting_docs)
        return [
            {"source_name": snippet.source_name, "snippet": snippet.snippet, "score": snippet.score}
            for snippet in snippets
        ]
