from __future__ import annotations

from pathlib import Path

from fastapi import FastAPI, File, Header, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles

from backend.schemas import (
    ExportChartRequest,
    ExportSummaryRequest,
    RefineRequest,
    SupportingDocModel,
    UrlIngestRequest,
    WorkspaceResponse,
)
from src.agents.parser_agent import ParserAgent
from src.services.export_service import (
    build_claim_chart_docx,
    build_version_summary_docx,
    export_chart_csv,
)
from src.services.refinement_service import RefinementService
from src.services.url_ingestion_service import fetch_url_text
from src.utils.file_utils import read_uploaded_text


BASE_DIR = Path(__file__).resolve().parents[1]
DATA_DIR = BASE_DIR / "data"
WEB_DIR = BASE_DIR / "web"

app = FastAPI(title="ClaimCraft AI Claim Chart Workspace API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

parser_agent = ParserAgent()
refinement_service = RefinementService()


def _workspace_response(rows: list[dict], supporting_docs: list[dict], message: str) -> WorkspaceResponse:
    return WorkspaceResponse(
        chart_rows=rows,
        supporting_docs=[
            SupportingDocModel(
                name=doc["name"],
                text=doc["text"],
                source_type=doc.get("source_type", "upload"),
                url=doc.get("url"),
            )
            for doc in supporting_docs
        ],
        assistant_message=message,
    )


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok"}


@app.post("/api/load-sample", response_model=WorkspaceResponse)
def load_sample() -> WorkspaceResponse:
    claim_chart_bytes = (DATA_DIR / "sample_claim_chart.csv").read_bytes()
    support_text = (DATA_DIR / "sample_supporting_doc.txt").read_text(encoding="utf-8")
    rows = parser_agent.parse_claim_chart(claim_chart_bytes)
    supporting_docs = [
        {
            "name": "sample_supporting_doc.txt",
            "text": support_text,
            "source_type": "sample",
        }
    ]
    return _workspace_response(
        rows,
        supporting_docs,
        "Sample workspace loaded. Select a row or start with a quick refinement prompt.",
    )


@app.post("/api/workspace/upload", response_model=WorkspaceResponse)
async def upload_workspace(
    claim_chart: UploadFile = File(...),
    supporting_docs: list[UploadFile] = File(default=[]),
) -> WorkspaceResponse:
    if not claim_chart.filename or not claim_chart.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Upload a CSV claim chart.")

    try:
        claim_chart_bytes = await claim_chart.read()
        rows = parser_agent.parse_claim_chart(claim_chart_bytes)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    docs = []
    for file in supporting_docs:
        content = await file.read()
        docs.append(
            {
                "name": file.filename,
                "text": read_uploaded_text(file.filename or "support.txt", content),
                "source_type": "upload",
            }
        )

    return _workspace_response(
        rows,
        docs,
        "Workspace parsed successfully. Review flagged rows and start refining.",
    )


@app.post("/api/supporting-docs/upload")
async def upload_supporting_docs(
    supporting_docs: list[UploadFile] = File(...),
) -> JSONResponse:
    docs = []
    for file in supporting_docs:
        content = await file.read()
        docs.append(
            {
                "name": file.filename,
                "text": read_uploaded_text(file.filename or "support.txt", content),
                "source_type": "upload",
            }
        )
    return JSONResponse(content={"supporting_docs": docs})


@app.post("/api/supporting-docs/url")
def ingest_url_source(payload: UrlIngestRequest) -> JSONResponse:
    try:
        text = fetch_url_text(str(payload.url))
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Could not read URL: {exc}") from exc

    return JSONResponse(
        content={
            "supporting_doc": {
                "name": str(payload.url),
                "text": text,
                "source_type": "url",
                "url": str(payload.url),
            }
        }
    )


@app.post("/api/refine")
def refine_row(
    payload: RefineRequest,
    x_groq_api_key: str | None = Header(default=None, alias="X-Groq-API-Key"),
) -> JSONResponse:
    suggestion = refinement_service.generate_suggestion(
        row=payload.row.model_dump(),
        request=payload.request,
        supporting_docs=[doc.model_dump() for doc in payload.supporting_docs],
        api_key=(x_groq_api_key or "").strip() or None,
    )
    return JSONResponse(content=suggestion)


@app.post("/api/export/chart-docx")
def export_chart_docx(payload: ExportChartRequest) -> StreamingResponse:
    content = build_claim_chart_docx(
        rows=[row.model_dump() for row in payload.rows],
        title=payload.title,
    )
    return StreamingResponse(
        iter([content]),
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={
            "Content-Disposition": 'attachment; filename="claimcraft_refined_claim_chart.docx"'
        },
    )


@app.post("/api/export/summary-docx")
def export_summary_docx(payload: ExportSummaryRequest) -> StreamingResponse:
    content = build_version_summary_docx(
        version_history=[entry.model_dump() for entry in payload.version_history],
        chart_rows=[row.model_dump() for row in payload.chart_rows],
        title=payload.title,
    )
    return StreamingResponse(
        iter([content]),
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={
            "Content-Disposition": 'attachment; filename="claimcraft_version_summary.docx"'
        },
    )


@app.post("/api/export/chart-csv")
def export_chart(payload: ExportChartRequest) -> StreamingResponse:
    content = export_chart_csv([row.model_dump() for row in payload.rows]).encode("utf-8")
    return StreamingResponse(
        iter([content]),
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="claimcraft_refined_claim_chart.csv"'},
    )


if WEB_DIR.exists():
    app.mount("/", StaticFiles(directory=WEB_DIR, html=True), name="web")
