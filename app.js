const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const analyzeButton = document.getElementById('analyze-button');
const openReportButton = document.getElementById('open-report-button');
const clearButton = document.getElementById('clear-button');

const navWorkspace = document.getElementById('nav-workspace');
const navReport = document.getElementById('nav-report');

const workspaceView = document.getElementById('workspace-view');
const reportView = document.getElementById('report-view');

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

const reportTitle = document.getElementById('report-title');
const reportSubtitle = document.getElementById('report-subtitle');
const reportStatusBadge = document.getElementById('report-status-badge');
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
const reportComplianceMatrix = document.getElementById('report-compliance-matrix');
const reportDetectedSignals = document.getElementById('report-detected-signals');
const reportMissingSignals = document.getElementById('report-missing-signals');
const analysisFeed = document.getElementById('analysis-feed');

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
let fileRoles = new Map();
let latestReport = null;
let matrixData = [];
let activeStatusFilter = 'all';
let activeTypeFilter = 'all';
let activeFitFilter = 'all';
let activeSearch = '';

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getExtension(name) {
  const parts = String(name).split('.');
  return parts.length > 1 ? parts.pop().toUpperCase() : 'FILE';
}

function getDefaultRole(file) {
  const name = String(file.name || '').toLowerCase();
  const ext = getExtension(file.name).toLowerCase();

  if (ext === 'xlsx' || ext === 'xls') return 'Functional requirements';
  if (name.includes('rfp') || name.includes('itt') || name.includes('tender')) return 'Main RFP';
  if (name.includes('commercial') || name.includes('pricing') || name.includes('price')) return 'Commercial';
  if (name.includes('evaluation') || name.includes('criteria')) return 'Evaluation criteria';
  return 'Other';
}

function setView(viewName) {
  const showReport = viewName === 'report';
  workspaceView.classList.toggle('hidden', showReport);
  reportView.classList.toggle('hidden', !showReport);
  navWorkspace.classList.toggle('is-active', !showReport);
  navReport.classList.toggle('is-active', showReport);
}

function renderEmpty(container, text) {
  container.innerHTML = `<div class="empty-state-text">${escapeHtml(text)}</div>`;
}

function renderFiles() {
  if (!selectedFiles.length) {
    renderEmpty(fileList, 'No files selected yet.');
    renderEmpty(roleFileList, 'No files available for role assignment yet.');
    analyzeButton.disabled = true;
    clearButton.disabled = true;
    openReportButton.disabled = !latestReport;
    statusTitle.textContent = 'Waiting for files';
    statusText.textContent = 'No files selected yet.';
    suggestedNextStepTitle.textContent = 'Upload RFP material';
    suggestedNextStepText.textContent = 'Select files and assign document roles before analysis.';
    return;
  }

  analyzeButton.disabled = false;
  clearButton.disabled = false;

  fileList.innerHTML = selectedFiles.map(file => {
    const role = fileRoles.get(file.name) || getDefaultRole(file);
    return `
      <div class="file-item">
        <div class="file-meta">
          <span class="file-name">${escapeHtml(file.name)}</span>
          <span class="file-info">${escapeHtml(formatBytes(file.size))} · ${escapeHtml(file.type || 'Unknown file type')}</span>
        </div>
        <span class="file-tag">${escapeHtml(getExtension(file.name))} · ${escapeHtml(role)}</span>
      </div>
    `;
  }).join('');

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
          <select class="role-select" data-index="${index}">
            <option value="Functional requirements" ${role === 'Functional requirements' ? 'selected' : ''}>Functional requirements</option>
            <option value="Main RFP" ${role === 'Main RFP' ? 'selected' : ''}>Main RFP</option>
            <option value="Commercial" ${role === 'Commercial' ? 'selected' : ''}>Commercial</option>
            <option value="Evaluation criteria" ${role === 'Evaluation criteria' ? 'selected' : ''}>Evaluation criteria</option>
            <option value="Other" ${role === 'Other' ? 'selected' : ''}>Other</option>
          </select>
          <div style="margin-top:0.65rem;">
            <span class="role-badge ${isMaster ? 'is-master' : ''}">
              ${isMaster ? 'Requirements master' : 'Supporting file'}
            </span>
          </div>
        </div>
      </div>
    `;
  }).join('');

  roleFileList.querySelectorAll('.role-select').forEach(select => {
    select.addEventListener('change', event => {
      const index = Number(event.target.dataset.index);
      const file = selectedFiles[index];
      if (!file) return;
      fileRoles.set(file.name, event.target.value);
      renderFiles();
    });
  });

  statusTitle.textContent = 'Files ready';
  statusText.textContent = `${selectedFiles.length} file(s) are ready for analysis.`;
  suggestedNextStepTitle.textContent = 'Review document roles';
  suggestedNextStepText.textContent = 'Make sure the Excel file with actual requirements is marked as Functional requirements.';
}

function setFiles(fileCollection) {
  selectedFiles = Array.from(fileCollection);
  fileRoles = new Map(selectedFiles.map(file => [file.name, getDefaultRole(file)]));
  renderFiles();
}

function setLoading(isLoading, title, text) {
  loadingPanel.classList.toggle('hidden', !isLoading);
  if (isLoading) {
    loadingTitle.textContent = title || 'Preparing analysis';
    loadingText.textContent = text || 'The system is processing the selected files.';
  }
}

function renderList(container, items, emptyText, mapper) {
  if (!items || !items.length) {
    renderEmpty(container, emptyText);
    return;
  }
  container.innerHTML = items.map(mapper).join('');
}

function statusBadgeClass(status) {
  return `badge badge-status-${String(status || '').toLowerCase().replaceAll(' ', '-')}`;
}

function fitBadgeClass(value) {
  return `badge badge-fit-${String(value || '').toLowerCase().replaceAll(' ', '-')}`;
}

function confidenceBadgeClass(value) {
  return `badge badge-confidence-${String(value || '').toLowerCase()}`;
}

function reviewBadgeClass(value) {
  return `badge badge-review-${String(value || '').toLowerCase().replaceAll(' ', '-')}`;
}

function getFilteredMatrix(items) {
  return (items || []).filter(item => {
    const statusOk = activeStatusFilter === 'all' || item.status === activeStatusFilter;
    const typeOk = activeTypeFilter === 'all' || item.requirementType === activeTypeFilter;
    const fitOk = activeFitFilter === 'all' || item.fitType === activeFitFilter;

    const text = [
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
      item.sourceDocument,
      item.reviewReason,
      item.responseAction,
      item.documentRole,
      item.sourceMode,
      item.sheetName,
      item.rowNumber,
      item.owner,
      item.deadline,
      item.reviewStatus,
      item.comments
    ].join(' ').toLowerCase();

    const searchOk = !activeSearch || text.includes(activeSearch);
    return statusOk && typeOk && fitOk && searchOk;
  });
}

function updateMatrixField(rowId, field, value) {
  matrixData = matrixData.map(item => {
    if (item.requirementId === rowId) {
      return { ...item, [field]: value };
    }
    return item;
  });

  if (latestReport) {
    latestReport.complianceMatrix = matrixData;
  }

  renderComplianceMatrix(matrixData);
}

function renderComplianceMatrix(items) {
  const filtered = getFilteredMatrix(items);

  if (!filtered.length) {
    reportComplianceMatrix.innerHTML = `
      <tr>
        <td colspan="18">
          <div class="empty-state-text">No compliance rows match the selected filters.</div>
        </td>
      </tr>
    `;
    return;
  }

  reportComplianceMatrix.innerHTML = filtered.map(item => `
    <tr>
      <td><strong>${escapeHtml(item.requirementId || '')}</strong></td>
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
      <td>
        <div class="table-stack">
          <strong>${escapeHtml(item.sheetName || '')}</strong>
          <span class="table-mini">Row ${escapeHtml(item.rowNumber || '')}</span>
        </div>
      </td>
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
          <span class="table-mini">${escapeHtml(item.documentRole || '')} · ${escapeHtml(item.sourceMode || '')}</span>
        </div>
      </td>
      <td>
        <input
          class="cell-input"
          type="text"
          value="${escapeHtml(item.owner || '')}"
          data-row-id="${escapeHtml(item.requirementId || '')}"
          data-field="owner"
          placeholder="Assign owner"
        />
      </td>
      <td>
        <input
          class="cell-input"
          type="date"
          value="${escapeHtml(item.deadline || '')}"
          data-row-id="${escapeHtml(item.requirementId || '')}"
          data-field="deadline"
        />
      </td>
      <td>
        <div class="table-stack">
          <span class="${reviewBadgeClass(item.reviewStatus)}">${escapeHtml(item.reviewStatus || '')}</span>
          <select
            class="cell-select"
            data-row-id="${escapeHtml(item.requirementId || '')}"
            data-field="reviewStatus"
          >
            <option value="Not started" ${item.reviewStatus === 'Not started' ? 'selected' : ''}>Not started</option>
            <option value="In progress" ${item.reviewStatus === 'In progress' ? 'selected' : ''}>In progress</option>
            <option value="Reviewed" ${item.reviewStatus === 'Reviewed' ? 'selected' : ''}>Reviewed</option>
            <option value="Blocked" ${item.reviewStatus === 'Blocked' ? 'selected' : ''}>Blocked</option>
          </select>
        </div>
      </td>
      <td>
        <textarea
          class="cell-textarea"
          data-row-id="${escapeHtml(item.requirementId || '')}"
          data-field="comments"
          placeholder="Add internal notes"
        >${escapeHtml(item.comments || '')}</textarea>
      </td>
      <td>${escapeHtml(item.reviewReason || '')}</td>
      <td>${escapeHtml(item.responseAction || '')}</td>
    </tr>
  `).join('');

  reportComplianceMatrix.querySelectorAll('[data-row-id][data-field]').forEach(element => {
    element.addEventListener('change', event => {
      const rowId = event.target.dataset.rowId;
      const field = event.target.dataset.field;
      const value = event.target.value;
      updateMatrixField(rowId, field, value);
    });
  });
}

function renderReport(data) {
  if (!data) {
    reportTitle.textContent = 'Proposal intake report';
    reportSubtitle.textContent = 'Run an analysis from the workspace to generate a report.';
    reportStatusBadge.textContent = 'Ready for review';
    reportDocCount.textContent = '0 files';
    reportWorkstream.textContent = 'Not analyzed';
    reportReadiness.textContent = 'Awaiting input';
    reportExecutiveSummary.textContent = 'No report generated yet.';
    renderEmpty(reportScopeSignals, 'No scope signals yet.');
    renderEmpty(reportRiskFlags, 'No risk flags yet.');
    renderEmpty(reportRecommendedActions, 'No actions yet.');
    renderEmpty(reportCatalogMatches, 'No catalog matches yet.');
    renderEmpty(reportProposalPageSections, 'No proposal sections yet.');
    renderEmpty(reportRequirements, 'No requirements yet.');
    renderEmpty(reportAssumptions, 'No assumptions yet.');
    renderEmpty(reportGaps, 'No gaps yet.');
    renderEmpty(reportEvaluationFocus, 'No evaluation focus yet.');
    renderEmpty(reportResponseOutline, 'No response outline yet.');
    renderEmpty(reportDetectedSignals, 'No detected signals yet.');
    renderEmpty(reportMissingSignals, 'No missing signals yet.');
    analysisFeed.innerHTML = `
      <div class="feed-item">
        <div class="feed-dot"></div>
        <div>
          <strong>No analysis run yet</strong>
          <p>Return to workspace and run analysis.</p>
        </div>
      </div>
    `;
    matrixData = [];
    renderComplianceMatrix([]);
    kpiDetected.textContent = '0';
    kpiAssumed.textContent = '0';
    kpiGap.textContent = '0';
    kpiNeedsReview.textContent = '0';
    kpiMapped.textContent = '0';
    kpiHighConfidence.textContent = '0';
    kpiUnclear.textContent = '0';
    kpiGapCount.textContent = '0';
    return;
  }

  const requirements = data.complianceMatrix || [];
  matrixData = requirements.map(item => ({ ...item }));

  reportTitle.textContent = 'Proposal intake report';
  reportSubtitle.textContent = 'Latest structured analysis output.';
  reportStatusBadge.textContent = 'Ready for review';
  reportDocCount.textContent = `${data.summary?.documentCount || 0} files`;
  reportWorkstream.textContent = data.summary?.workstream || 'Unknown';
  reportReadiness.textContent = data.summary?.readiness || 'Awaiting input';
  reportExecutiveSummary.textContent = data.executiveSummary || 'No summary available.';

  renderList(reportScopeSignals, data.scopeSignals, 'No scope signals yet.', item => `
    <div class="signal-item">
      <strong>${escapeHtml(item.title || '')}</strong>
      <p>${escapeHtml(item.text || '')}</p>
    </div>
  `);

  renderList(reportRiskFlags, data.riskFlags, 'No risk flags yet.', item => `
    <div class="signal-item">
      <strong>${escapeHtml(item.title || '')}</strong>
      <p>${escapeHtml(item.text || '')}</p>
    </div>
  `);

  renderList(reportRecommendedActions, data.recommendedActions, 'No actions yet.', item => `
    <div class="signal-item">
      <strong>${escapeHtml(item.title || '')}</strong>
      <p>${escapeHtml(item.text || '')}</p>
    </div>
  `);

  renderList(reportCatalogMatches, data.catalogMatches, 'No catalog matches yet.', item => `
    <div class="signal-item">
      <span class="signal-meta">${escapeHtml(item.level || '')} · ${escapeHtml(item.type || '')}</span>
      <strong>${escapeHtml(item.name || '')}</strong>
      <p>${escapeHtml(item.rationale || '')}</p>
    </div>
  `);

  renderList(reportProposalPageSections, data.proposalPageSections, 'No proposal sections yet.', item => `
    <div class="signal-item">
      <strong>${escapeHtml(item.title || '')}</strong>
      <p>${escapeHtml(item.text || '')}</p>
    </div>
  `);

  renderList(reportRequirements, data.requirements, 'No requirements yet.', item => `
    <div class="signal-item">
      <span class="signal-meta">${escapeHtml(item.requirementId || '')} · ${escapeHtml(item.requirementType || '')} · ${escapeHtml(item.fitType || '')}</span>
      <strong>${escapeHtml(item.requirementTitle || '')}</strong>
      <p>${escapeHtml(item.requirementText || '')}</p>
    </div>
  `);

  renderList(reportAssumptions, data.assumptions, 'No assumptions yet.', item => `
    <div class="signal-item">
      <strong>${escapeHtml(item.title || '')}</strong>
      <p>${escapeHtml(item.text || '')}</p>
    </div>
  `);

  renderList(reportGaps, data.gaps, 'No gaps yet.', item => `
    <div class="signal-item">
      <span class="signal-meta">${escapeHtml(item.id || '')} · ${escapeHtml(item.severity || '')}</span>
      <strong>${escapeHtml(item.area || '')}</strong>
      <p>${escapeHtml(item.impact || '')}</p>
      <p>${escapeHtml(item.recommendation || '')}</p>
    </div>
  `);

  renderList(reportEvaluationFocus, data.evaluationFocus, 'No evaluation focus yet.', item => `
    <div class="signal-item">
      <strong>${escapeHtml(item.title || '')}</strong>
      <p>${escapeHtml(item.text || '')}</p>
    </div>
  `);

  renderList(reportResponseOutline, data.responseOutline, 'No response outline yet.', item => `
    <div class="signal-item">
      <strong>${escapeHtml(item.section || '')}</strong>
      <p>${escapeHtml(item.text || '')}</p>
    </div>
  `);

  renderList(reportDetectedSignals, data.intakeDiagnostics?.detectedSignals, 'No detected signals yet.', item => `
    <div class="signal-item"><p>${escapeHtml(item)}</p></div>
  `);

  renderList(reportMissingSignals, data.intakeDiagnostics?.missingSignals, 'No missing signals yet.', item => `
    <div class="signal-item"><p>${escapeHtml(item)}</p></div>
  `);

  renderList(analysisFeed, data.feed, 'No feed items yet.', item => `
    <div class="feed-item">
      <div class="feed-dot"></div>
      <div>
        <strong>${escapeHtml(item.title || '')}</strong>
        <p>${escapeHtml(item.text || '')}</p>
      </div>
    </div>
  `);

  const detected = matrixData.filter(item => item.status === 'Detected').length;
  const assumed = matrixData.filter(item => item.status === 'Assumed').length;
  const gap = matrixData.filter(item => item.status === 'Gap').length;
  const review = matrixData.filter(item => item.status === 'Needs review').length;
  const mapped = matrixData.filter(item => item.processArea && item.processArea !== 'Unmapped process area').length;
  const highConfidence = matrixData.filter(item => item.confidence === 'High').length;
  const unclear = matrixData.filter(item => item.fitType === 'Unclear').length;
  const gapCount = matrixData.filter(item => item.fitType === 'Integration gap' || item.fitType === 'Extension gap').length;

  kpiDetected.textContent = String(detected);
  kpiAssumed.textContent = String(assumed);
  kpiGap.textContent = String(gap);
  kpiNeedsReview.textContent = String(review);
  kpiMapped.textContent = String(mapped);
  kpiHighConfidence.textContent = String(highConfidence);
  kpiUnclear.textContent = String(unclear);
  kpiGapCount.textContent = String(gapCount);

  renderComplianceMatrix(matrixData);
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error || new Error('Failed to read file.'));
    reader.readAsDataURL(file);
  });
}

function dataUrlToBase64(dataUrl) {
  const commaIndex = dataUrl.indexOf(',');
  return commaIndex >= 0 ? dataUrl.slice(commaIndex + 1) : dataUrl;
}

async function uploadWorkbookForAnalysis(file, role) {
  const dataUrl = await readFileAsDataUrl(file);
  const response = await fetch('/api/uploadWorkbook', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fileName: file.name,
      fileContentBase64: dataUrlToBase64(dataUrl),
      role
    })
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok || !payload.ok) {
    throw new Error(payload.message || `Workbook upload failed with HTTP ${response.status}.`);
  }

  return payload.workbook;
}

async function runAnalysis() {
  if (!selectedFiles.length) return;

  analyzeButton.disabled = true;
  clearButton.disabled = true;
  openReportButton.disabled = true;
  statusTitle.textContent = 'Analyzing files';
  statusText.textContent = 'Uploading workbook and preparing analysis.';
  suggestedNextStepTitle.textContent = 'Wait for response';
  suggestedNextStepText.textContent = 'The system is generating a structured analysis.';
  setLoading(true, 'Analysis in progress', 'The selected file set is being processed.');

  try {
    const filePayload = selectedFiles.map(file => ({
      name: file.name,
      size: file.size,
      type: file.type || '',
      role: fileRoles.get(file.name) || getDefaultRole(file)
    }));

    const workbookFile = selectedFiles.find(file => (fileRoles.get(file.name) || getDefaultRole(file)) === 'Functional requirements' && /\.(xlsx|xls)$/i.test(file.name));
    let workbook = null;

    if (workbookFile) {
      workbook = await uploadWorkbookForAnalysis(
        workbookFile,
        fileRoles.get(workbookFile.name) || getDefaultRole(workbookFile)
      );
    }

    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        files: filePayload,
        workbook
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    if (!data.ok) {
      throw new Error(data.message || 'Analysis failed.');
    }

    latestReport = data;
    openReportButton.disabled = false;
    navReport.disabled = false;
    renderReport(data);
    setView('report');

    statusTitle.textContent = 'Analysis complete';
    statusText.textContent = 'The analysis was returned successfully.';
    suggestedNextStepTitle.textContent = 'Review report';
    suggestedNextStepText.textContent = 'Inspect requirement roles, process mapping, owner assignment and deadlines.';
  } catch (error) {
    console.error(error);
    statusTitle.textContent = 'Analysis failed';
    statusText.textContent = 'The backend could not process the request.';
    suggestedNextStepTitle.textContent = 'Check API and payload';
    suggestedNextStepText.textContent = error.message;
  } finally {
    analyzeButton.disabled = !selectedFiles.length;
    clearButton.disabled = !selectedFiles.length;
    setLoading(false);
  }
}

function clearFiles() {
  selectedFiles = [];
  fileRoles = new Map();
  latestReport = null;
  matrixData = [];
  fileInput.value = '';
  navReport.disabled = true;
  openReportButton.disabled = true;
  renderFiles();
  renderReport(null);
  setView('workspace');
}

async function loadApiMessage() {
  try {
    const response = await fetch('/api/message');
    if (!response.ok) {
      apiStatusTitle.textContent = 'API unavailable';
      apiMessage.textContent = `Message endpoint returned HTTP ${response.status}.`;
      return;
    }

    const data = await response.json();
    apiStatusTitle.textContent = 'API connected';
    apiMessage.textContent = data.text || data.message || 'The API responded successfully.';
  } catch (error) {
    apiStatusTitle.textContent = 'API unavailable';
    apiMessage.textContent = 'Could not reach the message endpoint.';
  }
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
  if (files && files.length) setFiles(files);
});

fileInput.addEventListener('change', event => {
  if (event.target.files && event.target.files.length) setFiles(event.target.files);
});

analyzeButton.addEventListener('click', runAnalysis);
openReportButton.addEventListener('click', () => {
  if (latestReport) setView('report');
});
clearButton.addEventListener('click', clearFiles);

navWorkspace.addEventListener('click', () => setView('workspace'));
navReport.addEventListener('click', () => {
  if (latestReport) setView('report');
});

filterButtons.forEach(button => {
  button.addEventListener('click', () => {
    activeStatusFilter = button.dataset.filter;
    filterButtons.forEach(btn => btn.classList.toggle('is-active', btn === button));
    renderComplianceMatrix(matrixData);
  });
});

matrixTypeFilter.addEventListener('change', event => {
  activeTypeFilter = event.target.value;
  renderComplianceMatrix(matrixData);
});

matrixFitFilter.addEventListener('change', event => {
  activeFitFilter = event.target.value;
  renderComplianceMatrix(matrixData);
});

matrixSearch.addEventListener('input', event => {
  activeSearch = event.target.value.trim().toLowerCase();
  renderComplianceMatrix(matrixData);
});

renderFiles();
renderReport(null);
setView('workspace');
loadApiMessage();
