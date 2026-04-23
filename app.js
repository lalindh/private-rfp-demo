const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const analyzeButton = document.getElementById('analyze-button');
const openReportButton = document.getElementById('open-report-button');
const clearButton = document.getElementById('clear-button');
const fileList = document.getElementById('file-list');

const statusTitle = document.getElementById('status-title');
const statusText = document.getElementById('status-text');
const suggestedNextStepTitle = document.getElementById('suggested-next-step-title');
const suggestedNextStepText = document.getElementById('suggested-next-step-text');

const apiStatusTitle = document.getElementById('api-status-title');
const apiMessage = document.getElementById('api-message');

const loadingPanel = document.getElementById('loading-panel');
const loadingTitle = document.getElementById('loading-title');
const loadingText = document.getElementById('loading-text');

const workspaceView = document.getElementById('workspace-view');
const reportView = document.getElementById('report-view');

const reportTitle = document.getElementById('report-title');
const reportSubtitle = document.getElementById('report-subtitle');
const reportStatusBadge = document.getElementById('report-status-badge');
const reportWorkflowPattern = document.getElementById('report-workflow-pattern');
const reportWorkflowStages = document.getElementById('report-workflow-stages');
const reportDocCount = document.getElementById('report-doc-count');
const reportWorkstream = document.getElementById('report-workstream');
const reportReadiness = document.getElementById('report-readiness');
const reportExecutiveSummary = document.getElementById('report-executive-summary');
const reportScopeSignals = document.getElementById('report-scope-signals');
const reportRiskFlags = document.getElementById('report-risk-flags');
const reportRecommendedActions = document.getElementById('report-recommended-actions');
const reportCatalogMatches = document.getElementById('report-catalog-matches');
const reportProposalPageSections = document.getElementById('report-proposal-page-sections');
const reportRequirements = document.getElementById('report-requirements');
const reportAssumptions = document.getElementById('report-assumptions');
const reportGaps = document.getElementById('report-gaps');
const reportEvaluationFocus = document.getElementById('report-evaluation-focus');
const reportResponseOutline = document.getElementById('report-response-outline');
const reportDetectedSignals = document.getElementById('report-detected-signals');
const reportMissingSignals = document.getElementById('report-missing-signals');
const reportComplianceMatrix = document.getElementById('report-compliance-matrix');
const analysisFeed = document.getElementById('analysis-feed');
const backToWorkspaceLink = document.getElementById('back-to-workspace-link');

const kpiDetected = document.getElementById('kpi-detected');
const kpiAssumed = document.getElementById('kpi-assumed');
const kpiGap = document.getElementById('kpi-gap');
const kpiNeedsReview = document.getElementById('kpi-needs-review');
const kpiMapped = document.getElementById('kpi-mapped');
const kpiHighConfidence = document.getElementById('kpi-high-confidence');
const kpiUnclear = document.getElementById('kpi-unclear');
const kpiGapCount = document.getElementById('kpi-gap-count');

const matrixSearch = document.getElementById('matrix-search');
const matrixTypeFilter = document.getElementById('matrix-type-filter');
const matrixFitFilter = document.getElementById('matrix-fit-filter');
const filterButtons = Array.from(document.querySelectorAll('[data-filter]'));

let selectedFiles = [];
let latestReport = null;
let activeMatrixFilter = 'all';
let activeMatrixSearch = '';
let activeTypeFilter = 'all';
let activeFitFilter = 'all';

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getExtension(name) {
  const parts = name.split('.');
  return parts.length > 1 ? parts.pop().toUpperCase() : 'FILE';
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function renderView() {
  const isReportRoute = window.location.pathname === '/report';
  workspaceView.classList.toggle('hidden', isReportRoute);
  reportView.classList.toggle('hidden', !isReportRoute);
}

function goToReport() {
  window.history.pushState({}, '', '/report');
  renderView();
}

function goToWorkspace() {
  window.history.pushState({}, '', '/');
  renderView();
}

function setLoading(isLoading, title = '', text = '') {
  if (!loadingPanel) return;

  loadingPanel.classList.toggle('hidden', !isLoading);

  if (isLoading) {
    loadingTitle.textContent = title || 'Preparing analysis';
    loadingText.textContent = text || 'The system is processing the selected files.';
  }
}

function renderBasicList(container, items, variant, emptyText) {
  if (!container) return;

  if (!items || !items.length) {
    container.innerHTML = `<div class="empty-state-text">${escapeHtml(emptyText)}</div>`;
    return;
  }

  container.innerHTML = items.map(item => `
    <div class="signal-item ${variant ? `signal-item-${variant}` : ''}">
      <strong>${escapeHtml(item.title || item.section || 'Untitled')}</strong>
      <p>${escapeHtml(item.text || '')}</p>
    </div>
  `).join('');
}

function renderCatalogMatches(items) {
  if (!reportCatalogMatches) return;

  if (!items || !items.length) {
    reportCatalogMatches.innerHTML = '<div class="empty-state-text">No catalog matches available yet.</div>';
    return;
  }

  reportCatalogMatches.innerHTML = items.map(item => `
    <div class="signal-item signal-item-catalog">
      <span class="signal-meta">${escapeHtml(item.level || 'Scenario')} · ${escapeHtml(item.type || 'Process id')}</span>
      <strong>${escapeHtml(item.name || 'Unnamed catalog match')}</strong>
      <p>${escapeHtml(item.rationale || '')}</p>
    </div>
  `).join('');
}

function renderProposalPageSections(items) {
  if (!reportProposalPageSections) return;

  if (!items || !items.length) {
    reportProposalPageSections.innerHTML = '<div class="empty-state-text">No proposal sections available yet.</div>';
    return;
  }

  reportProposalPageSections.innerHTML = items.map(item => `
    <div class="signal-item signal-item-section">
      <strong>${escapeHtml(item.title || 'Untitled section')}</strong>
      <p>${escapeHtml(item.text || '')}</p>
    </div>
  `).join('');
}

function renderRequirements(items) {
  if (!reportRequirements) return;

  if (!items || !items.length) {
    reportRequirements.innerHTML = '<div class="empty-state-text">No requirements available yet.</div>';
    return;
  }

  reportRequirements.innerHTML = items.map(item => `
    <div class="signal-item signal-item-requirement">
      <span class="signal-meta">${escapeHtml(item.requirementId || 'REQ')} · ${escapeHtml(item.requirementType || 'Requirement')} · ${escapeHtml(item.fitType || 'Fit')}</span>
      <strong>${escapeHtml(item.requirementTitle || 'Untitled requirement')}</strong>
      <p>${escapeHtml(item.requirementText || '')}</p>
      <p>${escapeHtml(item.processArea || '')} → ${escapeHtml(item.process || '')}</p>
    </div>
  `).join('');
}

function renderAssumptions(items) {
  if (!reportAssumptions) return;

  if (!items || !items.length) {
    reportAssumptions.innerHTML = '<div class="empty-state-text">No assumptions available yet.</div>';
    return;
  }

  reportAssumptions.innerHTML = items.map(item => `
    <div class="signal-item signal-item-assumption">
      <strong>${escapeHtml(item.title || 'Untitled assumption')}</strong>
      <p>${escapeHtml(item.text || '')}</p>
    </div>
  `).join('');
}

function renderGaps(items) {
  if (!reportGaps) return;

  if (!items || !items.length) {
    reportGaps.innerHTML = '<div class="empty-state-text">No gaps available yet.</div>';
    return;
  }

  reportGaps.innerHTML = items.map(item => `
    <div class="signal-item signal-item-gap">
      <span class="signal-meta">${escapeHtml(item.id || 'GAP')} · ${escapeHtml(item.severity || 'Severity')}</span>
      <strong>${escapeHtml(item.area || 'Untitled gap')}</strong>
      <p>${escapeHtml(item.impact || '')}</p>
      <p>${escapeHtml(item.recommendation || '')}</p>
    </div>
  `).join('');
}

function renderResponseOutline(items) {
  if (!reportResponseOutline) return;

  if (!items || !items.length) {
    reportResponseOutline.innerHTML = '<div class="empty-state-text">No response outline available yet.</div>';
    return;
  }

  reportResponseOutline.innerHTML = items.map(item => `
    <div class="signal-item signal-item-outline">
      <span class="signal-meta">${escapeHtml(item.section || 'Section')}</span>
      <p>${escapeHtml(item.text || '')}</p>
    </div>
  `).join('');
}

function renderSimpleStringList(container, items, emptyText) {
  if (!container) return;

  if (!items || !items.length) {
    container.innerHTML = `<div class="empty-state-text">${escapeHtml(emptyText)}</div>`;
    return;
  }

  container.innerHTML = items.map(item => `
    <div class="signal-item">
      <p>${escapeHtml(item)}</p>
    </div>
  `).join('');
}

function statusBadgeClass(status) {
  const normalized = String(status || '').toLowerCase().replaceAll(' ', '-');
  return `badge badge-status-${normalized}`;
}

function fitBadgeClass(value) {
  const normalized = String(value || '').toLowerCase().replaceAll(' ', '-');
  return `badge badge-fit-${normalized}`;
}

function confidenceBadgeClass(value) {
  const normalized = String(value || '').toLowerCase();
  return `badge badge-confidence-${normalized}`;
}

function getFilteredComplianceItems(items) {
  return (items || []).filter(item => {
    const matchesStatus =
      activeMatrixFilter === 'all' || item.status === activeMatrixFilter;

    const matchesType =
      activeTypeFilter === 'all' || item.requirementType === activeTypeFilter;

    const matchesFit =
      activeFitFilter === 'all' || item.fitType === activeFitFilter;

    const searchHaystack = [
      item.requirementId,
      item.requirementTitle,
      item.requirementText,
      item.requirementType,
      item.mandatoryLevel,
      item.status,
      item.fitType,
      item.confidence,
      item.endToEndScenario,
      item.processArea,
      item.process,
      item.processId,
      item.sourceDocument,
      item.sourceSection,
      item.reviewReason,
      item.responseAction
    ].join(' ').toLowerCase();

    const matchesSearch =
      !activeMatrixSearch || searchHaystack.includes(activeMatrixSearch.toLowerCase());

    return matchesStatus && matchesType && matchesFit && matchesSearch;
  });
}

function renderComplianceMatrix(items) {
  if (!reportComplianceMatrix) return;

  const filteredItems = getFilteredComplianceItems(items);

  if (!filteredItems.length) {
    reportComplianceMatrix.innerHTML = `
      <tr>
        <td colspan="13">
          <div class="empty-state-text">No compliance rows match the current filter or search.</div>
        </td>
      </tr>
    `;
    return;
  }

  reportComplianceMatrix.innerHTML = filteredItems.map(item => `
    <tr>
      <td><strong>${escapeHtml(item.requirementId || item.rowId || '')}</strong></td>
      <td>
        <div class="table-stack">
          <strong>${escapeHtml(item.requirementTitle || '')}</strong>
          <span>${escapeHtml(item.requirementText || '')}</span>
        </div>
      </td>
      <td>${escapeHtml(item.requirementType || '')}</td>
      <td>${escapeHtml(item.mandatoryLevel || '')}</td>
      <td><span class="${statusBadgeClass(item.status)}">${escapeHtml(item.status || '')}</span></td>
      <td><span class="${fitBadgeClass(item.fitType)}">${escapeHtml(item.fitType || '')}</span></td>
      <td><span class="${confidenceBadgeClass(item.confidence)}">${escapeHtml(item.confidence || '')}</span></td>
      <td>${escapeHtml(item.endToEndScenario || '')}</td>
      <td>
        <div class="table-stack">
          <strong>${escapeHtml(item.processArea || '')}</strong>
          <span class="table-mini">${escape
