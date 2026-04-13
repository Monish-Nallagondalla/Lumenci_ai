# Product Manager Artifact Pack

This file collects the kinds of materials a product manager would typically write, maintain, or drive for a workflow-heavy AI product like this one. It is intentionally structured as a compact artifact set rather than a single PRD dump.

## 1. Product Brief

### Product

Lumenci AI Claim Chart Refinement Workspace

### One-line description

An AI-assisted workspace that helps patent analysts refine claim charts by improving evidence quality, tightening reasoning, and preserving review control before legal export.

### Problem

Claim-chart refinement is repetitive, evidence-sensitive, and difficult to scale. Analysts need help improving weak mappings and vague reasoning, but they cannot trust black-box AI output in a legal workflow.

### Goal

Reduce the time required to improve weak claim-chart rows while preserving analyst trust, reviewability, and export readiness.

## 2. Problem Framing

### User pain points

- Weak evidence is hard to identify and strengthen quickly
- Reasoning is often vague or too high-level
- Analysts need help finding stronger support without losing control
- AI suggestions are risky if they cannot be reviewed or reversed
- Legal workflows need exportable output, not just a chat transcript

### Why AI helps

- It accelerates rewrite and synthesis work
- It can ground refinements in uploaded support docs
- It can help analysts iterate row by row instead of rewriting whole charts manually

### Why AI alone is not enough

- It can hallucinate
- It can overstate evidence
- It can use marketing language as if it were technical proof
- It needs workflow guardrails and explicit review

## 3. Users and Jobs to Be Done

### Primary user

Patent analyst or legal ops professional preparing infringement claim charts

### Jobs to be done

- As an analyst, I want to upload a draft chart and supporting material so I can improve weak rows faster
- As an analyst, I want AI to suggest stronger evidence and tighter reasoning without silently overwriting my work
- As an analyst, I want to inspect citations and wording changes before approving an update
- As an analyst, I want to recover from bad suggestions through rejection, follow-up refinement, or undo
- As an analyst, I want exportable output that still resembles a legal work product

## 4. PRD Summary

### In scope

- Upload claim chart CSV
- Upload supporting docs
- Parse into a three-column workspace
- Flag weak evidence and vague reasoning
- Select row and refine through chat
- Retrieve support snippets from uploaded docs
- Generate AI-supported evidence and reasoning updates
- Review via diff, citations, and scrutiny signals
- Accept, reject, modify, undo
- Export chart and version summary

### Out of scope

- Authentication
- Team collaboration
- Persistent database-backed workspaces
- Production-grade retrieval ranking
- Full legal-grade validation or legal opinioning

## 4A. Key Product Requirements

### Functional requirements

- The user can upload a claim chart and supporting evidence documents
- The system parses the chart into claim element, evidence, and reasoning columns
- The user can select a row and request refinement in natural language
- The system returns a specific evidence and reasoning suggestion
- The user can review, accept, reject, or further modify the suggestion
- The chart updates only after explicit approval
- The user can undo a prior accepted refinement
- The user can export the refined chart for downstream use

### Non-functional requirements

- The workflow should stay understandable to a first-time reviewer
- The system should remain usable even if live inference is unavailable
- AI changes should remain inspectable through citations and diffs
- The product should handle missing-evidence flows without dead-ending the user

## 5. UX Principles

- Never auto-apply AI output in a legal-adjacent workflow
- Keep the chart as the center of gravity, not the chat transcript
- Make review explicit before change application
- Design for recovery, not only success
- Let the product absorb system complexity instead of pushing prompt burden onto the user

## 6. Core Workflow

1. User uploads claim chart and support material
2. System parses chart and flags weak rows
3. User selects a row and asks for refinement
4. System retrieves relevant snippets
5. AI proposes stronger evidence and reasoning
6. User reviews citations, diff, and scrutiny signals
7. User accepts, rejects, or modifies
8. System logs version activity
9. User exports final outputs

## 7. Edge Cases and Recovery

### AI gives wrong evidence

Mitigation:

- show citations
- allow reject
- allow modify-through-chat
- do not overwrite chart until approved

### User wants to undo a previous change

Mitigation:

- version history
- undo last accepted change

### AI cannot find enough evidence

Mitigation:

- ask for another supporting document
- allow URL ingestion
- keep current row unchanged until stronger support exists

## 7A. Additional PM Docs This Product Would Usually Have

For a fuller team setting, I would typically maintain or co-own:

- a one-page PRD
- a user journey and edge-case map
- a KPI and experiment tracker
- a launch checklist
- an eval plan for AI quality and workflow quality
- a risk register covering hallucination, over-claiming, and reviewer over-trust
- a design review note documenting key workflow tradeoffs

## 8. Metrics

### Product metrics

- time to approved refinement
- suggestion acceptance rate
- suggestion modification rate
- undo rate
- export completion rate
- number of risky rows reduced per session

### Quality metrics

- citation coverage
- unsupported assertion rate
- evidence-strength improvement
- reasoning-specificity improvement
- frequency of "needs more evidence" outcomes

## 9. Risks and Assumptions

### Assumptions

- Users will often start with partial or weak claim charts rather than blank charts
- Uploaded support docs are the primary source of truth
- Analysts prefer explicit control over automation in this workflow

### Risks

- lexical retrieval may miss the best evidence
- users may over-trust medium-quality AI suggestions
- visual polish may mask prototype-grade retrieval limitations
- export quality may still need stronger formatting for real legal use

## 9A. Open Questions

- Should the first version optimize for partially completed charts or mostly blank charts?
- How much legal-language standardization should the assistant apply by default?
- When evidence is weak, should the product recommend follow-up retrieval automatically or wait for user direction?
- What level of citation coverage is required before a suggestion should be marked ready for approval?

## 10. Evaluation and Observability Thinking

If this moved beyond prototype stage, I would add:

- prompt and retrieval tracing
- latency by stage
- accept, reject, and undo instrumentation
- repeated weak-row pattern tracking
- benchmark rows for groundedness and citation quality
- workflow evals for recovery quality, not just generation quality

## 10A. Candidate Experiments

- Compare acceptance rate for suggestions with and without explicit citations
- Compare trust and speed when review diffs are shown inline versus in a dedicated drawer
- Measure whether challenge prompts improve rejection of weak suggestions
- Measure whether quick actions outperform fully free-form prompting for first-time users

## 11. Launch Readiness Checklist

- upload flow works for realistic demo test data
- sparse claim charts still parse correctly
- AI suggestions appear in chat and review drawer
- accept, reject, and modify all function correctly
- undo works
- URL ingestion works
- DOCX and CSV exports download successfully
- demo files look realistic enough for walkthrough use

## 12. PM Notes on Why This Repo Is Useful

This project is useful as a PM artifact because it shows:

- workflow thinking, not just feature thinking
- handling of AI failure modes
- product judgment under ambiguity
- ability to use vibe coding tools without outsourcing product ownership

## 13. Related Files

- User flow: [`../CURRENT_USER_FLOW.mmd`](../CURRENT_USER_FLOW.mmd)
- Portfolio case study: [`./PORTFOLIO_CASE_STUDY.md`](./PORTFOLIO_CASE_STUDY.md)
- Repository overview: [`../README.md`](../README.md)
