from __future__ import annotations

import streamlit as st


def configure_page() -> None:
    st.set_page_config(
        page_title="ClaimCraft AI Claim Chart Workspace",
        page_icon=":page_facing_up:",
        layout="wide",
    )


def section_header(title: str, caption: str | None = None) -> None:
    st.subheader(title)
    if caption:
        st.caption(caption)
