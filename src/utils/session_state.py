from __future__ import annotations

import copy
from typing import Any, Dict


DEFAULT_STATE: Dict[str, Any] = {
    "chart_rows": [],
    "selected_row_id": None,
    "chat_history": [],
    "current_suggestion": None,
    "version_history": [],
    "supporting_docs": [],
    "supporting_text": "",
    "change_counter": 0,
    "last_accepted_change": None,
    "loaded_sample": False,
}


def initialize_session_state(session_state) -> None:
    for key, value in DEFAULT_STATE.items():
        if key not in session_state:
            session_state[key] = copy.deepcopy(value)


def reset_workflow_state(session_state) -> None:
    preserved = {"loaded_sample": session_state.get("loaded_sample", False)}
    for key, value in DEFAULT_STATE.items():
        session_state[key] = copy.deepcopy(value)
    session_state.update(preserved)


def next_version_id(session_state) -> int:
    session_state["change_counter"] += 1
    return session_state["change_counter"]


def add_chat_message(session_state, role: str, content: str) -> None:
    session_state["chat_history"].append({"role": role, "content": content})


def find_row(session_state, row_id: int) -> dict | None:
    for row in session_state["chart_rows"]:
        if row["row_id"] == row_id:
            return row
    return None
