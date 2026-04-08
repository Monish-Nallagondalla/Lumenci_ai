# Lumenci AI Claim Chart Refinement Demo

This repository now ships with a polished custom web app instead of relying on Streamlit for the main demo experience. The new UI uses a FastAPI backend plus a custom single-page frontend so the workflow feels more like a purpose-built analyst tool while keeping the prototype lightweight and easy to run.

## What the prototype does

- Uploads a claim chart CSV and optional supporting documents.
- Parses the chart into a structured three-column review workspace.
- Flags weak rows using heuristic evidence/reasoning checks.
- Lets the analyst select a row and request refinements through chat.
- Retrieves relevant support snippets from uploaded documents.
- Generates AI suggestions with proposed evidence, reasoning, confidence, source basis, evaluator scores, and before/after diff.
- Requires explicit analyst approval before any chart row is updated.
- Supports accept, reject, modify-through-chat, undo last accepted change, and version logging.
- Exports the refined chart as Word or CSV and exports the version summary as Word.

## Tech stack

- Backend: FastAPI
- Frontend: custom HTML/CSS/JavaScript SPA
- Orchestration: lightweight modular agent/service architecture in Python
- LLM provider: Groq through `langchain-groq`
- State model: client-side session state in the browser plus stateless backend refinement/export endpoints

## Project structure

```text
Lumenci/
├── backend/
│   ├── main.py
│   └── schemas.py
├── data/
│   ├── sample_claim_chart.csv
│   ├── sample_supporting_doc.txt
│   ├── demo_claim_chart_camera.csv
│   ├── demo_claim_chart_router.csv
│   ├── demo_support_camera.txt
│   ├── demo_support_router.txt
│   └── demo_support_thermostat_extra.txt
├── src/
│   ├── agents/
│   ├── llm/
│   ├── services/
│   └── utils/
├── web/
│   ├── index.html
│   ├── styles.css
│   └── app.js
├── .env.example
├── requirements.txt
└── app.py
```

`app.py` is the earlier Streamlit prototype and can be kept as a fallback, but the recommended demo surface is now the FastAPI web app.

## Setup

1. Create a Python virtual environment.
2. Install dependencies:

```bash
pip install -r requirements.txt
```

3. Create `.env` from `.env.example`:

```bash
copy .env.example .env
```

4. Add your Groq credentials:

```env
GROQ_API_KEY=your_key_here
MODEL_NAME=llama-3.3-70b-versatile
```

## Run the new web app

```bash
python -m uvicorn backend.main:app --reload --port 8000
```

Then open:

```text
http://localhost:8000
```

## Recommended demo flow

1. Open the app and upload your own CSV plus support files.
2. Click `Parse and open workspace`.
3. Review flagged rows in the chart.
4. Select a claim element row.
5. Use a quick action like `Strengthen evidence` or enter a custom prompt in chat.
6. Review the AI suggestion card with source basis, confidence, evaluator scores, and before/after diff.
7. Accept, reject, or modify via chat.
8. If the suggestion needs more evidence, append more support docs or ingest a technical URL.
9. Use `Undo last accepted change` if needed.
10. Export the final claim chart `.docx` and the version summary `.docx`.

## What is real vs simplified

Real:
- Upload and parsing flow
- TXT/PDF/DOCX support doc extraction
- URL ingestion for additional support text
- Row-level retrieval by keyword/snippet matching
- Groq-backed refinement when the API key is configured
- Human approval workflow
- Version history tracking
- Word and CSV export endpoints

Simplified:
- Retrieval is lexical rather than vector or semantic search
- Weak-row highlighting uses heuristics instead of a dedicated scoring model
- Fallback refinement logic is deterministic if the Groq call fails or no key is configured
- No persistent database, auth, or multi-user session storage

## Architecture overview

- `ParserAgent`: parses and normalizes the uploaded claim chart.
- `RetrievalAgent`: finds the most relevant uploaded support snippets.
- `ReasoningAgent`: creates improved evidence/reasoning via Groq or fallback logic.
- `EvaluatorAgent`: scores evidence strength, reasoning specificity, and relevance.
- `VersioningAgent`: shapes structured version entries.
- `Orchestrator`: coordinates row-specific refinement.
- `backend/main.py`: exposes upload, refine, URL ingestion, and export endpoints.
- `web/`: renders the custom analyst-facing interface.

## Demo files

Use the files in `data/` to test both upload sections:

- Claim charts:
  - `sample_claim_chart.csv`
  - `demo_claim_chart_camera.csv`
  - `demo_claim_chart_router.csv`
- Supporting docs:
  - `sample_supporting_doc.txt`
  - `demo_support_camera.txt`
  - `demo_support_router.txt`
  - `demo_support_thermostat_extra.txt`

## Notes

- The app is built for assignment/demo quality: strong flow, clear UX, and modular code rather than production infrastructure.
- If Groq is not configured, the UI still works and shows fallback suggestions so the demo can proceed end to end.
- Uploaded CSVs only need a claim-element column. Existing evidence and reasoning columns are supported but not required.
