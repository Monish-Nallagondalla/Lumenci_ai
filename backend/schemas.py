from __future__ import annotations

from typing import Literal, Optional

from pydantic import BaseModel, Field, HttpUrl


class ClaimChartRowModel(BaseModel):
    row_id: int
    claim_element: str
    evidence: str = ""
    reasoning: str = ""
    status: str = "original"
    weakness_flags: list[str] = Field(default_factory=list)


class SupportingDocModel(BaseModel):
    name: str
    text: str
    source_type: Literal["upload", "url", "sample"] = "upload"
    url: Optional[str] = None


class WorkspaceResponse(BaseModel):
    chart_rows: list[ClaimChartRowModel]
    supporting_docs: list[SupportingDocModel]
    assistant_message: str


class RefineRequest(BaseModel):
    row: ClaimChartRowModel
    request: str
    supporting_docs: list[SupportingDocModel] = Field(default_factory=list)


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
    scores: dict
    summary: str
    citations: list[dict] = Field(default_factory=list)
    scrutiny: dict = Field(default_factory=dict)
    challenge_questions: list[dict] = Field(default_factory=list)
    version_metrics: dict = Field(default_factory=dict)


class ExportChartRequest(BaseModel):
    rows: list[ClaimChartRowModel]
    title: str = "Lumenci Refined Claim Chart"


class ExportSummaryRequest(BaseModel):
    version_history: list[VersionHistoryEntryModel]
    chart_rows: list[ClaimChartRowModel]
    title: str = "Lumenci Version Summary Report"
