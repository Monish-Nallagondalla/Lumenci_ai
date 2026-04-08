from __future__ import annotations

import streamlit as st


def render_version_history(version_history: list[dict]) -> None:
    st.markdown("### Version History")
    if not version_history:
        st.caption("No changes recorded yet.")
        return

    for version in reversed(version_history):
        with st.container(border=True):
            st.markdown(
                f"**Version {version['version_id']}** | Row {version['row_id']} | {version['decision'].title()}"
            )
            st.caption(f"{version['timestamp']} | Confidence: {version['confidence']}")
            st.write(version["summary"])
            st.write(f"Prompt: {version['user_prompt']}")
