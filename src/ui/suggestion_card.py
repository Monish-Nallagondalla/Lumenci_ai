from __future__ import annotations

import streamlit as st


def render_suggestion_card(suggestion: dict) -> tuple[bool, bool, bool]:
    st.markdown("### Suggestion Review")
    st.caption(f"Row {suggestion['row_id']} | Confidence: {suggestion['confidence']} | Engine: {suggestion['mode']}")

    col1, col2 = st.columns(2)
    with col1:
        st.markdown("**Current Evidence**")
        st.write(suggestion["current_evidence"] or "_Empty_")
        st.markdown("**Proposed Evidence**")
        st.write(suggestion["proposed_evidence"] or "_Empty_")
    with col2:
        st.markdown("**Current Reasoning**")
        st.write(suggestion["current_reasoning"] or "_Empty_")
        st.markdown("**Proposed Reasoning**")
        st.write(suggestion["proposed_reasoning"] or "_Empty_")

    st.markdown("**Rationale**")
    st.write(suggestion["short_explanation"])

    st.markdown("**Evaluator Scores**")
    scores = suggestion["scores"]
    score_cols = st.columns(4)
    score_cols[0].metric("Evidence", scores["evidence_strength"])
    score_cols[1].metric("Reasoning", scores["reasoning_specificity"])
    score_cols[2].metric("Relevance", scores["relevance"])
    score_cols[3].metric("Overall", scores["overall_confidence"])

    if suggestion["sources"]:
        st.markdown("**Source Basis**")
        for source in suggestion["sources"]:
            st.info(f"{source['source_name']}: {source['snippet']}")
    else:
        st.warning("No strong source snippet was found in the uploaded support materials.")

    if suggestion["needs_more_evidence"]:
        st.error(suggestion["suggested_follow_up"])
    else:
        st.caption(suggestion["suggested_follow_up"])

    with st.expander("Before vs After Diff"):
        st.markdown("**Evidence Diff**")
        st.code(suggestion["evidence_diff"] or "No changes detected.", language="diff")
        st.markdown("**Reasoning Diff**")
        st.code(suggestion["reasoning_diff"] or "No changes detected.", language="diff")

    actions = st.columns(3)
    accept = actions[0].button("Accept suggestion", type="primary", use_container_width=True)
    reject = actions[1].button("Reject suggestion", use_container_width=True)
    modify = actions[2].button("Modify with follow-up prompt", use_container_width=True)
    return accept, reject, modify
