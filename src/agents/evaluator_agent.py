from __future__ import annotations

from src.services.scoring_service import score_suggestion


class EvaluatorAgent:
    def evaluate(
        self,
        claim_element: str,
        proposed_evidence: str,
        proposed_reasoning: str,
        retrieved_snippets: list[dict],
        needs_more_evidence: bool,
    ) -> dict:
        return score_suggestion(
            claim_element=claim_element,
            proposed_evidence=proposed_evidence,
            proposed_reasoning=proposed_reasoning,
            has_sources=bool(retrieved_snippets),
            needs_more_evidence=needs_more_evidence,
        )
