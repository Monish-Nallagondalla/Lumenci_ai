from __future__ import annotations

from io import BytesIO
from pathlib import Path
from typing import Iterable, List

import docx
from PyPDF2 import PdfReader


def read_uploaded_text(file_name: str, data: bytes) -> str:
    suffix = Path(file_name).suffix.lower()
    if suffix in {".txt", ".md"}:
        return data.decode("utf-8", errors="ignore")
    if suffix == ".pdf":
        reader = PdfReader(BytesIO(data))
        return "\n".join(page.extract_text() or "" for page in reader.pages)
    if suffix == ".docx":
        document = docx.Document(BytesIO(data))
        return "\n".join(paragraph.text for paragraph in document.paragraphs)
    return data.decode("utf-8", errors="ignore")


def combine_text_blocks(blocks: Iterable[str]) -> str:
    cleaned: List[str] = [block.strip() for block in blocks if block and block.strip()]
    return "\n\n".join(cleaned)
