from __future__ import annotations

from typing import List


def build_citations(snippets: List[dict], claim_element: str) -> list[dict]:
    citations: list[dict] = []
    claim_terms = [token for token in claim_element.split() if len(token) > 4][:4]
    focus = ", ".join(claim_terms) if claim_terms else "claim terminology"

    for index, snippet in enumerate(snippets, start=1):
        citations.append(
            {
                "citation_id": f"C{index}",
                "source_name": snippet["source_name"],
                "snippet": snippet["snippet"],
                "score": snippet.get("score", 0),
                "use_reason": f"Supports the row by tying the evidence to {focus}.",
            }
        )
    return citations


def build_scrutiny_assessment(
    claim_element: str,
    proposed_evidence: str,
    proposed_reasoning: str,
    scores: dict,
    citations: list[dict],
    needs_more_evidence: bool,
) -> dict:
    scrutiny_score = round(
        (
            scores.get("evidence_strength", 0)
            + scores.get("reasoning_specificity", 0)
            + scores.get("relevance", 0)
        )
        / 3,
        1,
    )
    citation_coverage = 100 if citations else 0

    strengths: list[str] = []
    risks: list[str] = []
    next_steps: list[str] = []

    if citations:
        strengths.append("The suggestion is grounded in uploaded source material with traceable snippets.")
    else:
        risks.append("The suggestion does not yet cite a concrete supporting excerpt.")

    if scores.get("evidence_strength", 0) >= 8:
        strengths.append("Evidence strength improved to a relatively strong prototype-grade level.")
    else:
        risks.append("Evidence strength remains moderate and could be challenged for specificity.")

    if scores.get("reasoning_specificity", 0) >= 8:
        strengths.append("Reasoning is specific enough to explain how the mapped evidence connects to the claim.")
    else:
        risks.append("Reasoning may still be attacked as conclusory or too high-level.")

    if needs_more_evidence:
        risks.append("The current record is not sufficient for a confident claim-to-product mapping.")
        next_steps.append("Add another technical document, implementation guide, teardown, or product URL.")

    if "marketing" in proposed_evidence.lower():
        risks.append("The evidence still includes marketing-style language rather than technical disclosure.")

    if not next_steps:
        next_steps.append("Keep refining with narrower prompts if the row still feels vulnerable under scrutiny.")

    if needs_more_evidence or scrutiny_score < 6:
        risk_level = "High"
    elif scrutiny_score < 8:
        risk_level = "Medium"
    else:
        risk_level = "Low"

    return {
        "scrutiny_score": scrutiny_score,
        "risk_level": risk_level,
        "citation_coverage": citation_coverage,
        "strengths": strengths,
        "risks": risks,
        "next_steps": next_steps,
        "summary": (
            f"Scrutiny score {scrutiny_score}/10 with {risk_level.lower()} residual risk."
        ),
    }


def build_challenge_questions(
    claim_element: str,
    citations: list[dict],
    scrutiny: dict,
    needs_more_evidence: bool,
) -> list[dict]:
    questions: list[dict] = [
        {
            "question": f"What specific product behavior maps to the claim element: '{claim_element}'?",
            "why_it_matters": "Opposing counsel may argue that the mapping is abstract rather than element-specific.",
            "how_to_prepare": "Be ready to point to the cited technical snippet and explain the element-to-feature linkage in one sentence.",
            "severity": "High" if needs_more_evidence else "Medium",
        }
    ]

    if not citations:
        questions.append(
            {
                "question": "Where is the technical source that supports this statement?",
                "why_it_matters": "Unsupported assertions are easy to challenge in legal review.",
                "how_to_prepare": "Add a spec, manual, teardown, or URL that contains precise technical wording.",
                "severity": "High",
            }
        )
    else:
        questions.append(
            {
                "question": "Why is this cited snippet sufficient to support the claim element?",
                "why_it_matters": "A court-facing audience may ask whether the excerpt shows the feature directly or only implies it.",
                "how_to_prepare": "Explain whether the snippet is direct evidence, strongly inferential evidence, or supporting context.",
                "severity": "Medium",
            }
        )

    if scrutiny.get("risk_level") in {"High", "Medium"}:
        questions.append(
            {
                "question": "Could the reasoning be viewed as conclusory rather than analytically grounded?",
                "why_it_matters": "Reasoning that skips the logic bridge from source text to claim language can look weak.",
                "how_to_prepare": "Tighten the explanation so it explicitly connects the cited source, the product feature, and the claim term.",
                "severity": scrutiny.get("risk_level", "Medium"),
            }
        )

    return questions
