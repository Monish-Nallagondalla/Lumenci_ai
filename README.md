# ClaimCraft AI Claim Chart Workspace

Portfolio case study and vibe-coded prototype for AI-assisted patent claim chart refinement.

ClaimCraft AI is a human-in-the-loop workspace for improving patent claim charts with grounded evidence, tighter reasoning, explicit review, and export-ready outputs. It was built as a product-thinking exercise around a high-stakes workflow where AI suggestions should be inspectable, challengeable, and reversible.

## Highlights

- Three-column claim chart workspace for claim element, evidence, and reasoning
- Row-level conversational refinement with citation-backed review
- Accept, reject, modify, undo, and version history flows
- URL ingestion and appended support docs when evidence is weak
- DOCX and CSV exports for downstream review
- Bring-your-own Groq API key support in the UI for live inference without sharing server credentials

## Why This Project Exists

Patent analysts refine claim charts that map patent claim elements to accused product features and supporting evidence. That workflow is repetitive, evidence-sensitive, and high risk if AI is allowed to behave like an unreviewed auto-write system.

I built this prototype to explore a better interaction model:

- upload a claim chart and support material
- identify weak evidence and vague reasoning
- request refinement through chat
- review AI suggestions before anything is applied
- recover safely when the model is wrong or evidence is insufficient
- export a cleaner chart for downstream legal work

## What I Built

- A custom FastAPI + HTML/CSS/JavaScript workspace for claim-chart refinement
- A three-column chart view for claim element, evidence, and reasoning
- Row-level conversational refinement
- Citation-aware suggestion review
- Accept, reject, modify, and undo flows
- Version history and export-ready summaries
- URL ingestion and support-doc append flows when evidence is weak
- A slim guided workflow dock for first-time orientation

## Why This Is More Than a UI Demo

This repo demonstrates both product manager and builder behavior.

### Product manager signals

- Reframed the task from "generate text" to "support a defensible legal workflow"
- Treated trust, reviewability, and recoverability as core product requirements
- Designed explicit handling for wrong evidence, undo, and no-evidence scenarios
- Added structured review states instead of allowing silent AI overwrite
- Considered how observability, evals, and failure modes would matter in a real product

### Builder signals

- Moved from a quick Streamlit prototype to a custom FastAPI + SPA architecture when the first stack stopped serving the workflow
- Used Groq through `langchain-groq` for live refinement when configured
- Kept a deterministic fallback path so the demo remains testable even without live inference
- Built export endpoints, file parsing, row-level retrieval, scoring, and UI state management

## Product Decisions I Am Proud Of

### 1. Human-in-the-loop over auto-apply

The assistant proposes updates, but the chart only changes after explicit review. In a legal-adjacent workflow, that is a product decision, not just a UI detail.

### 2. Workflow around AI, not AI in isolation

The actual product is not the model output. The product is the workflow around it: retrieval, review, citations, diffs, recovery, and exports.

### 3. Designed for failure, not just the happy path

I explicitly supported:

- AI gives wrong evidence
- user wants to undo a previous refinement
- AI cannot find enough support and needs more docs or a URL

## Demo Path

Use the camera files for the cleanest walkthrough:

- Claim chart: `data/demo_claim_chart_camera_realistic.csv`
- Supporting doc: `data/demo_support_camera.txt`

Suggested demo flow:

1. Upload the claim chart and support doc
2. Click `Parse and open workspace`
3. Select a weak row
4. Ask for stronger evidence or reasoning
5. Review citations, diff, and scrutiny signals
6. Accept or modify the suggestion
7. Show undo and export

## Public Demo Usage

If you deploy this project publicly, visitors can use it in two ways:

- `Fallback mode`: leave the inference key blank and the prototype still works with deterministic fallback logic
- `Live Groq mode`: paste a Groq API key into the `Inference Key` field in the intake area and save it in the browser

The key is stored only in local browser storage and sent only on refinement requests through the `X-Groq-API-Key` header. It is not committed to the repo and does not need to be hardcoded on the server for shared demos.

## PM Artifact Pack

I added a dedicated PM artifact pack here:

- [`docs/PRODUCT_MANAGER_ARTIFACT_PACK.md`](docs/PRODUCT_MANAGER_ARTIFACT_PACK.md)

That file packages the kinds of materials a PM would typically maintain around this product, including:

- product brief
- problem framing
- users and jobs-to-be-done
- PRD summary
- scope and non-goals
- risks and assumptions
- success metrics
- eval and observability thinking
- launch and readiness checklist

Other supporting project docs:

- [`CURRENT_USER_FLOW.mmd`](CURRENT_USER_FLOW.mmd)
- [`docs/PORTFOLIO_CASE_STUDY.md`](docs/PORTFOLIO_CASE_STUDY.md)

## Tech Stack

- Backend: FastAPI
- Frontend: custom HTML/CSS/JavaScript SPA
- LLM provider: Groq via `langchain-groq`
- Default model: `llama-3.3-70b-versatile`
- State: browser session state with stateless backend refinement and export endpoints

## Architecture

- `ParserAgent`: normalizes claim-chart input
- `RetrievalAgent`: finds relevant evidence snippets from uploaded support docs
- `ReasoningAgent`: generates stronger evidence and reasoning via Groq or fallback logic
- `EvaluatorAgent`: scores evidence strength, specificity, and relevance
- `Orchestrator`: coordinates the row-level refinement flow
- `backend/main.py`: serves upload, refine, URL ingestion, and export endpoints
- `web/`: renders the analyst-facing workflow

## Project Structure

```text
ClaimCraftAI/
|- backend/
|- data/
|- docs/
|- src/
|- web/
|- CURRENT_USER_FLOW.mmd
|- docs/PORTFOLIO_CASE_STUDY.md
|- README.md
`- requirements.txt
```

## Run Locally

1. Create and activate a Python virtual environment
2. Install dependencies

```bash
pip install -r requirements.txt
```

3. Create `.env` from `.env.example`

```bash
copy .env.example .env
```

4. Add Groq credentials

```env
GROQ_API_KEY=your_key_here
MODEL_NAME=llama-3.3-70b-versatile
```

You can also skip the `.env` key entirely and test the UI with fallback mode, or paste a Groq key into the browser input after launch.

5. Start the app

```bash
python -m uvicorn backend.main:app --reload --port 8000
```

6. Open:

```text
http://localhost:8000
```

## What Is Real vs Prototype-Grade

### Real

- File upload and parsing
- TXT/PDF/DOCX support-doc extraction
- URL ingestion
- Row-level refinement requests
- Groq-backed generation when configured through `.env` or the browser key input
- Review workflow with accept/reject/modify
- Version history and export endpoints

### Prototype-grade

- Retrieval is lexical, not vector or semantic search
- Scoring is heuristic, not model-based evaluation
- No persistent database or auth
- No production observability or eval framework yet

## Why This Repo Matters

This repo is meant to read like one of my actual projects. It shows how I think when product strategy, workflow design, execution speed, and AI systems all meet in the same problem space.

If I were shipping this further, the next layer would be:

- stronger retrieval and evidence ranking
- richer eval harnesses and observability
- persistent workspaces and collaboration
- legal-review-specific QA and audit trails
