from __future__ import annotations

import json
import os
import re
from typing import Any, Dict

from dotenv import load_dotenv
from langchain_core.messages import HumanMessage, SystemMessage

from src.llm.prompts import REFINEMENT_SYSTEM_PROMPT


class GroqRefinementClient:
    def __init__(self) -> None:
        load_dotenv()
        self.api_key = os.getenv("GROQ_API_KEY")
        self.model_name = os.getenv("MODEL_NAME", "llama-3.3-70b-versatile")
        self._llm = None

        if self.api_key:
            self._llm = self._build_llm(self.api_key)

    def _build_llm(self, api_key: str):
        from langchain_groq import ChatGroq

        return ChatGroq(
            groq_api_key=api_key,
            model_name=self.model_name,
            temperature=0.2,
        )

    @property
    def available(self) -> bool:
        return self._llm is not None

    def can_infer(self, api_key: str | None = None) -> bool:
        return bool((api_key or "").strip() or self._llm)

    def generate_refinement(self, user_prompt: str, api_key: str | None = None) -> Dict[str, Any]:
        override_key = (api_key or "").strip()
        llm = self._llm
        if override_key:
            llm = self._build_llm(override_key)

        if not llm:
            raise RuntimeError("Groq client is not configured.")

        response = llm.invoke(
            [
                SystemMessage(content=REFINEMENT_SYSTEM_PROMPT),
                HumanMessage(content=user_prompt),
            ]
        )
        content = response.content if isinstance(response.content, str) else json.dumps(response.content)
        return _safe_json_loads(content)


def _safe_json_loads(content: str) -> Dict[str, Any]:
    try:
        return json.loads(content)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", content, re.DOTALL)
        if not match:
            raise
        return json.loads(match.group(0))
