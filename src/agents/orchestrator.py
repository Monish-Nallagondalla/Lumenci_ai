from __future__ import annotations

from src.agents.evaluator_agent import EvaluatorAgent
from src.agents.reasoning_agent import ReasoningAgent
from src.agents.retrieval_agent import RetrievalAgent
from src.services.diff_service import build_diff
from src.services.legal_insight_service import (
    build_challenge_questions,
    build_citations,
    build_scrutiny_assessment,
)


class Orchestrator:
    def __init__(self) -> None:
        self.retrieval_agent = RetrievalAgent()
        self.reasoning_agent = ReasoningAgent()
        self.evaluator_agent = EvaluatorAgent()

    def refine_row(
        self,
        row: dict,
        request: str,
        supporting_docs: list[dict],
        api_key: str | None = None,
    ) -> dict:
        snippets = self.retrieval_agent.retrieve(row["claim_element"], supporting_docs)
        citations = build_citations(snippets, row["claim_element"])
        suggestion = self.reasoning_agent.refine(
            claim_element=row["claim_element"],
            existing_evidence=row["evidence"],
            existing_reasoning=row["reasoning"],
            request=request,
            retrieved_snippets=snippets,
            api_key=api_key,
        )
        scores = self.evaluator_agent.evaluate(
            claim_element=row["claim_element"],
            proposed_evidence=suggestion["proposed_evidence"],
            proposed_reasoning=suggestion["proposed_reasoning"],
            retrieved_snippets=snippets,
            needs_more_evidence=bool(suggestion["needs_more_evidence"]),
        )
        scrutiny = build_scrutiny_assessment(
            claim_element=row["claim_element"],
            proposed_evidence=suggestion["proposed_evidence"],
            proposed_reasoning=suggestion["proposed_reasoning"],
            scores=scores,
            citations=citations,
            needs_more_evidence=bool(suggestion["needs_more_evidence"]),
        )
        challenge_questions = build_challenge_questions(
            claim_element=row["claim_element"],
            citations=citations,
            scrutiny=scrutiny,
            needs_more_evidence=bool(suggestion["needs_more_evidence"]),
        )
        return {
            "row_id": row["row_id"],
            "request": request,
            "current_evidence": row["evidence"],
            "proposed_evidence": suggestion["proposed_evidence"],
            "current_reasoning": row["reasoning"],
            "proposed_reasoning": suggestion["proposed_reasoning"],
            "confidence": suggestion["confidence"],
            "short_explanation": suggestion["short_explanation"],
            "needs_more_evidence": suggestion["needs_more_evidence"],
            "suggested_follow_up": suggestion["suggested_follow_up"],
            "scores": scores,
            "sources": snippets,
            "citations": citations,
            "scrutiny": scrutiny,
            "challenge_questions": challenge_questions,
            "evidence_diff": build_diff(row["evidence"], suggestion["proposed_evidence"]),
            "reasoning_diff": build_diff(row["reasoning"], suggestion["proposed_reasoning"]),
            "mode": suggestion["mode"],
        }
