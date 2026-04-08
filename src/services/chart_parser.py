from __future__ import annotations

from io import BytesIO
from typing import List, Optional

import pandas as pd

from src.utils.constants import CLAIM_ELEMENT_COL, EVIDENCE_COL, REASONING_COL


CLAIM_ELEMENT_ALIASES = (
    CLAIM_ELEMENT_COL,
    "Claim Element",
    "Claim Limitation",
    "Patent Element",
)
EVIDENCE_ALIASES = (
    EVIDENCE_COL,
    "Evidence",
    "Accused Product Feature",
    "Mapped Evidence",
    "Product Feature / Evidence",
)
REASONING_ALIASES = (
    REASONING_COL,
    "Reasoning",
    "Analysis",
    "Analyst Notes",
    "Notes",
)


def load_claim_chart_from_csv(file_bytes: bytes) -> List[dict]:
    dataframe = pd.read_csv(BytesIO(file_bytes))
    claim_element_column = resolve_column_name(dataframe, CLAIM_ELEMENT_ALIASES)
    if not claim_element_column:
        raise ValueError(
            "Claim chart CSV must include a claim-element column such as "
            f"'{CLAIM_ELEMENT_COL}' or 'Claim Element'."
        )

    evidence_column = resolve_column_name(dataframe, EVIDENCE_ALIASES)
    reasoning_column = resolve_column_name(dataframe, REASONING_ALIASES)
    return normalize_claim_chart(
        dataframe,
        claim_element_column=claim_element_column,
        evidence_column=evidence_column,
        reasoning_column=reasoning_column,
    )


def normalize_claim_chart(
    dataframe: pd.DataFrame,
    claim_element_column: str,
    evidence_column: Optional[str] = None,
    reasoning_column: Optional[str] = None,
) -> List[dict]:
    normalized_rows: List[dict] = []
    for index, row in dataframe.fillna("").iterrows():
        normalized_rows.append(
            {
                "row_id": index + 1,
                "claim_element": str(row[claim_element_column]).strip(),
                "evidence": read_optional_cell(row, evidence_column),
                "reasoning": read_optional_cell(row, reasoning_column),
                "status": "original",
                "weakness_flags": [],
            }
        )
    return normalized_rows


def normalize_column_name(value: str) -> str:
    return "".join(character.lower() for character in str(value) if character.isalnum())


def resolve_column_name(dataframe: pd.DataFrame, aliases: tuple[str, ...]) -> Optional[str]:
    normalized_lookup = {
        normalize_column_name(column): column for column in dataframe.columns
    }
    for alias in aliases:
        resolved = normalized_lookup.get(normalize_column_name(alias))
        if resolved:
            return resolved
    return None


def read_optional_cell(row: pd.Series, column_name: Optional[str]) -> str:
    if not column_name:
        return ""
    return str(row[column_name]).strip()


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
