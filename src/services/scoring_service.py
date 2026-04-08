from __future__ import annotations

from typing import List


def flag_weaknesses(evidence: str, reasoning: str) -> List[str]:
    flags: List[str] = []
    weak_marketing_terms = ["marketing", "innovative", "smart", "seamless", "best-in-class"]
    hedging_terms = ["may", "might", "could", "suggests", "appears", "possibly"]

    if not evidence.strip():
        flags.append("missing_mapping")
    elif any(term in evidence.lower() for term in weak_marketing_terms) or len(evidence.split()) < 6:
        flags.append("weak_evidence")

    if not reasoning.strip():
        flags.append("vague_reasoning")
    elif any(term in reasoning.lower() for term in hedging_terms) or len(reasoning.split()) < 10:
        flags.append("vague_reasoning")

    return sorted(set(flags))


def score_suggestion(
    claim_element: str,
    proposed_evidence: str,
    proposed_reasoning: str,
    has_sources: bool,
    needs_more_evidence: bool,
) -> dict:
    relevance = 8 if any(token.lower() in proposed_evidence.lower() for token in claim_element.split()[:3]) else 6
    evidence_strength = min(10, 4 + len(proposed_evidence.split()) // 6 + (2 if has_sources else 0))
    reasoning_specificity = min(10, 4 + len(proposed_reasoning.split()) // 8)
    average = (evidence_strength + reasoning_specificity + relevance) / 3

    if needs_more_evidence:
        overall = "Low"
    elif average >= 8:
        overall = "High"
    elif average >= 6:
        overall = "Medium"
    else:
        overall = "Low"

    return {
        "evidence_strength": evidence_strength,
        "reasoning_specificity": reasoning_specificity,
        "relevance": relevance,
        "overall_confidence": overall,
        "needs_more_evidence": "Yes" if needs_more_evidence else "No",
    }
