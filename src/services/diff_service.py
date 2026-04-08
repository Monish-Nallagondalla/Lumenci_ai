from __future__ import annotations

import difflib


def build_diff(before: str, after: str) -> str:
    before_lines = before.splitlines() or [before]
    after_lines = after.splitlines() or [after]
    return "\n".join(
        difflib.unified_diff(
            before_lines,
            after_lines,
            fromfile="before",
            tofile="after",
            lineterm="",
        )
    )
