from __future__ import annotations

import streamlit as st

from src.utils.constants import QUICK_ACTIONS


def render_chat_history(chat_history: list[dict]) -> None:
    for message in chat_history:
        with st.chat_message(message["role"]):
            st.markdown(message["content"])


def render_quick_actions() -> str | None:
    st.caption("Suggested refinement requests")
    columns = st.columns(len(QUICK_ACTIONS))
    selected_action = None
    for column, action in zip(columns, QUICK_ACTIONS):
        if column.button(action, use_container_width=True):
            selected_action = action
    return selected_action
