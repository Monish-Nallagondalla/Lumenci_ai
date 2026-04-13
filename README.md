# ClaimCraft AI

AI-assisted claim chart refinement workspace built as a PM-builder portfolio project.

ClaimCraft AI is a human-in-the-loop product prototype for improving patent claim charts with grounded evidence, tighter reasoning, explicit review, and export-ready outputs. The goal was not to build "chat plus table." The goal was to design a workflow where AI suggestions are inspectable, challengeable, and reversible before they become part of a high-stakes work product.

## What It Does

- Parses a claim chart into a structured three-column workspace
- Lets users refine rows conversationally
- Retrieves support from uploaded docs before generating suggestions
- Shows citations, diffs, scrutiny signals, and challenge prompts
- Supports accept, reject, modify, undo, and version history
- Exports refined outputs to DOCX and CSV
- Accepts a user-supplied Groq API key in the UI for live inference
- Falls back gracefully when no API key is available

## Why This Project Is Interesting

This project lives at the intersection of product thinking, AI workflow design, and rapid execution.

The hard part was not text generation. It was designing for trust:

- How should the user verify what changed?
- What happens when the model is wrong?
- How does the system recover when evidence is weak or missing?
- How do you keep AI useful without making it feel unsafe?

That led to a product shape centered on reviewability rather than automation.

## Product Principles

- Human-in-the-loop over auto-apply
- Workflow around AI, not AI in isolation
- Recovery paths for wrong evidence and missing evidence
- Chart-first interaction, not chat-first distraction
- Prototype realism over static mockups

## Demo Flow

Use these files for the cleanest walkthrough:

- Claim chart: `data/demo_claim_chart_camera_realistic.csv`
- Supporting doc: `data/demo_support_camera.txt`

Suggested flow:

1. Upload the claim chart and support doc
2. Click `Parse and open workspace`
3. Select a weak row
4. Ask for stronger evidence or reasoning
5. Review citations, diffs, and scrutiny signals
6. Accept, reject, or modify the suggestion
7. Show undo and export

## Shareable Demo Setup

This repo is safe to share publicly without exposing your own model credentials.

There are two usage modes:

- `Fallback mode`
  Leave the inference key blank and the prototype remains usable with deterministic fallback logic.
- `Live Groq mode`
  Paste a Groq API key into the `Inference Key` field in the UI and save it in the browser.

The browser-supplied key:

- is stored only in local browser storage
- is sent only on refinement requests
- is not committed to the repo
- does not need to be hardcoded on the server

## PM + Builder Scope

This repo intentionally shows both product manager and builder signals.

### Product manager signals

- Reframed the problem from "generate better text" to "support a defensible workflow"
- Treated trust, reviewability, and recoverability as core requirements
- Designed explicit handling for wrong evidence, undo, and missing-evidence cases
- Thought about observability, evals, and failure modes beyond the prototype layer

### Builder signals

- Moved from a quick Streamlit proof of concept to a custom FastAPI + SPA architecture
- Integrated Groq through `langchain-groq` while preserving a fallback path
- Built parsing, retrieval, refinement, export, and UI state management end to end
- Added browser-level API key handling for safer public sharing

## Architecture

- `ParserAgent`
  Normalizes uploaded claim-chart input.
- `RetrievalAgent`
  Finds relevant evidence snippets from uploaded support docs.
- `ReasoningAgent`
  Generates improved evidence and reasoning with Groq or fallback logic.
- `EvaluatorAgent`
  Scores evidence strength, reasoning specificity, and relevance.
- `Orchestrator`
  Coordinates row-level refinement, scoring, and review packaging.
- `backend/main.py`
  Serves upload, refine, URL ingestion, and export endpoints.
- `web/`
  Renders the analyst-facing workspace.

## Tech Stack

- Backend: FastAPI
- Frontend: HTML, CSS, JavaScript
- LLM provider: Groq via `langchain-groq`
- Default model: `llama-3.3-70b-versatile`
- Exports: DOCX and CSV

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

4. Optional: add Groq credentials

```env
GROQ_API_KEY=your_key_here
MODEL_NAME=llama-3.3-70b-versatile
```

You can skip the `.env` key entirely and use fallback mode, or paste a Groq key into the UI after launch.

5. Start the app

```bash
python -m uvicorn backend.main:app --reload --port 8000
```

6. Open:

```text
http://localhost:8000
```

## Project Map

```text
ClaimCraftAI/
|- backend/
|- data/
|- docs/
|- src/
|- web/
|- CURRENT_USER_FLOW.mmd
|- README.md
`- requirements.txt
```

## Supporting Docs

- PM artifact pack: [`docs/PRODUCT_MANAGER_ARTIFACT_PACK.md`](docs/PRODUCT_MANAGER_ARTIFACT_PACK.md)
- Portfolio case study: [`docs/PORTFOLIO_CASE_STUDY.md`](docs/PORTFOLIO_CASE_STUDY.md)
- User flow Mermaid: [`CURRENT_USER_FLOW.mmd`](CURRENT_USER_FLOW.mmd)

## What Is Real vs Prototype-Grade

### Real

- File upload and parsing
- TXT/PDF/DOCX support-doc extraction
- URL ingestion
- Row-level refinement requests
- Groq-backed generation through `.env` or browser key input
- Review workflow with accept, reject, modify, and undo
- Version history and export endpoints

### Prototype-grade

- Retrieval is lexical, not vector or semantic search
- Scoring is heuristic, not model-based evaluation
- No persistent database or auth
- No production observability or eval harness yet

## If I Took This Further

- stronger retrieval and evidence ranking
- richer eval harnesses and observability
- persistent workspaces and collaboration
- legal-review-specific audit and QA layers

## Why It Belongs In My Portfolio

ClaimCraft AI shows how I work when product strategy, AI systems, UX iteration, and implementation all meet in the same problem space. It is not just a prototype that functions. It is a prototype shaped by product judgment.
