from __future__ import annotations

from datetime import datetime


class VersioningAgent:
    def build_entry(
        self,
        version_id: int,
        row_id: int,
        user_prompt: str,
        decision: str,
        old_evidence: str,
        new_evidence: str,
        old_reasoning: str,
        new_reasoning: str,
        confidence: str,
        scores: dict,
        summary: str,
    ) -> dict:
        return {
            "version_id": version_id,
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "row_id": row_id,
            "user_prompt": user_prompt,
            "decision": decision,
            "old_evidence": old_evidence,
            "new_evidence": new_evidence,
            "old_reasoning": old_reasoning,
            "new_reasoning": new_reasoning,
            "confidence": confidence,
            "scores": scores,
            "summary": summary,
        }
