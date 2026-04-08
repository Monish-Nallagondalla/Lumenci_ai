from __future__ import annotations

import streamlit as st

from src.services.chart_parser import rows_to_dataframe
from src.utils.constants import WEAK_FLAG_LABELS


def render_chart(rows: list[dict], selected_row_id: int | None) -> int | None:
    if not rows:
        st.info("Upload a claim chart CSV or load the sample data to begin.")
        return selected_row_id

    display_df = rows_to_dataframe(rows)
    display_df["Weakness Flags"] = display_df["Weakness Flags"].apply(
        lambda value: ", ".join(WEAK_FLAG_LABELS.get(flag, flag) for flag in value.split(", ") if flag) if value else ""
    )
    st.dataframe(display_df, use_container_width=True, hide_index=True)

    row_ids = [row["row_id"] for row in rows]
    default_index = row_ids.index(selected_row_id) if selected_row_id in row_ids else 0
    return st.selectbox("Select a row to refine", row_ids, index=default_index)


def render_row_details(row: dict) -> None:
    st.markdown(f"**Claim Element**\n\n{row['claim_element']}")
    col1, col2 = st.columns(2)
    with col1:
        st.markdown("**Evidence**")
        st.write(row["evidence"] or "_No evidence mapped yet._")
    with col2:
        st.markdown("**Reasoning**")
        st.write(row["reasoning"] or "_No reasoning mapped yet._")

    if row.get("weakness_flags"):
        st.warning(
            "Weakness flags: "
            + ", ".join(WEAK_FLAG_LABELS.get(flag, flag) for flag in row["weakness_flags"])
        )
