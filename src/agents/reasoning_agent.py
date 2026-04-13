from __future__ import annotations

from textwrap import shorten

from src.llm.groq_client import GroqRefinementClient
from src.llm.prompts import build_refinement_user_prompt


class ReasoningAgent:
    def __init__(self) -> None:
        self.client = GroqRefinementClient()

    def refine(
        self,
        claim_element: str,
        existing_evidence: str,
        existing_reasoning: str,
        request: str,
        retrieved_snippets: list[dict],
        api_key: str | None = None,
    ) -> dict:
        support_context = "\n".join(
            f"[{item['source_name']}] {item['snippet']}" for item in retrieved_snippets
        )
        if self.client.can_infer(api_key):
            prompt = build_refinement_user_prompt(
                claim_element=claim_element,
                evidence=existing_evidence,
                reasoning=existing_reasoning,
                request=request,
                support_context=support_context,
            )
            try:
                result = self.client.generate_refinement(prompt, api_key=api_key)
                result["mode"] = "groq"
                return result
            except Exception:
                pass

        proposed_evidence = existing_evidence
        if retrieved_snippets:
            evidence_lines = [f"{item['snippet']} ({item['source_name']})" for item in retrieved_snippets]
            proposed_evidence = " ".join(evidence_lines[:2])
        elif not existing_evidence:
            proposed_evidence = "No grounded evidence found in the uploaded material."

        if "reason" in request.lower():
            proposed_reasoning = (
                "The supporting material ties the selected product behavior to the claim element by showing that "
                f"{shorten(proposed_evidence, width=180, placeholder='...')}"
            )
        elif "feature" in request.lower():
            proposed_reasoning = (
                "The revision adds a missing mapped feature by linking the claim language to the closest available "
                "technical description in the support materials."
            )
        else:
            proposed_reasoning = (
                "The revision strengthens the chart entry using the most relevant uploaded support and removes vague wording."
            )

        needs_more_evidence = not bool(retrieved_snippets)
        return {
            "proposed_evidence": proposed_evidence,
            "proposed_reasoning": proposed_reasoning,
            "confidence": "Medium" if retrieved_snippets else "Low",
            "short_explanation": (
                "Matched the row against uploaded support docs and drafted a more specific update."
                if retrieved_snippets
                else "The uploaded materials do not provide enough technical detail for a strong refinement."
            ),
            "needs_more_evidence": needs_more_evidence,
            "suggested_follow_up": (
                "Upload another technical document or provide a product URL with implementation details."
                if needs_more_evidence
                else "If needed, ask for a narrower rewrite focused on claim terminology."
            ),
            "mode": "fallback",
        }
