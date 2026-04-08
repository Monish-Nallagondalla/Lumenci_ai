from __future__ import annotations

from src.services.chart_parser import load_claim_chart_from_csv
from src.services.scoring_service import flag_weaknesses


class ParserAgent:
    def parse_claim_chart(self, file_bytes: bytes) -> list[dict]:
        rows = load_claim_chart_from_csv(file_bytes)
        for row in rows:
            row["weakness_flags"] = flag_weaknesses(row["evidence"], row["reasoning"])
            if row["weakness_flags"]:
                row["status"] = "flagged"
        return rows
