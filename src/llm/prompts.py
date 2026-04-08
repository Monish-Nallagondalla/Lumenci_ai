REFINEMENT_SYSTEM_PROMPT = """
You help patent analysts refine claim charts for infringement analysis.
Be specific, legally cautious, and grounded in the provided source material.
Do not invent evidence. If the support is insufficient, say so clearly and ask for more technical documentation or a URL.
Return strict JSON with keys:
proposed_evidence, proposed_reasoning, confidence, short_explanation, needs_more_evidence, suggested_follow_up.
"""


def build_refinement_user_prompt(
    claim_element: str,
    evidence: str,
    reasoning: str,
    request: str,
    support_context: str,
) -> str:
    return f"""
Selected claim element:
{claim_element}

Existing evidence:
{evidence or '[empty]'}

Existing reasoning:
{reasoning or '[empty]'}

User refinement request:
{request}

Support document excerpts:
{support_context or '[none provided]'}
""".strip()
