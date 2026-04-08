from __future__ import annotations

from io import BytesIO
from typing import List

import pandas as pd

from src.utils.constants import CLAIM_ELEMENT_COL, EVIDENCE_COL, REASONING_COL


REQUIRED_COLUMNS = [CLAIM_ELEMENT_COL, EVIDENCE_COL, REASONING_COL]


def load_claim_chart_from_csv(file_bytes: bytes) -> List[dict]:
    dataframe = pd.read_csv(BytesIO(file_bytes))
    missing = [column for column in REQUIRED_COLUMNS if column not in dataframe.columns]
    if missing:
        raise ValueError(
            "Claim chart CSV is missing required columns: " + ", ".join(missing)
        )
    return normalize_claim_chart(dataframe)


def normalize_claim_chart(dataframe: pd.DataFrame) -> List[dict]:
    normalized_rows: List[dict] = []
    for index, row in dataframe.fillna("").iterrows():
        normalized_rows.append(
            {
                "row_id": index + 1,
                "claim_element": str(row[CLAIM_ELEMENT_COL]).strip(),
                "evidence": str(row[EVIDENCE_COL]).strip(),
                "reasoning": str(row[REASONING_COL]).strip(),
                "status": "original",
                "weakness_flags": [],
            }
        )
    return normalized_rows


def rows_to_dataframe(rows: List[dict]) -> pd.DataFrame:
    return pd.DataFrame(
        [
            {
                "Row ID": row["row_id"],
                CLAIM_ELEMENT_COL: row["claim_element"],
                EVIDENCE_COL: row["evidence"],
                REASONING_COL: row["reasoning"],
                "Status": row["status"],
                "Weakness Flags": ", ".join(row.get("weakness_flags", [])),
            }
            for row in rows
        ]
    )
