from __future__ import annotations

from src.agents.orchestrator import Orchestrator
from src.services.scoring_service import flag_weaknesses


class RefinementService:
    def __init__(self) -> None:
        self.orchestrator = Orchestrator()

    def generate_suggestion(
        self,
        row: dict,
        request: str,
        supporting_docs: list[dict],
    ) -> dict:
        return self.orchestrator.refine_row(
            row=row,
            request=request,
            supporting_docs=supporting_docs,
        )

    def apply_suggestion(self, row: dict, suggestion: dict) -> dict:
        row["evidence"] = suggestion["proposed_evidence"]
        row["reasoning"] = suggestion["proposed_reasoning"]
        row["weakness_flags"] = flag_weaknesses(row["evidence"], row["reasoning"])
        row["status"] = "updated" if not row["weakness_flags"] else "flagged"
        return row
