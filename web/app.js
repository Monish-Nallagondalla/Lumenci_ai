const WORKFLOW_VISIBILITY_KEY = "lumenci.workflow.hidden";

const state = {
  rows: [],
  baselineRows: [],
  supportingDocs: [],
  chatHistory: [
    {
      role: "assistant",
      content:
        "Upload a claim chart and supporting material, then select a row to begin refining.",
    },
  ],
  selectedRowId: null,
  currentSuggestion: null,
  versionHistory: [],
  changeCounter: 0,
  lastAcceptedChange: null,
  chartVersion: 1,
  reviewTab: "decision",
  bottomTab: "history",
  workflowHidden: loadWorkflowVisibility(),
};

const elements = {
  workspaceGrid: document.getElementById("workspaceGrid"),
  claimChartInput: document.getElementById("claimChartInput"),
  supportingDocsInput: document.getElementById("supportingDocsInput"),
  additionalDocsInput: document.getElementById("additionalDocsInput"),
  processWorkspaceButton: document.getElementById("processWorkspaceButton"),
  appendDocsButton: document.getElementById("appendDocsButton"),
  urlIngestForm: document.getElementById("urlIngestForm"),
  urlInput: document.getElementById("urlInput"),
  kpiStrip: document.getElementById("kpiStrip"),
  versionPill: document.getElementById("versionPill"),
  kpiGrid: document.getElementById("kpiGrid"),
  improvementSummary: document.getElementById("improvementSummary"),
  bottomTabBar: document.getElementById("bottomTabBar"),
  historyTabPanel: document.getElementById("historyTabPanel"),
  courtTabPanel: document.getElementById("courtTabPanel"),
  exportTabPanel: document.getElementById("exportTabPanel"),
  workflowRail: document.getElementById("workflowRail"),
  workflowSteps: document.getElementById("workflowSteps"),
  hideWorkflowButton: document.getElementById("hideWorkflowButton"),
  workflowPeekButton: document.getElementById("workflowPeekButton"),
  workflowPeekStep: document.getElementById("workflowPeekStep"),
  workspaceMetrics: document.getElementById("workspaceMetrics"),
  chartMetrics: document.getElementById("chartMetrics"),
  assistantMetrics: document.getElementById("assistantMetrics"),
  selectedRowSpotlight: document.getElementById("selectedRowSpotlight"),
  chartRows: document.getElementById("chartRows"),
  chatLog: document.getElementById("chatLog"),
  chatComposer: document.getElementById("chatComposer"),
  chatInput: document.getElementById("chatInput"),
  composerHint: document.getElementById("composerHint"),
  suggestionCard: document.getElementById("suggestionCard"),
  needsEvidenceCard: document.getElementById("needsEvidenceCard"),
  reviewDrawerEmpty: document.getElementById("reviewDrawerEmpty"),
  reviewPanelBody: document.getElementById("reviewPanelBody"),
  historyList: document.getElementById("historyList"),
  courtPrepPanel: document.getElementById("courtPrepPanel"),
  exportChartDocxButton: document.getElementById("exportChartDocxButton"),
  exportSummaryDocxButton: document.getElementById("exportSummaryDocxButton"),
  exportCsvButton: document.getElementById("exportCsvButton"),
  undoButton: document.getElementById("undoButton"),
  toastHost: document.getElementById("toastHost"),
};

const quickActions = [...document.querySelectorAll(".quick-actions .chip")];
init();

function init() {
  elements.processWorkspaceButton.addEventListener("click", parseUploadedWorkspace);
  elements.appendDocsButton.addEventListener("click", appendSupportingDocs);
  elements.urlIngestForm.addEventListener("submit", handleUrlIngest);
  elements.chatComposer.addEventListener("submit", handleChatSubmit);
  elements.chartRows.addEventListener("click", handleRowSelection);
  elements.exportChartDocxButton.addEventListener("click", exportChartDocx);
  elements.exportSummaryDocxButton.addEventListener("click", exportSummaryDocx);
  elements.exportCsvButton.addEventListener("click", exportChartCsv);
  elements.undoButton.addEventListener("click", undoLastAcceptedChange);
  elements.suggestionCard.addEventListener("click", handleSuggestionActions);
  elements.needsEvidenceCard.addEventListener("click", handleNeedsEvidenceActions);
  elements.bottomTabBar?.addEventListener("click", handleBottomTabChange);
  elements.hideWorkflowButton?.addEventListener("click", () => setWorkflowHidden(!state.workflowHidden));
  elements.workflowPeekButton?.addEventListener("click", () => setWorkflowHidden(false));

  quickActions.forEach((button) =>
    button.addEventListener("click", () => {
      elements.chatInput.value = button.dataset.prompt || "";
      elements.chatInput.focus();
    }),
  );
  render();
}

async function parseUploadedWorkspace() {
  const claimChartFile = elements.claimChartInput.files?.[0];
  if (!claimChartFile) {
    toast("Choose a claim chart CSV first.", "error");
    return;
  }

  const formData = new FormData();
  formData.append("claim_chart", claimChartFile);
  for (const file of elements.supportingDocsInput.files || []) {
    formData.append("supporting_docs", file);
  }

  try {
    const response = await fetch("/api/workspace/upload", { method: "POST", body: formData });
    const payload = await readJsonResponse(response);
    hydrateWorkspace(payload);
    toast("Workspace parsed successfully.", "success");
  } catch (error) {
    toast(error.message, "error");
  }
}

async function appendSupportingDocs() {
  const files = elements.additionalDocsInput.files;
  if (!files || !files.length) {
    toast("Choose one or more support files to append.", "error");
    return;
  }

  const formData = new FormData();
  for (const file of files) {
    formData.append("supporting_docs", file);
  }

  try {
    const response = await fetch("/api/supporting-docs/upload", { method: "POST", body: formData });
    const payload = await readJsonResponse(response);
    state.supportingDocs.push(...payload.supporting_docs);
    appendChat(
      "assistant",
      `Added ${payload.supporting_docs.length} supporting document(s) to the evidence workspace.`,
    );
    elements.additionalDocsInput.value = "";
    render();
    toast("Supporting documents appended.", "success");
  } catch (error) {
    toast(error.message, "error");
  }
}

async function handleUrlIngest(event) {
  event.preventDefault();
  const url = elements.urlInput.value.trim();
  if (!url) {
    toast("Paste a technical URL to ingest.", "error");
    return;
  }

  try {
    const payload = await postJson("/api/supporting-docs/url", { url });
    state.supportingDocs.push(payload.supporting_doc);
    appendChat("assistant", `Ingested URL source: ${url}`);
    elements.urlInput.value = "";
    render();
    toast("URL ingested successfully.", "success");
  } catch (error) {
    toast(error.message, "error");
  }
}

async function handleChatSubmit(event) {
  event.preventDefault();
  const prompt = elements.chatInput.value.trim();
  if (!prompt) {
    toast("Enter a refinement request first.", "error");
    return;
  }

  const row = getSelectedRow();
  if (!row) {
    toast("Select a row before asking for a refinement.", "error");
    return;
  }

  appendChat("user", prompt);
  elements.chatInput.value = "";
  render();

  try {
    const suggestion = await postJson("/api/refine", {
      row,
      request: prompt,
      supporting_docs: state.supportingDocs,
    });
    state.currentSuggestion = suggestion;
    state.reviewTab = "decision";
    appendChat(
      "assistant",
      buildSuggestionChatMessage(row.row_id, suggestion),
    );
    render();
  } catch (error) {
    toast(error.message, "error");
  }
}

function handleRowSelection(event) {
  const rowElement = event.target.closest("[data-row-id]");
  if (!rowElement) {
    return;
  }
  state.selectedRowId = Number(rowElement.dataset.rowId);
  render();
}

function handleSuggestionActions(event) {
  const tab = event.target.dataset.tab;
  if (tab) {
    state.reviewTab = tab;
    renderSuggestion();
    return;
  }

  const action = event.target.dataset.action;
  if (!action || !state.currentSuggestion) {
    return;
  }

  if (action === "accept") {
    acceptSuggestion();
    return;
  }

  if (action === "reject") {
    rejectSuggestion();
    return;
  }

  if (action === "modify") {
    const row = getSelectedRow();
    if (!row) {
      return;
    }
    const entry = buildVersionEntry({
      row,
      suggestion: state.currentSuggestion,
      decision: "modified",
      summary: "User requested a follow-up refinement before accepting.",
      oldState: { evidence: row.evidence, reasoning: row.reasoning },
      newState: { evidence: row.evidence, reasoning: row.reasoning },
    });
    state.versionHistory.push(entry);
    appendChat(
      "assistant",
      "Add a follow-up prompt in chat and I will revise the suggestion for the same row.",
    );
    row.last_challenge_questions = state.currentSuggestion.challenge_questions || [];
    row.last_scrutiny = state.currentSuggestion.scrutiny || {};
    row.last_citations = state.currentSuggestion.citations || [];
    elements.chatInput.focus();
    render();
  }
}

function handleNeedsEvidenceActions(event) {
  const action = event.target.dataset.action;
  if (!action) {
    return;
  }

  document.getElementById("workspaceIntake")?.scrollIntoView({ behavior: "smooth", block: "start" });

  if (action === "focus-upload") {
    elements.additionalDocsInput.focus();
    return;
  }

  if (action === "focus-url") {
    elements.urlInput.focus();
  }
}

function handleBottomTabChange(event) {
  const tab = event.target.dataset.bottomTab;
  if (!tab) {
    return;
  }
  state.bottomTab = tab;
  renderBottomPanels();
}

function acceptSuggestion() {
  const row = getSelectedRow();
  if (!row || !state.currentSuggestion) {
    return;
  }

  const oldState = {
    evidence: row.evidence,
    reasoning: row.reasoning,
    weakness_flags: [...(row.weakness_flags || [])],
  };

  row.evidence = state.currentSuggestion.proposed_evidence;
  row.reasoning = state.currentSuggestion.proposed_reasoning;
  row.weakness_flags = flagWeaknesses(row.evidence, row.reasoning);
  row.status = row.weakness_flags.length ? "flagged" : "updated";
  row.last_citations = state.currentSuggestion.citations || [];
  row.last_scrutiny = state.currentSuggestion.scrutiny || {};
  row.last_challenge_questions = state.currentSuggestion.challenge_questions || [];
  row.last_scores = state.currentSuggestion.scores || {};
  state.chartVersion += 1;

  const newState = { evidence: row.evidence, reasoning: row.reasoning };
  state.lastAcceptedChange = {
    rowId: row.row_id,
    oldEvidence: oldState.evidence,
    oldReasoning: oldState.reasoning,
    oldWeaknessFlags: oldState.weakness_flags,
  };
  state.versionHistory.push(
    buildVersionEntry({
      row,
      suggestion: state.currentSuggestion,
      decision: "accepted",
      summary: state.currentSuggestion.short_explanation,
      oldState,
      newState,
    }),
  );
  appendChat("assistant", `Accepted the suggestion for row ${row.row_id} and updated the chart.`);
  state.currentSuggestion = null;
  state.reviewTab = "decision";
  render();
  toast("Suggestion accepted.", "success");
}

function rejectSuggestion() {
  const row = getSelectedRow();
  if (!row || !state.currentSuggestion) {
    return;
  }

  state.versionHistory.push(
    buildVersionEntry({
      row,
      suggestion: state.currentSuggestion,
      decision: "rejected",
      summary: "User rejected the suggestion after review.",
      oldState: { evidence: row.evidence, reasoning: row.reasoning },
      newState: { evidence: row.evidence, reasoning: row.reasoning },
    }),
  );
  row.last_challenge_questions = state.currentSuggestion.challenge_questions || row.last_challenge_questions || [];
  row.last_scrutiny = state.currentSuggestion.scrutiny || row.last_scrutiny || {};
  row.last_citations = state.currentSuggestion.citations || row.last_citations || [];
  appendChat("assistant", `Rejected the suggestion for row ${row.row_id}.`);
  state.currentSuggestion = null;
  state.reviewTab = "decision";
  render();
  toast("Suggestion rejected.", "success");
}

function undoLastAcceptedChange() {
  if (!state.lastAcceptedChange) {
    toast("No accepted change is available to undo.", "error");
    return;
  }

  const row = state.rows.find((item) => item.row_id === state.lastAcceptedChange.rowId);
  if (!row) {
    toast("The last changed row could not be found.", "error");
    return;
  }

  const currentState = { evidence: row.evidence, reasoning: row.reasoning };
  row.evidence = state.lastAcceptedChange.oldEvidence;
  row.reasoning = state.lastAcceptedChange.oldReasoning;
  row.weakness_flags = state.lastAcceptedChange.oldWeaknessFlags;
  row.status = row.weakness_flags.length ? "flagged" : "original";
  state.chartVersion = Math.max(1, state.chartVersion - 1);

  state.versionHistory.push({
    version_id: nextVersionId(),
    chart_version: state.chartVersion,
    timestamp: formatTimestamp(),
    row_id: row.row_id,
    user_prompt: "Undo last accepted change",
    decision: "modified",
    old_evidence: currentState.evidence,
    new_evidence: row.evidence,
    old_reasoning: currentState.reasoning,
    new_reasoning: row.reasoning,
    confidence: "Manual",
    scores: { evidence_strength: 0, reasoning_specificity: 0, relevance: 0 },
    summary: "User restored the previous row state.",
    citations: row.last_citations || [],
    scrutiny: row.last_scrutiny || {},
    challenge_questions: row.last_challenge_questions || [],
    version_metrics: buildVersionMetrics(),
  });
  appendChat("assistant", `Restored the previous state for row ${row.row_id}.`);
  state.lastAcceptedChange = null;
  render();
  toast("Last accepted change undone.", "success");
}

async function exportChartDocx() {
  if (!state.rows.length) {
    toast("Load a workspace before exporting.", "error");
    return;
  }
  await downloadFile("/api/export/chart-docx", { rows: state.rows }, "lumenci_refined_claim_chart.docx");
}

async function exportSummaryDocx() {
  if (!state.rows.length) {
    toast("Load a workspace before exporting.", "error");
    return;
  }
  await downloadFile(
    "/api/export/summary-docx",
    { version_history: state.versionHistory, chart_rows: state.rows },
    "lumenci_version_summary.docx",
  );
}

async function exportChartCsv() {
  if (!state.rows.length) {
    toast("Load a workspace before exporting.", "error");
    return;
  }
  await downloadFile("/api/export/chart-csv", { rows: state.rows }, "lumenci_refined_claim_chart.csv");
}

function hydrateWorkspace(payload) {
  state.rows = (payload.chart_rows || []).map((row) => ({
    ...row,
    last_citations: [],
    last_scrutiny: {},
    last_challenge_questions: [],
    last_scores: {},
  }));
  state.baselineRows = cloneRows(state.rows);
  state.supportingDocs = payload.supporting_docs || [];
  state.chatHistory = [{ role: "assistant", content: payload.assistant_message }];
  state.selectedRowId = state.rows[0]?.row_id || null;
  state.currentSuggestion = null;
  state.versionHistory = [];
  state.changeCounter = 0;
  state.lastAcceptedChange = null;
  state.chartVersion = 1;
  state.reviewTab = "decision";
  state.bottomTab = "history";
  render();
}

function render() {
  syncLoadedMode();
  renderWorkflowVisibility();
  renderKpis();
  renderWorkflow();
  renderWorkspaceMetrics();
  renderChartMetrics();
  renderAssistantMetrics();
  renderSelectedRow();
  renderRows();
  renderChat();
  renderSuggestion();
  renderNeedsEvidence();
  renderReviewDrawerState();
  renderHistory();
  renderCourtPrep();
  renderBottomPanels();
}

function syncLoadedMode() {
  document.body.classList.toggle("loaded-mode", state.rows.length > 0);
}

function renderWorkflowVisibility() {
  document.body.classList.toggle("workflow-collapsed", state.workflowHidden);
  elements.workflowRail?.classList.toggle("collapsed", state.workflowHidden);
  elements.workflowPeekButton?.classList.toggle("hidden", !state.workflowHidden);
  elements.hideWorkflowButton?.setAttribute("aria-expanded", String(!state.workflowHidden));
  elements.workflowPeekButton?.setAttribute("aria-expanded", String(!state.workflowHidden));
  if (elements.hideWorkflowButton) {
    elements.hideWorkflowButton.textContent = state.workflowHidden ? "Show" : "Hide";
    elements.hideWorkflowButton.setAttribute(
      "aria-label",
      state.workflowHidden ? "Show guided flow" : "Hide guided flow",
    );
  }
}

function renderKpis() {
  const hasWorkspace = state.rows.length > 0;
  elements.kpiStrip.classList.toggle("hidden", !hasWorkspace);
  if (!hasWorkspace) {
    elements.versionPill.innerHTML = "";
    elements.kpiGrid.innerHTML = "";
    elements.improvementSummary.innerHTML = "";
    return;
  }

  const baseline = computeWorkspaceKpis(state.baselineRows);
  const current = computeWorkspaceKpis(state.rows);
  const acceptedCount = state.versionHistory.filter((entry) => entry.decision === "accepted").length;
  const metrics = [
    {
      label: "Evidence Strength",
      value: current.avgEvidence,
      detail: "of 10",
      caption: `${signedDelta(current.avgEvidence - baseline.avgEvidence)} vs v1`,
      percent: percentFromTen(current.avgEvidence),
    },
    {
      label: "Reasoning Specificity",
      value: current.avgReasoning,
      detail: "of 10",
      caption: `${signedDelta(current.avgReasoning - baseline.avgReasoning)} vs v1`,
      percent: percentFromTen(current.avgReasoning),
    },
    {
      label: "Citation Coverage",
      value: `${current.citationCoverage}%`,
      detail: "coverage",
      caption: `${signedDelta(current.citationCoverage - baseline.citationCoverage, "%")} vs v1`,
      percent: current.citationCoverage,
    },
    {
      label: "Defensibility",
      value: current.defensibility,
      detail: "of 10",
      caption: `${signedDelta(current.defensibility - baseline.defensibility)} vs v1`,
      percent: percentFromTen(current.defensibility),
    },
    {
      label: "Rows Still Risky",
      value: current.riskyRows,
      delta: signedDelta(baseline.riskyRows - current.riskyRows),
      inverse: true,
    },
    {
      label: "Accepted Changes",
      value: acceptedCount,
      delta: `${acceptedCount} applied`,
    },
  ];

  elements.versionPill.innerHTML = [
    pill(`Current version v${state.chartVersion}`),
    pill(`Started from v1`),
  ].join("");

  elements.kpiGrid.innerHTML = metrics
    .map(
      (metric) => `
        <article class="kpi-card ${metric.inverse ? "inverse" : ""}">
          ${
            typeof metric.percent === "number"
              ? renderMetricRing({
                  label: metric.label,
                  value: metric.value,
                  detail: metric.detail,
                  percent: metric.percent,
                  caption: metric.caption,
                })
              : `
                <span class="kpi-label">${escapeHtml(metric.label)}</span>
                <strong class="kpi-value">${escapeHtml(String(metric.value))}</strong>
                <span class="kpi-delta">${escapeHtml(metric.delta)}</span>
              `
          }
        </article>
      `,
    )
    .join("");

  const improvementPointers = [
    `${acceptedCount} accepted refinement step(s) have been logged in the version trail.`,
    `${current.improvedRows} row(s) now look stronger than their v1 baseline.`,
    `${current.riskyRows} row(s) still need more support or tighter reasoning.`,
    `${current.citationCoverage}% of rows currently have cited support attached to the latest accepted view.`,
  ];
  elements.improvementSummary.innerHTML = improvementPointers
    .map((item) => `<p>${escapeHtml(item)}</p>`)
    .join("");
}

function renderWorkflow() {
  const hasWorkspace = state.rows.length > 0;
  const hasSelection = Boolean(state.selectedRowId);
  const hasSuggestion = Boolean(state.currentSuggestion);
  const needsEvidence = Boolean(state.currentSuggestion?.needs_more_evidence);
  const hasDecision = state.versionHistory.length > 0;
  const currentStage = !hasWorkspace
    ? 1
    : !hasSelection
      ? 3
      : needsEvidence
        ? 4
        : hasSuggestion
          ? 5
          : hasDecision
            ? 6
            : 4;

  if (elements.workflowPeekStep) {
    elements.workflowPeekStep.textContent = String(currentStage).padStart(2, "0");
  }

  const steps = [
    {
      title: "Intake Sources",
      copy: hasWorkspace
        ? `${state.rows.length} chart row(s) loaded with ${state.supportingDocs.length} source(s).`
        : "Upload a claim chart CSV and any supporting documents.",
      status: currentStage === 1 ? "current" : "done",
    },
    {
      title: "Parse & Flag",
      copy: hasWorkspace
        ? `${state.rows.filter((row) => row.weakness_flags?.length).length} weak row(s) highlighted for review.`
        : "The parser will normalize the chart and flag weak mappings.",
      status: hasWorkspace ? "done" : "pending",
    },
    {
      title: "Select Claim Row",
      copy: hasSelection
        ? `Row ${state.selectedRowId} is active for refinement.`
        : "Choose the claim element that needs stronger evidence or reasoning.",
      status: !hasWorkspace ? "pending" : currentStage === 3 ? "current" : hasSelection ? "done" : "pending",
    },
    {
      title: "Generate Suggestion",
      copy: hasSuggestion
        ? "The assistant has analyzed the evidence and prepared a recommendation."
        : hasSelection
          ? "Use chat or a quick action to generate the next suggestion."
          : "A suggestion becomes available after a row is selected.",
      status: !hasSelection
        ? "pending"
        : needsEvidence
          ? "attention"
          : currentStage === 4
            ? "current"
            : hasSuggestion || hasDecision
              ? "done"
              : "pending",
    },
    {
      title: "Review Decision",
      copy: needsEvidence
        ? "More technical support is needed before a strong update can be approved."
        : hasSuggestion
          ? "Compare the diff, check sources, then accept, modify, or reject."
          : hasDecision
            ? "At least one decision has been logged in the version timeline."
            : "The review drawer will hold the next AI recommendation.",
      status: needsEvidence
        ? "attention"
        : currentStage === 5
          ? "current"
          : hasDecision
            ? "done"
            : "pending",
    },
    {
      title: "Export Deliverables",
      copy: hasDecision
        ? "Word and CSV exports are ready when you want to close the loop."
        : "Exports become most useful after at least one accepted or rejected change.",
      status: currentStage === 6 ? "current" : "pending",
    },
  ];

  elements.workflowSteps.innerHTML = steps
    .map(
      (step, index) => `
        <article
          class="workflow-step ${step.status}"
          title="${escapeHtml(step.title)}"
          aria-label="${escapeHtml(`${step.title}. ${step.copy}`)}"
        >
          <span class="workflow-step-index">0${index + 1}</span>
          <strong class="workflow-step-title">${escapeHtml(step.title)}</strong>
          <p class="workflow-step-copy">${escapeHtml(step.copy)}</p>
        </article>
      `,
    )
    .join("");
}

function renderWorkspaceMetrics() {
  const flaggedCount = state.rows.filter((row) => row.weakness_flags?.length).length;
  elements.workspaceMetrics.innerHTML = [
    pill(`${state.rows.length} rows`),
    pill(`${state.supportingDocs.length} support sources`),
    pill(`${flaggedCount} weak rows`),
  ].join("");
}

function renderChartMetrics() {
  elements.chartMetrics.innerHTML = [
    pill(state.selectedRowId ? `Row ${state.selectedRowId} selected` : "No row selected"),
    pill(state.currentSuggestion ? "Suggestion ready" : "No pending suggestion"),
  ].join("");
}

function renderAssistantMetrics() {
  elements.assistantMetrics.innerHTML = [
    pill(`${state.chatHistory.length} chat turns`),
    pill(`${state.versionHistory.length} logged events`),
  ].join("");
}

function renderSelectedRow() {
  const row = getSelectedRow();
  if (!row) {
    elements.selectedRowSpotlight.className = "selected-row-spotlight empty-state";
    elements.selectedRowSpotlight.textContent =
      "Select a row to inspect evidence, reasoning, and weakness signals.";
    return;
  }

  elements.selectedRowSpotlight.className = "selected-row-spotlight";
  elements.selectedRowSpotlight.innerHTML = `
    <div class="spotlight-top">
      <div>
        <p class="eyebrow">Selected Row ${row.row_id}</p>
        <h3>${escapeHtml(row.claim_element)}</h3>
      </div>
      <div class="row-meta">
        ${statusBadge(row.status)}
        ${(row.weakness_flags || []).map(flagBadge).join("")}
      </div>
    </div>
    <div class="spotlight-columns">
      <article>
        <strong>Claim Element</strong>
        ${renderTextBlock(row.claim_element)}
      </article>
      <article>
        <strong>Evidence</strong>
        ${renderTextBlock(row.evidence || "No evidence mapped yet.")}
      </article>
      <article>
        <strong>Reasoning</strong>
        ${renderTextBlock(row.reasoning || "No reasoning mapped yet.")}
      </article>
    </div>
  `;
}

function renderRows() {
  if (!state.rows.length) {
    elements.chartRows.innerHTML = "";
    return;
  }

  elements.chartRows.innerHTML = state.rows
    .map(
      (row) => `
        <article class="chart-row ${row.row_id === state.selectedRowId ? "selected" : ""}" data-row-id="${row.row_id}">
          <div class="chart-cell">
            <strong>Row ${row.row_id}</strong>
            ${renderTextBlock(truncate(row.claim_element, 180))}
            <div class="row-meta">
              ${statusBadge(row.status)}
              ${(row.weakness_flags || []).map(flagBadge).join("")}
            </div>
          </div>
          <div class="chart-cell">${renderTextBlock(truncate(row.evidence || "No evidence mapped yet.", 210))}</div>
          <div class="chart-cell">${renderTextBlock(truncate(row.reasoning || "No reasoning mapped yet.", 210))}</div>
        </article>
      `,
    )
    .join("");
}

function renderChat() {
  elements.chatLog.innerHTML = state.chatHistory
    .map(
      (message) => `
        <article class="message ${message.role === "user" ? "message-user" : ""}">
          <span class="message-role">${message.role}</span>
          ${renderTextBlock(message.content)}
        </article>
      `,
    )
    .join("");
  elements.composerHint.textContent = state.currentSuggestion
    ? "Review the suggestion below. You can accept it, reject it, or send a follow-up prompt."
    : "The selected row stays unchanged until you accept a suggestion.";
}

function renderSuggestion() {
  const suggestion = state.currentSuggestion;
  if (!suggestion) {
    elements.suggestionCard.classList.add("hidden");
    elements.suggestionCard.innerHTML = "";
    return;
  }

  const scores = suggestion.scores || {};
  const scrutiny = suggestion.scrutiny || {};
  const citationCoverage = scrutiny.citation_coverage ?? ((suggestion.citations || []).length ? 100 : 0);
  const confidencePercent = percentFromConfidence(suggestion.confidence);
  const citationCount = (suggestion.citations || []).length;
  const tabs = [
    { id: "decision", label: "Decision" },
    { id: "citations", label: "Citations" },
    { id: "scrutiny", label: "Scrutiny" },
    { id: "challenge", label: "Challenge" },
  ];
  elements.suggestionCard.classList.remove("hidden");
  elements.suggestionCard.innerHTML = `
    <div class="suggestion-card-header">
      <div>
        <h3>Row ${suggestion.row_id} recommendation</h3>
        <p class="suggestion-card-intro">
          Review the proposed evidence and reasoning, inspect citations, and decide whether this update is strong enough to apply.
        </p>
      </div>
      <span class="confidence-badge ${String(suggestion.confidence).toLowerCase()}">
        ${escapeHtml(suggestion.confidence)} confidence
      </span>
    </div>
    <div class="suggestion-card-pills">
      ${pill(`Row ${suggestion.row_id}`)}
      ${pill(`${(suggestion.sources || []).length} source snippet(s)`)}
      ${pill(`Mode: ${suggestion.mode}`)}
    </div>
    <div class="metric-ring-grid">
      <section class="metric-panel">
        ${renderMetricRing({
          label: "AI Confidence",
          value: `${confidencePercent}%`,
          detail: String(suggestion.confidence || "pending").toLowerCase(),
          percent: confidencePercent,
          caption: "Model confidence for this suggestion",
        })}
      </section>
      <section class="metric-panel">
        ${renderMetricRing({
          label: "Scrutiny Score",
          value: scrutiny.scrutiny_score ?? "--",
          detail: scrutiny.scrutiny_score == null ? "pending" : "of 10",
          percent: percentFromTen(scrutiny.scrutiny_score ?? 0),
          caption: scrutiny.risk_level ? `${scrutiny.risk_level} residual risk` : "Risk summary pending",
          tone: scrutiny.scrutiny_score == null ? "neutral" : undefined,
        })}
      </section>
      <section class="metric-panel">
        ${renderMetricRing({
          label: "Citation Coverage",
          value: `${citationCoverage}%`,
          detail: citationCount ? `${citationCount} citation${citationCount === 1 ? "" : "s"}` : "none yet",
          percent: citationCoverage,
          caption: citationCount ? `${citationCount} mapped citation(s)` : "No citations yet",
        })}
      </section>
    </div>
    <div class="review-tab-bar">
      ${tabs
        .map(
          (tab) => `
            <button class="review-tab ${state.reviewTab === tab.id ? "active" : ""}" data-tab="${tab.id}">
              ${escapeHtml(tab.label)}
            </button>
          `,
        )
        .join("")}
    </div>
    <div class="suggestion-tab-content">
      ${renderSuggestionTabContent(suggestion, scores)}
    </div>
    <div class="review-actions">
      <button class="btn btn-primary" data-action="accept">Accept suggestion</button>
      <button class="btn btn-secondary" data-action="modify">Modify via chat</button>
      <button class="btn btn-ghost" data-action="reject">Reject suggestion</button>
    </div>
  `;
}

function renderNeedsEvidence() {
  const suggestion = state.currentSuggestion;
  if (!suggestion?.needs_more_evidence) {
    elements.needsEvidenceCard.classList.add("hidden");
    elements.needsEvidenceCard.innerHTML = "";
    return;
  }

  elements.needsEvidenceCard.classList.remove("hidden");
  elements.needsEvidenceCard.innerHTML = `
    <p class="eyebrow">More Evidence Needed</p>
    <h3>Insufficient technical support for row ${suggestion.row_id}</h3>
    ${renderTextBlock(suggestion.short_explanation)}
    ${renderTextBlock(suggestion.suggested_follow_up)}
    <div class="evidence-need-actions" style="margin-top: 14px;">
      ${pill(`${state.supportingDocs.length} sources currently loaded`)}
      ${pill("Append evidence or ingest a URL to continue")}
    </div>
    <div class="evidence-cta">
      <button class="btn btn-primary" data-action="focus-upload">Upload supporting docs</button>
      <button class="btn btn-secondary" data-action="focus-url">Provide source URL</button>
    </div>
  `;
}

function renderReviewDrawerState() {
  const hasReviewContent = Boolean(state.currentSuggestion);
  elements.reviewDrawerEmpty?.classList.toggle("hidden", hasReviewContent);
  elements.reviewPanelBody?.classList.toggle("hidden", !hasReviewContent);
}

function renderHistory() {
  if (!state.versionHistory.length) {
    elements.historyList.innerHTML = `
      <div class="history-item">
        <p>No workflow events logged yet.</p>
        <p>Accept, reject, modify, or undo a suggestion to populate the version timeline.</p>
      </div>
    `;
    return;
  }

  elements.historyList.innerHTML = [...state.versionHistory]
    .reverse()
    .map(
      (entry) => `
        <article class="history-item">
          <div class="history-header">
            <strong>Step ${entry.version_id} • v${entry.chart_version || 1}</strong>
            <span class="status-badge ${escapeHtml(entry.decision)}">${escapeHtml(entry.decision)}</span>
          </div>
          <p><strong>Row:</strong> ${entry.row_id}</p>
          <p><strong>Timestamp:</strong> ${escapeHtml(entry.timestamp)}</p>
          <p><strong>Prompt:</strong> ${escapeHtml(entry.user_prompt)}</p>
          <p>${escapeHtml(entry.summary)}</p>
          ${
            entry.version_metrics
              ? `<div class="row-meta">
                   ${pill(`Evidence ${entry.version_metrics.evidence_delta || "n/a"}`)}
                   ${pill(`Reasoning ${entry.version_metrics.reasoning_delta || "n/a"}`)}
                   ${pill(`Citations ${entry.version_metrics.citation_delta || "n/a"}`)}
                 </div>`
              : ""
          }
        </article>
      `,
    )
    .join("");
}

function renderCourtPrep() {
  const row = getSelectedRow();
  const fallbackEntry = [...state.versionHistory]
    .reverse()
    .find((entry) => (entry.challenge_questions || []).length);
  const questions =
    state.currentSuggestion?.challenge_questions ||
    row?.last_challenge_questions ||
    fallbackEntry?.challenge_questions ||
    [];

  if (!questions.length) {
    elements.courtPrepPanel.innerHTML = `
      <p class="subtle-text">
        Generate or review a suggestion to surface challenge questions, likely objections, and preparation notes.
      </p>
    `;
    return;
  }

  elements.courtPrepPanel.innerHTML = questions
    .map(
      (item) => `
        <article class="court-question">
          <div class="history-header">
            <strong>${escapeHtml(item.question)}</strong>
            <span class="confidence-badge ${String(item.severity || "medium").toLowerCase()}">
              ${escapeHtml(item.severity || "Medium")}
            </span>
          </div>
          <p><strong>Why it matters:</strong> ${escapeHtml(item.why_it_matters)}</p>
          <p><strong>Prepare:</strong> ${escapeHtml(item.how_to_prepare)}</p>
        </article>
      `,
    )
    .join("");
}

function renderBottomPanels() {
  const tabs = [...document.querySelectorAll(".bottom-tab")];
  tabs.forEach((tabButton) => {
    tabButton.classList.toggle("active", tabButton.dataset.bottomTab === state.bottomTab);
  });

  elements.historyTabPanel?.classList.toggle("hidden", state.bottomTab !== "history");
  elements.courtTabPanel?.classList.toggle("hidden", state.bottomTab !== "court");
  elements.exportTabPanel?.classList.toggle("hidden", state.bottomTab !== "export");
}

function buildVersionEntry({ row, suggestion, decision, summary, oldState, newState }) {
  const versionMetrics = buildVersionMetrics();
  return {
    version_id: nextVersionId(),
    chart_version: state.chartVersion,
    timestamp: formatTimestamp(),
    row_id: row.row_id,
    user_prompt: suggestion.request,
    decision,
    old_evidence: oldState.evidence,
    new_evidence: newState.evidence,
    old_reasoning: oldState.reasoning,
    new_reasoning: newState.reasoning,
    confidence: suggestion.confidence,
    scores: suggestion.scores,
    summary,
    citations: suggestion.citations || [],
    scrutiny: suggestion.scrutiny || {},
    challenge_questions: suggestion.challenge_questions || [],
    version_metrics: versionMetrics,
  };
}

function nextVersionId() {
  state.changeCounter += 1;
  return state.changeCounter;
}

function setWorkflowHidden(hidden) {
  state.workflowHidden = hidden;
  persistWorkflowVisibility(hidden);
  renderWorkflowVisibility();
}

function appendChat(role, content) {
  state.chatHistory.push({ role, content });
}

function buildSuggestionChatMessage(rowId, suggestion) {
  const lines = [
    `Prepared a ${String(suggestion.confidence || "medium").toLowerCase()}-confidence suggestion for row ${rowId}.`,
    "",
    `Suggested evidence: ${truncate(suggestion.proposed_evidence || "No proposed evidence.", 220)}`,
    "",
    `Suggested reasoning: ${truncate(suggestion.proposed_reasoning || "No proposed reasoning.", 220)}`,
  ];

  if (suggestion.needs_more_evidence) {
    lines.push("", `Needs more evidence: ${suggestion.suggested_follow_up || "Upload more technical material or ingest a URL."}`);
  } else {
    lines.push("", "Open the review drawer to compare the diff, inspect citations, and accept, reject, or modify.");
  }

  return lines.join("\n");
}

function getSelectedRow() {
  return state.rows.find((row) => row.row_id === state.selectedRowId) || null;
}

function truncate(value, maxLength) {
  if (!value || value.length <= maxLength) {
    return value;
  }
  return `${value.slice(0, maxLength - 1)}...`;
}

function loadWorkflowVisibility() {
  try {
    return window.localStorage.getItem(WORKFLOW_VISIBILITY_KEY) === "true";
  } catch (error) {
    return false;
  }
}

function persistWorkflowVisibility(hidden) {
  try {
    window.localStorage.setItem(WORKFLOW_VISIBILITY_KEY, String(hidden));
  } catch (error) {
    // Ignore storage access failures so the workflow rail still toggles in-session.
  }
}

function flagWeaknesses(evidence, reasoning) {
  const flags = [];
  const weakTerms = ["marketing", "innovative", "smart", "seamless", "best-in-class"];
  const hedgingTerms = ["may", "might", "could", "suggests", "appears", "possibly"];
  const normalizedEvidence = String(evidence || "").toLowerCase();
  const normalizedReasoning = String(reasoning || "").toLowerCase();

  if (!normalizedEvidence.trim()) {
    flags.push("missing_mapping");
  } else if (weakTerms.some((term) => normalizedEvidence.includes(term)) || normalizedEvidence.split(/\s+/).length < 6) {
    flags.push("weak_evidence");
  }

  if (!normalizedReasoning.trim()) {
    flags.push("vague_reasoning");
  } else if (
    hedgingTerms.some((term) => normalizedReasoning.includes(term)) ||
    normalizedReasoning.split(/\s+/).length < 10
  ) {
    flags.push("vague_reasoning");
  }

  return [...new Set(flags)];
}

function pill(text) {
  return `<span class="metric-pill">${escapeHtml(text)}</span>`;
}

function statusBadge(status) {
  return `<span class="status-badge ${escapeHtml(status)}">${escapeHtml(status)}</span>`;
}

function flagBadge(flag) {
  return `<span class="flag-badge">${escapeHtml(flag.replaceAll("_", " "))}</span>`;
}

function scoreCard(label, value) {
  return `<div class="score-card"><h4>${escapeHtml(label)}</h4><strong>${escapeHtml(String(value ?? "-"))}</strong></div>`;
}

function renderTextBlock(text) {
  return `<p>${escapeHtml(String(text || "")).replaceAll("\n", "<br />")}</p>`;
}

function buildVersionMetrics() {
  const baseline = computeWorkspaceKpis(state.baselineRows);
  const current = computeWorkspaceKpis(state.rows);
  return {
    evidence_delta: signedDelta(current.avgEvidence - baseline.avgEvidence),
    reasoning_delta: signedDelta(current.avgReasoning - baseline.avgReasoning),
    citation_delta: signedDelta(current.citationCoverage - baseline.citationCoverage, "%"),
    defensibility_delta: signedDelta(current.defensibility - baseline.defensibility),
    risky_rows: current.riskyRows,
    improved_rows: current.improvedRows,
  };
}

function computeWorkspaceKpis(rows) {
  if (!rows || !rows.length) {
    return {
      avgEvidence: 0,
      avgReasoning: 0,
      citationCoverage: 0,
      defensibility: 0,
      riskyRows: 0,
      improvedRows: 0,
    };
  }

  const total = rows.length;
  let evidenceTotal = 0;
  let reasoningTotal = 0;
  let defensibilityTotal = 0;
  let citedRows = 0;
  let riskyRows = 0;
  let improvedRows = 0;

  rows.forEach((row, index) => {
    const evidence = row.last_scores?.evidence_strength ?? heuristicEvidenceScore(row);
    const reasoning = row.last_scores?.reasoning_specificity ?? heuristicReasoningScore(row);
    const defensibility = row.last_scrutiny?.scrutiny_score ?? roundToOne((evidence + reasoning + heuristicRelevance(row) + (row.last_citations?.length ? 8 : 4)) / 4);
    evidenceTotal += evidence;
    reasoningTotal += reasoning;
    defensibilityTotal += defensibility;
    if (row.last_citations?.length) {
      citedRows += 1;
    }
    if (row.weakness_flags?.length) {
      riskyRows += 1;
    }

    const baselineRow = state.baselineRows[index];
    if (baselineRow) {
      const baselineStrength = heuristicEvidenceScore(baselineRow) + heuristicReasoningScore(baselineRow);
      const currentStrength = evidence + reasoning;
      if (currentStrength > baselineStrength) {
        improvedRows += 1;
      }
    }
  });

  return {
    avgEvidence: roundToOne(evidenceTotal / total),
    avgReasoning: roundToOne(reasoningTotal / total),
    citationCoverage: Math.round((citedRows / total) * 100),
    defensibility: roundToOne(defensibilityTotal / total),
    riskyRows,
    improvedRows,
  };
}

function heuristicEvidenceScore(row) {
  let score = 4;
  const text = String(row.evidence || "");
  if (text.length > 90) {
    score += 2;
  }
  if (text.length > 150) {
    score += 1;
  }
  if (!(row.weakness_flags || []).includes("missing_mapping")) {
    score += 1;
  }
  if (!(row.weakness_flags || []).includes("weak_evidence")) {
    score += 1;
  }
  if (row.last_citations?.length) {
    score += 1;
  }
  return Math.min(score, 10);
}

function heuristicReasoningScore(row) {
  let score = 4;
  const text = String(row.reasoning || "");
  if (text.length > 90) {
    score += 2;
  }
  if (text.length > 150) {
    score += 1;
  }
  if (!(row.weakness_flags || []).includes("vague_reasoning")) {
    score += 2;
  }
  return Math.min(score, 10);
}

function heuristicRelevance(row) {
  const evidence = String(row.evidence || "").toLowerCase();
  const claimTokens = String(row.claim_element || "")
    .toLowerCase()
    .split(/\s+/)
    .filter((token) => token.length > 4)
    .slice(0, 4);
  const matches = claimTokens.filter((token) => evidence.includes(token)).length;
  return Math.min(10, 5 + matches);
}

function signedDelta(value, suffix = "") {
  const rounded = roundToOne(value);
  const sign = rounded > 0 ? "+" : "";
  return `${sign}${rounded}${suffix}`;
}

function roundToOne(value) {
  return Math.round(Number(value) * 10) / 10;
}

function percentFromTen(value) {
  const numeric = Number(value) || 0;
  return Math.max(0, Math.min(100, numeric * 10));
}

function percentFromConfidence(confidence) {
  const normalized = String(confidence || "").toLowerCase();
  if (normalized === "high") {
    return 86;
  }
  if (normalized === "medium") {
    return 62;
  }
  if (normalized === "low") {
    return 36;
  }
  return 50;
}

function renderMetricRing({ label, value, percent, caption = "", detail = "", tone }) {
  const normalizedPercent = Math.max(0, Math.min(100, Number(percent) || 0));
  const metricTone = tone || resolveMetricTone(normalizedPercent);
  const accessibilityLabel = [label, value, detail, caption].filter(Boolean).join(". ");
  return `
    <div
      class="metric-ring metric-ring--${metricTone}"
      style="--metric-progress:${normalizedPercent};"
      role="img"
      aria-label="${escapeHtml(accessibilityLabel)}"
    >
      <div class="metric-ring__chart">
        <div class="metric-ring__center">
          <strong class="metric-ring__value">${escapeHtml(String(value))}</strong>
          <span class="metric-ring__detail">${escapeHtml(String(detail || `${Math.round(normalizedPercent)}% signal`))}</span>
        </div>
      </div>
      <div class="metric-ring__meta">
        <span class="metric-ring__label">${escapeHtml(String(label))}</span>
        <span class="metric-ring__caption">${escapeHtml(String(caption || ""))}</span>
      </div>
    </div>
  `;
}

function resolveMetricTone(percent) {
  const normalizedPercent = Math.max(0, Math.min(100, Number(percent) || 0));
  if (normalizedPercent >= 76) {
    return "strong";
  }
  if (normalizedPercent >= 46) {
    return "steady";
  }
  return "watch";
}

function cloneRows(rows) {
  return JSON.parse(JSON.stringify(rows || []));
}

function renderUnifiedDiff(title, diffText) {
  const { additions, removals } = parseUnifiedDiff(diffText);
  if (!additions.length && !removals.length) {
    return `
      <section class="diff-panel">
        <div class="diff-panel-header">
          <h4>${escapeHtml(title)}</h4>
          ${pill("No change")}
        </div>
        <p class="diff-panel-empty">No textual changes were generated for this section.</p>
      </section>
    `;
  }

  return `
    <section class="diff-panel">
      <div class="diff-panel-header">
        <h4>${escapeHtml(title)}</h4>
        <div class="diff-panel-summary">
          ${additions.length ? pill(`${additions.length} addition${additions.length === 1 ? "" : "s"}`) : ""}
          ${removals.length ? pill(`${removals.length} removal${removals.length === 1 ? "" : "s"}`) : ""}
        </div>
      </div>
      <div class="diff-panel-body">
        ${removals.length ? renderDiffChangeCard("Removed Wording", removals, "removal") : ""}
        ${additions.length ? renderDiffChangeCard("Added Wording", additions, "addition") : ""}
      </div>
    </section>
  `;
}

function parseUnifiedDiff(diffText) {
  return String(diffText || "")
    .split(/\r?\n/)
    .reduce(
      (parts, rawLine) => {
        const line = String(rawLine || "");
        if (!line.trim() || line.startsWith("+++") || line.startsWith("---") || line.startsWith("@@")) {
          return parts;
        }
        if (line.startsWith("+")) {
          parts.additions.push(line.slice(1).trim());
          return parts;
        }
        if (line.startsWith("-")) {
          parts.removals.push(line.slice(1).trim());
        }
        return parts;
      },
      { additions: [], removals: [] },
    );
}

function renderDiffChangeCard(title, entries, tone) {
  return `
    <section class="diff-change-card diff-change-card--${tone}">
      <div class="diff-change-card__header">
        <span class="diff-change-card__label">${escapeHtml(title)}</span>
      </div>
      <div class="diff-change-list">
        ${entries
          .map(
            (entry) => `
              <p class="diff-change-line">${escapeHtml(String(entry || "")).replaceAll("\n", "<br />")}</p>
            `,
          )
          .join("")}
      </div>
    </section>
  `;
}

function renderSuggestionTabContent(suggestion, scores) {
  if (state.reviewTab === "citations") {
    return `
      <div class="source-list">
        ${(suggestion.citations || []).length
          ? suggestion.citations
              .map(
                (citation) => `
                  <section class="source-snippet">
                    <div class="history-header">
                      <h4>${escapeHtml(citation.citation_id)} • ${escapeHtml(citation.source_name)}</h4>
                      ${pill(`match ${citation.score || 0}`)}
                    </div>
                    ${renderTextBlock(citation.snippet)}
                    ${renderTextBlock(`Why this was used: ${citation.use_reason}`)}
                  </section>
                `,
              )
              .join("")
          : `<section class="source-snippet"><h4>Source basis</h4>${renderTextBlock(
              "No citation-backed evidence is available yet for this suggestion.",
            )}</section>`}
      </div>
    `;
  }

  if (state.reviewTab === "scrutiny") {
    const scrutiny = suggestion.scrutiny || {};
    return `
      <div class="scores-row">
        ${scoreCard("Evidence", scores.evidence_strength)}
        ${scoreCard("Reasoning", scores.reasoning_specificity)}
        ${scoreCard("Relevance", scores.relevance)}
        ${scoreCard("Scrutiny", scrutiny.scrutiny_score ?? scores.overall_confidence)}
      </div>
      <div class="comparison-grid">
        <section class="comparison-block">
          <h4>Residual Risk</h4>
          ${renderTextBlock(scrutiny.summary || "No scrutiny summary available.")}
          ${renderTextBlock(`Risk level: ${scrutiny.risk_level || "Unknown"}`)}
          ${renderTextBlock(`Citation coverage: ${scrutiny.citation_coverage ?? 0}%`)}
        </section>
        <section class="comparison-block">
          <h4>Next Steps</h4>
          ${(scrutiny.next_steps || []).map((item) => renderTextBlock(`• ${item}`)).join("")}
        </section>
      </div>
      <div class="comparison-grid">
        <section class="comparison-block">
          <h4>Strengths</h4>
          ${(scrutiny.strengths || []).map((item) => renderTextBlock(`• ${item}`)).join("") || renderTextBlock("No strengths logged yet.")}
        </section>
        <section class="comparison-block">
          <h4>Risks</h4>
          ${(scrutiny.risks || []).map((item) => renderTextBlock(`• ${item}`)).join("") || renderTextBlock("No risks logged yet.")}
        </section>
      </div>
    `;
  }

  if (state.reviewTab === "challenge") {
    return `
      <div class="source-list">
        ${(suggestion.challenge_questions || []).length
          ? suggestion.challenge_questions
              .map(
                (item) => `
                  <section class="source-snippet">
                    <div class="history-header">
                      <h4>${escapeHtml(item.question)}</h4>
                      <span class="confidence-badge ${String(item.severity || "medium").toLowerCase()}">
                        ${escapeHtml(item.severity || "Medium")}
                      </span>
                    </div>
                    ${renderTextBlock(`Why it matters: ${item.why_it_matters}`)}
                    ${renderTextBlock(`How to prepare: ${item.how_to_prepare}`)}
                  </section>
                `,
              )
              .join("")
          : renderTextBlock("No challenge-readiness guidance is available yet.")}
      </div>
    `;
  }

  return `
    <div class="diff-first-shell">
      <div class="diff-summary-grid">
        <section class="mini-diff-card">
          <h4>Evidence Change</h4>
          ${renderTextBlock(`Before: ${truncate(suggestion.current_evidence || "Empty", 120)}\nAfter: ${truncate(suggestion.proposed_evidence || "Empty", 120)}`)}
        </section>
        <section class="mini-diff-card">
          <h4>Reasoning Change</h4>
          ${renderTextBlock(`Before: ${truncate(suggestion.current_reasoning || "Empty", 120)}\nAfter: ${truncate(suggestion.proposed_reasoning || "Empty", 120)}`)}
        </section>
      </div>
      <div class="diff-panels">
        ${renderUnifiedDiff("Evidence Diff", suggestion.evidence_diff)}
        ${renderUnifiedDiff("Reasoning Diff", suggestion.reasoning_diff)}
      </div>
    </div>
    <div class="suggestion-block">
      <h4>Rationale</h4>
      ${renderTextBlock(suggestion.short_explanation)}
    </div>
    <div class="comparison-grid">
      <section class="comparison-block">
        <h4>Current Row Snapshot</h4>
        ${renderTextBlock(`Evidence:\n${suggestion.current_evidence || "Empty"}`)}
        ${renderTextBlock(`Reasoning:\n${suggestion.current_reasoning || "Empty"}`)}
      </section>
      <section class="comparison-block">
        <h4>Proposed Row Snapshot</h4>
        ${renderTextBlock(`Evidence:\n${suggestion.proposed_evidence || "Empty"}`)}
        ${renderTextBlock(`Reasoning:\n${suggestion.proposed_reasoning || "Empty"}`)}
      </section>
    </div>
    <div class="scores-row">
      ${scoreCard("Evidence", scores.evidence_strength)}
      ${scoreCard("Reasoning", scores.reasoning_specificity)}
      ${scoreCard("Relevance", scores.relevance)}
      ${scoreCard("Overall", scores.overall_confidence)}
    </div>
  `;
}

function formatTimestamp() {
  return new Date().toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

async function postJson(url, payload) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return readJsonResponse(response);
}

async function readJsonResponse(response) {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.detail || "Request failed.");
  }
  return payload;
}

async function downloadFile(url, payload, filename) {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const errorPayload = await response.json().catch(() => ({}));
      throw new Error(errorPayload.detail || "Export failed.");
    }
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(objectUrl);
    toast(`Downloaded ${filename}.`, "success");
  } catch (error) {
    toast(error.message, "error");
  }
}

function toast(message, type = "success") {
  const node = document.createElement("div");
  node.className = `toast ${type}`;
  node.textContent = message;
  elements.toastHost.appendChild(node);
  window.setTimeout(() => node.remove(), 3200);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
