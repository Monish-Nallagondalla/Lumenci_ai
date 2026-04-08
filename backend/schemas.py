from __future__ import annotations

from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field, HttpUrl


class ClaimChartRowModel(BaseModel):
    row_id: int
    claim_element: str
    evidence: str = ""
    reasoning: str = ""
    status: str = "original"
    weakness_flags: List[str] = Field(default_factory=list)


class SupportingDocModel(BaseModel):
    name: str
    text: str
    source_type: Literal["upload", "url", "sample"] = "upload"
    url: Optional[str] = None


class WorkspaceResponse(BaseModel):
    chart_rows: List[ClaimChartRowModel]
    supporting_docs: List[SupportingDocModel]
    assistant_message: str


class RefineRequest(BaseModel):
    row: ClaimChartRowModel
    request: str
    supporting_docs: List[SupportingDocModel] = Field(default_factory=list)


class UrlIngestRequest(BaseModel):
    url: HttpUrl


class VersionHistoryEntryModel(BaseModel):
    version_id: int
    chart_version: int = 1
    timestamp: str
    row_id: int
    user_prompt: str
    decision: str
    old_evidence: str
    new_evidence: str
    old_reasoning: str
    new_reasoning: str
    confidence: str
    scores: Dict[str, Any]
    summary: str
    citations: List[Dict] = Field(default_factory=list)
    scrutiny: Dict[str, Any] = Field(default_factory=dict)
    challenge_questions: List[Dict] = Field(default_factory=list)
    version_metrics: Dict[str, Any] = Field(default_factory=dict)


class ExportChartRequest(BaseModel):
    rows: List[ClaimChartRowModel]
    title: str = "Lumenci Refined Claim Chart"


class ExportSummaryRequest(BaseModel):
    version_history: List[VersionHistoryEntryModel]
    chart_rows: List[ClaimChartRowModel]
    title: str = "Lumenci Version Summary Report"
