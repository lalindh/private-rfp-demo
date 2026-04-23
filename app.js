const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const analyzeButton = document.getElementById('analyze-button');
const openReportButton = document.getElementById('open-report-button');
const clearButton = document.getElementById('clear-button');
const fileList = document.getElementById('file-list');
const roleFileList = document.getElementById('role-file-list');

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
let fileRoles = new Map();

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getExtension(name) {
  const parts = name.split('.');
  return parts.length > 1 ? parts.pop().toUpperCase() : 'FILE';
}

function getDefaultRole(file) {
  const name = file.name.toLowerCase();
  const ext = getExtension(file.name).toLowerCase();
  if (ext === 'xlsx' || ext === 'xls') return 'Functional requirements';
  if (name.includes('rfp') || name.includes('request for proposal')) return 'Main RFP';
  if (name.includes('commercial') || name.includes('pricing')) return 'Commercial';
  if (name.includes('evaluation')) return 'Evaluation criteria';
  return 'Other';
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
    const matchesStatus = activeMatrixFilter === 'all' || item.status === activeMatrixFilter;
    const matchesType = activeTypeFilter === 'all' || item.requirementType === activeTypeFilter;
    const matchesFit = activeFitFilter === 'all' || item.fitType === activeFitFilter;

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
      item.responseAction,
      item.documentRole,
      item.sourceMode
    ].join(' ').toLowerCase();

    const matchesSearch = !activeMatrixSearch || searchHaystack.includes(activeMatrixSearch.toLowerCase());
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
          <span class="table-mini">${escapeHtml(item.processId || '')}</span>
        </div>
      </td>
      <td>${escapeHtml(item.process || '')}</td>
      <td>
        <div class="table-stack">
          <strong>${escapeHtml(item.sourceDocument || '')}</strong>
          <span class="table-mini">${escapeHtml(item.sourceSection || '')} · Page ${escapeHtml(item.sourcePage || '')}</span>
        </div>
      </td>
      <td>${escapeHtml(item.reviewReason || '')}</td>
      <td>${escapeHtml(item.responseAction || '')}</td>
    </tr>
  `).join('');
}

function renderFeed(feed) {
  if (!analysisFeed) return;
  if (!feed || !feed.length) {
    analysisFeed.innerHTML = `
      <div class="feed-item">
        <div class="feed-dot"></div>
        <div>
          <strong>Report not generated</strong>
          <p>Return to the workspace and run an analysis to populate this view.</p>
        </div>
      </div>
    `;
    return;
  }
  analysisFeed.innerHTML = feed.map(item => `
    <div class="feed-item">
      <div class="feed-dot"></div>
      <div>
        <strong>${escapeHtml(item.title || 'Update')}</strong>
        <p>${escapeHtml(item.text || '')}</p>
      </div>
    </div>
  `).join('');
}

function renderKpis(requirements) {
  const counts = {
    detected: 0,
    assumed: 0,
    gap: 0,
    needsReview: 0,
    mapped: 0,
    highConfidence: 0,
    unclear: 0,
    gapCount: 0
  };

  (requirements || []).forEach(item => {
    if (item.status === 'Detected') counts.detected += 1;
    if (item.status === 'Assumed') counts.assumed += 1;
    if (item.status === 'Gap') counts.gap += 1;
    if (item.status === 'Needs review') counts.needsReview += 1;
    if (item.processArea && item.processArea !== 'Unmapped process area') counts.mapped += 1;
    if (item.confidence === 'High') counts.highConfidence += 1;
    if (item.fitType === 'Unclear') counts.unclear += 1;
    if (item.fitType === 'Integration gap' || item.fitType === 'Extension gap') counts.gapCount += 1;
  });

  kpiDetected.textContent = counts.detected;
  kpiAssumed.textContent = counts.assumed;
  kpiGap.textContent = counts.gap;
  kpiNeedsReview.textContent = counts.needsReview;
  kpiMapped.textContent = counts.mapped;
  kpiHighConfidence.textContent = counts.highConfidence;
  kpiUnclear.textContent = counts.unclear;
  kpiGapCount.textContent = counts.gapCount;
}

function setActiveFilter(filterValue) {
  activeMatrixFilter = filterValue;
  filterButtons.forEach(button => {
    button.classList.toggle('is-active', button.dataset.filter === filterValue);
  });
  if (latestReport) renderComplianceMatrix(latestReport.complianceMatrix || []);
}

function resetWorkspaceControls() {
  activeMatrixFilter = 'all';
  activeMatrixSearch = '';
  activeTypeFilter = 'all';
  activeFitFilter = 'all';
  if (matrixSearch) matrixSearch.value = '';
  if (matrixTypeFilter) matrixTypeFilter.value = 'all';
  if (matrixFitFilter) matrixFitFilter.value = 'all';
  filterButtons.forEach(button => {
    button.classList.toggle('is-active', button.dataset.filter === 'all');
  });
}

function resetReportView() {
  reportTitle.textContent = 'Proposal intake report';
  reportSubtitle.textContent = 'Run an analysis from the workspace to generate a structured report.';
  reportStatusBadge.textContent = 'Ready for review';
  reportWorkflowPattern.textContent = 'Sequential analysis pipeline';
  reportWorkflowStages.textContent = 'Waiting for analysis stages.';
  reportDocCount.textContent = '0 files';
  reportWorkstream.textContent = 'Not analyzed';
  reportReadiness.textContent = 'Awaiting input';
  reportExecutiveSummary.textContent = 'No report has been generated yet.';

  renderKpis([]);
  renderBasicList(reportScopeSignals, [], '', 'No scope signals yet.');
  renderBasicList(reportRiskFlags, [], 'risk', 'No risk flags yet.');
  renderBasicList(reportRecommendedActions, [], 'action', 'No actions available yet.');
  renderCatalogMatches([]);
  renderProposalPageSections([]);
  renderRequirements([]);
  renderAssumptions([]);
  renderBasicList(reportEvaluationFocus, [], '', 'No evaluation focus yet.');
  renderGaps([]);
  renderResponseOutline([]);
  renderSimpleStringList(reportDetectedSignals, [], 'No detected signals available yet.');
  renderSimpleStringList(reportMissingSignals, [], 'No missing signals available yet.');
  renderComplianceMatrix([]);
  renderFeed([]);
}

function renderRoleFiles() {
  if (!roleFileList) return;

  if (!selectedFiles.length) {
    roleFileList.innerHTML = '<div class="empty-state-text">No files selected yet.</div>';
    return;
  }

  roleFileList.innerHTML = selectedFiles.map((file, index) => {
    const role = fileRoles.get(file.name) || getDefaultRole(file);
    const isMaster = role === 'Functional requirements';
    return `
      <div class="role-file-item">
        <div class="file-meta">
          <span class="file-name">${escapeHtml(file.name)}</span>
          <span class="file-info">${escapeHtml(formatBytes(file.size))} · ${escapeHtml(file.type || 'Unknown file type')}</span>
        </div>
        <div>
          <label class="search-shell">
            <span class="search-label">Document role</span>
            <select class="role-select" data-role-index="${index}">
              <option value="Functional requirements" ${role === 'Functional requirements' ? 'selected' : ''}>Functional requirements</option>
              <option value="Main RFP" ${role === 'Main RFP' ? 'selected' : ''}>Main RFP</option>
              <option value="Commercial" ${role === 'Commercial' ? 'selected' : ''}>Commercial</option>
              <option value="Evaluation criteria" ${role === 'Evaluation criteria' ? 'selected' : ''}>Evaluation criteria</option>
              <option value="Other" ${role === 'Other' ? 'selected' : ''}>Other</option>
            </select>
          </label>
          <div style="margin-top:.65rem;">
            <span class="role-badge ${isMaster ? 'is-master' : ''}">${isMaster ? 'Requirements master' : 'Supporting file'}</span>
          </div>
        </div>
      </div>
    `;
  }).join('');

  roleFileList.querySelectorAll('.role-select').forEach(select => {
    select.addEventListener('change', event => {
      const idx = Number(event.target.dataset.roleIndex);
      const file = selectedFiles[idx];
      if (file) fileRoles.set(file.name, event.target.value);
      renderFiles();
      renderRoleFiles();
    });
  });
}

function renderFiles() {
  fileList.innerHTML = '';

  if (!selectedFiles.length) {
    analyzeButton.disabled = true;
    clearButton.disabled = true;
    openReportButton.disabled = !latestReport;

    statusTitle.textContent = 'Waiting for files';
    statusText.textContent = 'No files selected yet.';
    suggestedNextStepTitle.textContent = 'Upload sample RFP material';
    suggestedNextStepText.textContent = 'Select one or more files, assign roles, and run an analysis to preview the experience.';
    renderRoleFiles();
    return;
  }

  analyzeButton.disabled = false;
  clearButton.disabled = false;

  statusTitle.textContent = 'Files ready';
  statusText.textContent = `${selectedFiles.length} file(s) loaded and ready for analysis.`;
  suggestedNextStepTitle.textContent = 'Assign document roles';
  suggestedNextStepText.textContent = 'Mark the Excel file containing functional requirements as the master source before analyzing.';

  selectedFiles.forEach(file => {
    const item = document.createElement('div');
    item.className = 'file-item';
    const role = fileRoles.get(file.name) || getDefaultRole(file);
    item.innerHTML = `
      <div class="file-meta">
        <span class="file-name">${escapeHtml(file.name)}</span>
        <span class="file-info">${escapeHtml(formatBytes(file.size))} · ${escapeHtml(file.type || 'Unknown file type')}</span>
      </div>
      <span class="file-tag">${escapeHtml(getExtension(file.name))} · ${escapeHtml(role)}</span>
    `;
    fileList.appendChild(item);
  });

  renderRoleFiles();
}

function setFiles(fileCollection) {
  selectedFiles = Array.from(fileCollection);
  fileRoles = new Map(selectedFiles.map(file => [file.name, getDefaultRole(file)]));
  renderFiles();
}

async function runAnalysis() {
  if (!selectedFiles.length) return;

  statusTitle.textContent = 'Analyzing files';
  statusText.textContent = 'Sending selected file metadata to the analysis API...';
  suggestedNextStepTitle.textContent = 'Generating report';
  suggestedNextStepText.textContent = 'The system is building a structured intake summary from the uploaded material.';

  analyzeButton.disabled = true;
  clearButton.disabled = true;
  openReportButton.disabled = true;
  analyzeButton.textContent = 'Analyzing...';

  setLoading(
    true,
    'Analysis in progress',
    'The platform is reviewing the selected file set and preparing the report view.'
  );

  try {
    const payload = {
      files: selectedFiles.map(file => ({
        name: file.name,
        size: file.size,
        type: file.type || '',
        role: fileRoles.get(file.name) || getDefaultRole(file)
      }))
    };

    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    if (!data.ok) {
      throw new Error(data.message || 'Analysis failed.');
    }

    latestReport = data;
    resetWorkspaceControls();
    renderReport(latestReport);

    statusTitle.textContent = 'Analysis complete';
    statusText.textContent = 'The backend returned a structured analysis summary.';
    suggestedNextStepTitle.textContent = 'Open report';
    suggestedNextStepText.textContent = 'Review the full analysis report, including roles, process mapping and fit/gap signals.';
    openReportButton.disabled = false;
  } catch (error) {
    statusTitle.textContent = 'Analysis failed';
    statusText.textContent = 'The analysis API could not process the request.';
    suggestedNextStepTitle.textContent = 'Check backend response';
    suggestedNextStepText.textContent = error.message;
    console.error('Analyze error:', error);
  } finally {
    setLoading(false);
    analyzeButton.disabled = !selectedFiles.length;
    clearButton.disabled = !selectedFiles.length;
    analyzeButton.textContent = 'Analyze files';
  }
}

function clearFiles() {
  selectedFiles = [];
  fileRoles = new Map();
  fileInput.value = '';
  latestReport = null;
  setLoading(false);
  resetWorkspaceControls();
  renderFiles();
  renderReport(null);
  goToWorkspace();
}

['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
  dropZone.addEventListener(eventName, event => {
    event.preventDefault();
    event.stopPropagation();
  });
});

['dragenter', 'dragover'].forEach(eventName => {
  dropZone.addEventListener(eventName, () => {
    dropZone.classList.add('drag-over');
  });
});

['dragleave', 'drop'].forEach(eventName => {
  dropZone.addEventListener(eventName, () => {
    dropZone.classList.remove('drag-over');
  });
});

dropZone.addEventListener('click', () => fileInput.click());

dropZone.addEventListener('keydown', event => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    fileInput.click();
  }
});

dropZone.addEventListener('drop', event => {
  const files = event.dataTransfer.files;
  if (files && files.length) {
    setFiles(files);
  }
});

fileInput.addEventListener('change', event => {
  if (event.target.files && event.target.files.length) {
    setFiles(event.target.files);
  }
});

analyzeButton.addEventListener('click', runAnalysis);
openReportButton.addEventListener('click', goToReport);
clearButton.addEventListener('click', clearFiles);

if (backToWorkspaceLink) {
  backToWorkspaceLink.addEventListener('click', event => {
    event.preventDefault();
    goToWorkspace();
  });
}

if (matrixSearch) {
  matrixSearch.addEventListener('input', event => {
    activeMatrixSearch = event.target.value.trim();
    if (latestReport) renderComplianceMatrix(latestReport.complianceMatrix || []);
  });
}

if (matrixTypeFilter) {
  matrixTypeFilter.addEventListener('change', event => {
    activeTypeFilter = event.target.value;
    if (latestReport) renderComplianceMatrix(latestReport.complianceMatrix || []);
  });
}

if (matrixFitFilter) {
  matrixFitFilter.addEventListener('change', event => {
    activeFitFilter = event.target.value;
    if (latestReport) renderComplianceMatrix(latestReport.complianceMatrix || []);
  });
}

filterButtons.forEach(button => {
  button.addEventListener('click', () => {
    setActiveFilter(button.dataset.filter);
  });
});

window.addEventListener('popstate', renderView);

resetWorkspaceControls();
renderFiles();
renderReport(null);
renderView();
loadApiMessage();
