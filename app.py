from __future__ import annotations

from pathlib import Path

import streamlit as st

from src.agents.parser_agent import ParserAgent
from src.agents.versioning_agent import VersioningAgent
from src.services.export_service import build_version_summary, export_chart_csv
from src.services.refinement_service import RefinementService
from src.ui.chart_view import render_chart, render_row_details
from src.ui.chat_panel import render_chat_history, render_quick_actions
from src.ui.layout import configure_page, section_header
from src.ui.suggestion_card import render_suggestion_card
from src.ui.version_history import render_version_history
from src.utils.file_utils import combine_text_blocks, read_uploaded_text
from src.utils.session_state import (
    add_chat_message,
    find_row,
    initialize_session_state,
    next_version_id,
    reset_workflow_state,
)


configure_page()
initialize_session_state(st.session_state)

parser_agent = ParserAgent()
refinement_service = RefinementService()
versioning_agent = VersioningAgent()


def load_sample_data() -> None:
    base_path = Path(__file__).parent / "data"
    claim_chart_bytes = (base_path / "sample_claim_chart.csv").read_bytes()
    support_text = (base_path / "sample_supporting_doc.txt").read_text(encoding="utf-8")
    reset_workflow_state(st.session_state)
    st.session_state["chart_rows"] = parser_agent.parse_claim_chart(claim_chart_bytes)
    st.session_state["supporting_docs"] = [{"name": "sample_supporting_doc.txt", "text": support_text}]
    st.session_state["supporting_text"] = support_text
    st.session_state["selected_row_id"] = 1
    st.session_state["loaded_sample"] = True
    add_chat_message(
        st.session_state,
        "assistant",
        "Sample thermostat claim chart loaded. Select a row and ask for a refinement.",
    )


def ingest_uploads(claim_chart_file, support_files) -> None:
    reset_workflow_state(st.session_state)
    st.session_state["chart_rows"] = parser_agent.parse_claim_chart(claim_chart_file.getvalue())
    docs = []
    text_blocks = []
    for support_file in support_files:
        text = read_uploaded_text(support_file.name, support_file.getvalue())
        docs.append({"name": support_file.name, "text": text})
        text_blocks.append(f"[{support_file.name}]\n{text}")
    st.session_state["supporting_docs"] = docs
    st.session_state["supporting_text"] = combine_text_blocks(text_blocks)
    st.session_state["selected_row_id"] = 1 if st.session_state["chart_rows"] else None
    add_chat_message(
        st.session_state,
        "assistant",
        "Claim chart uploaded and normalized. I also indexed the supporting material for row-level refinement.",
    )


def log_decision(row: dict, suggestion: dict, decision: str, summary: str, old_state: dict, new_state: dict) -> None:
    version = versioning_agent.build_entry(
        version_id=next_version_id(st.session_state),
        row_id=row["row_id"],
        user_prompt=suggestion["request"],
        decision=decision,
        old_evidence=old_state["evidence"],
        new_evidence=new_state["evidence"],
        old_reasoning=old_state["reasoning"],
        new_reasoning=new_state["reasoning"],
        confidence=suggestion["confidence"],
        scores=suggestion["scores"],
        summary=summary,
    )
    st.session_state["version_history"].append(version)


def undo_last_change() -> None:
    last_change = st.session_state.get("last_accepted_change")
    if not last_change:
        st.warning("No accepted change is available to undo.")
        return
    row = find_row(st.session_state, last_change["row_id"])
    if not row:
        st.error("The row for the last accepted change could not be found.")
        return

    current_state = {"evidence": row["evidence"], "reasoning": row["reasoning"]}
    row["evidence"] = last_change["old_evidence"]
    row["reasoning"] = last_change["old_reasoning"]
    row["status"] = "updated" if row["status"] == "flagged" else "original"
    row["weakness_flags"] = last_change["old_weakness_flags"]

    version = versioning_agent.build_entry(
        version_id=next_version_id(st.session_state),
        row_id=row["row_id"],
        user_prompt="Undo last accepted change",
        decision="modified",
        old_evidence=current_state["evidence"],
        new_evidence=row["evidence"],
        old_reasoning=current_state["reasoning"],
        new_reasoning=row["reasoning"],
        confidence="Manual",
        scores={"evidence_strength": 0, "reasoning_specificity": 0, "relevance": 0},
        summary="User restored the previous row state.",
    )
    st.session_state["version_history"].append(version)
    st.session_state["last_accepted_change"] = None
    st.success("Last accepted change has been undone.")


section_header(
    "ClaimCraft AI Claim Chart Workspace",
    "Human-in-the-loop prototype for claim chart review, refinement, versioning, and export.",
)

with st.container(border=True):
    st.markdown("### Upload Workspace")
    upload_col1, upload_col2, upload_col3 = st.columns([1.5, 1.5, 1])
    with upload_col1:
        claim_chart_file = st.file_uploader("Upload claim chart CSV", type=["csv"])
    with upload_col2:
        support_files = st.file_uploader(
            "Upload supporting docs",
            type=["txt", "pdf", "docx"],
            accept_multiple_files=True,
        )
    with upload_col3:
        if st.button("Load sample data", use_container_width=True):
            load_sample_data()
        if st.button("Process uploads", type="primary", use_container_width=True):
            if claim_chart_file is None:
                st.error("Upload a claim chart CSV first.")
            else:
                ingest_uploads(claim_chart_file, support_files or [])

left_col, right_col = st.columns([1.3, 1], gap="large")

with left_col:
    section_header("Claim Chart")
    selected_row_id = render_chart(st.session_state["chart_rows"], st.session_state["selected_row_id"])
    st.session_state["selected_row_id"] = selected_row_id
    selected_row = find_row(st.session_state, selected_row_id) if selected_row_id else None
    if selected_row:
        render_row_details(selected_row)
        if st.button("Undo last accepted change", use_container_width=True):
            undo_last_change()

with right_col:
    section_header("Refinement Chat")
    render_chat_history(st.session_state["chat_history"])
    quick_action = render_quick_actions()
    user_prompt = st.chat_input("Ask the AI to refine the selected row")

    effective_prompt = quick_action or user_prompt
    selected_row = find_row(st.session_state, st.session_state["selected_row_id"]) if st.session_state["selected_row_id"] else None

    if effective_prompt and selected_row:
        add_chat_message(st.session_state, "user", effective_prompt)
        suggestion = refinement_service.generate_suggestion(
            row=selected_row,
            request=effective_prompt,
            supporting_docs=st.session_state["supporting_docs"],
        )
        st.session_state["current_suggestion"] = suggestion
        add_chat_message(
            st.session_state,
            "assistant",
            f"Prepared a refinement suggestion for row {selected_row['row_id']} with {suggestion['confidence']} confidence.",
        )
        st.rerun()

    suggestion = st.session_state.get("current_suggestion")
    if suggestion:
        accept, reject, modify = render_suggestion_card(suggestion)
        row = find_row(st.session_state, suggestion["row_id"])

        if accept and row:
            old_state = {
                "evidence": row["evidence"],
                "reasoning": row["reasoning"],
                "weakness_flags": list(row.get("weakness_flags", [])),
            }
            refinement_service.apply_suggestion(row, suggestion)
            new_state = {"evidence": row["evidence"], "reasoning": row["reasoning"]}
            st.session_state["last_accepted_change"] = {
                "row_id": row["row_id"],
                "old_evidence": old_state["evidence"],
                "old_reasoning": old_state["reasoning"],
                "old_weakness_flags": old_state["weakness_flags"],
            }
            log_decision(
                row=row,
                suggestion=suggestion,
                decision="accepted",
                summary=suggestion["short_explanation"],
                old_state=old_state,
                new_state=new_state,
            )
            st.session_state["current_suggestion"] = None
            st.success("Suggestion accepted and applied to the chart.")
            st.rerun()

        if reject and row:
            current_state = {"evidence": row["evidence"], "reasoning": row["reasoning"]}
            log_decision(
                row=row,
                suggestion=suggestion,
                decision="rejected",
                summary="User rejected the refinement suggestion.",
                old_state=current_state,
                new_state=current_state,
            )
            st.session_state["current_suggestion"] = None
            st.info("Suggestion rejected.")
            st.rerun()

        if modify:
            add_chat_message(
                st.session_state,
                "assistant",
                "Send a follow-up instruction in chat and I’ll generate a revised suggestion for this row.",
            )
            st.rerun()

    section_header("Version History")
    render_version_history(st.session_state["version_history"])

st.divider()
section_header("Export")
export_col1, export_col2 = st.columns(2)
with export_col1:
    csv_payload = export_chart_csv(st.session_state["chart_rows"]) if st.session_state["chart_rows"] else ""
    st.download_button(
        "Download refined claim chart CSV",
        data=csv_payload,
        file_name="refined_claim_chart.csv",
        mime="text/csv",
        use_container_width=True,
        disabled=not bool(st.session_state["chart_rows"]),
    )
with export_col2:
    summary_payload = build_version_summary(
        st.session_state["version_history"],
        st.session_state["chart_rows"],
    )
    st.download_button(
        "Download version summary report",
        data=summary_payload,
        file_name="claim_chart_version_summary.md",
        mime="text/markdown",
        use_container_width=True,
        disabled=not bool(st.session_state["chart_rows"]),
    )
