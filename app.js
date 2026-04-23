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
const reportDocCount = document.getElementById('report-doc-count');
const reportWorkstream = document.getElementById('report-workstream');
const reportReadiness = document.getElementById('report-readiness');
const reportExecutiveSummary = document.getElementById('report-executive-summary');
const reportScopeSignals = document.getElementById('report-scope-signals');
const reportRiskFlags = document.getElementById('report-risk-flags');
const reportRecommendedActions = document.getElementById('report-recommended-actions');
const analysisFeed = document.getElementById('analysis-feed');
const backToWorkspaceLink = document.getElementById('back-to-workspace-link');

let selectedFiles = [];
let latestReport = null;

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getExtension(name) {
  const parts = name.split('.');
  return parts.length > 1 ? parts.pop().toUpperCase() : 'FILE';
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

function renderSignalList(container, items, variant) {
  if (!container) return;

  if (!items || !items.length) {
    container.innerHTML = '<div class="empty-state-text">No items available.</div>';
    return;
  }

  container.innerHTML = items.map(item => `
    <div class="signal-item ${variant ? `signal-item-${variant}` : ''}">
      <strong>${item.title || 'Untitled'}</strong>
      <p>${item.text || ''}</p>
    </div>
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
        <strong>${item.title || 'Update'}</strong>
        <p>${item.text || ''}</p>
      </div>
    </div>
  `).join('');
}

function renderReport(report) {
  if (!report) {
    reportTitle.textContent = 'Proposal intake report';
    reportSubtitle.textContent = 'Run an analysis from the workspace to generate a structured report.';
    reportStatusBadge.textContent = 'Ready for review';
    reportDocCount.textContent = '0 files';
    reportWorkstream.textContent = 'Not analyzed';
    reportReadiness.textContent = 'Awaiting input';
    reportExecutiveSummary.textContent = 'No report has been generated yet.';
    renderSignalList(reportScopeSignals, []);
    renderSignalList(reportRiskFlags, [], 'risk');
    renderSignalList(reportRecommendedActions, [], 'action');
    renderFeed([]);
    openReportButton.disabled = true;
    return;
  }

  const summary = report.summary || {};
  const documentCount = summary.documentCount || 0;
  const workstream = summary.workstream || 'Not analyzed';
  const readiness = summary.readiness || 'Awaiting input';

  reportTitle.textContent = 'Proposal intake report';
  reportSubtitle.textContent = report.timestamp
    ? `Generated ${new Date(report.timestamp).toLocaleString()}`
    : 'Generated from the current analysis run.';
  reportStatusBadge.textContent = 'Report generated';

  reportDocCount.textContent = `${documentCount} file${documentCount === 1 ? '' : 's'}`;
  reportWorkstream.textContent = workstream;
  reportReadiness.textContent = readiness;
  reportExecutiveSummary.textContent = report.executiveSummary || 'No summary was returned by the API.';

  renderSignalList(reportScopeSignals, report.scopeSignals || []);
  renderSignalList(reportRiskFlags, report.riskFlags || [], 'risk');
  renderSignalList(reportRecommendedActions, report.recommendedActions || [], 'action');
  renderFeed(report.feed || []);

  openReportButton.disabled = false;
}

async function loadApiMessage() {
  if (!apiStatusTitle || !apiMessage) return;

  apiStatusTitle.textContent = 'Checking connection...';
  apiMessage.textContent = 'Trying to load message from Azure Functions.';

  try {
    const response = await fetch('/api/message');

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    apiStatusTitle.textContent = 'Connected to API';
    apiMessage.textContent = data.message
      ? `${data.message}${data.timestamp ? ` (${data.timestamp})` : ''}`
      : 'API responded successfully, but no message field was returned.';
  } catch (error) {
    apiStatusTitle.textContent = 'API unavailable';
    apiMessage.textContent = 'Could not load message from /api/message';
    console.error('API error:', error);
  }
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
    suggestedNextStepText.textContent = 'Select one or more files and run an analysis to preview the experience.';
    return;
  }

  analyzeButton.disabled = false;
  clearButton.disabled = false;

  statusTitle.textContent = 'Files ready';
  statusText.textContent = `${selectedFiles.length} file(s) loaded and ready for analysis.`;
  suggestedNextStepTitle.textContent = 'Run analysis';
  suggestedNextStepText.textContent = 'Send file metadata to the backend to generate a structured proposal intake report.';

  selectedFiles.forEach(file => {
    const item = document.createElement('div');
    item.className = 'file-item';
    item.innerHTML = `
      <div class="file-meta">
        <span class="file-name">${file.name}</span>
        <span class="file-info">${formatBytes(file.size)} · ${file.type || 'Unknown file type'}</span>
      </div>
      <span class="file-tag">${getExtension(file.name)}</span>
    `;
    fileList.appendChild(item);
  });
}

function setFiles(fileCollection) {
  selectedFiles = Array.from(fileCollection);
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
        type: file.type || ''
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
    renderReport(latestReport);

    statusTitle.textContent = 'Analysis complete';
    statusText.textContent = 'The backend returned a structured analysis summary.';
    suggestedNextStepTitle.textContent = 'Open report';
    suggestedNextStepText.textContent = 'Review the full analysis report in a dedicated report view.';
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
  fileInput.value = '';
  latestReport = null;
  setLoading(false);
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

window.addEventListener('popstate', renderView);

renderFiles();
renderReport(null);
renderView();
loadApiMessage();
