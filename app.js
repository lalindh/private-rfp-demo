const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const analyzeButton = document.getElementById('analyze-button');
const clearButton = document.getElementById('clear-button');
const fileList = document.getElementById('file-list');

const statusTitle = document.getElementById('status-title');
const statusText = document.getElementById('status-text');

const resultDocCount = document.getElementById('result-doc-count');
const resultWorkstream = document.getElementById('result-workstream');
const resultReadiness = document.getElementById('result-readiness');
const analysisFeed = document.getElementById('analysis-feed');

let selectedFiles = [];

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getExtension(name) {
  const parts = name.split('.');
  return parts.length > 1 ? parts.pop().toUpperCase() : 'FILE';
}

function detectWorkstream(files) {
  const names = files.map(file => file.name.toLowerCase()).join(' ');
  if (names.includes('finance') || names.includes('erp') || names.includes('d365')) {
    return 'Dynamics 365 / ERP';
  }
  if (names.includes('crm') || names.includes('sales') || names.includes('customer')) {
    return 'CRM / Customer Engagement';
  }
  if (names.includes('data') || names.includes('bi') || names.includes('analytics')) {
    return 'Data & Analytics';
  }
  return 'General proposal intake';
}

function renderFiles() {
  fileList.innerHTML = '';

  if (!selectedFiles.length) {
    fileList.innerHTML = '';
    analyzeButton.disabled = true;
    clearButton.disabled = true;
    statusTitle.textContent = 'Waiting for files';
    statusText.textContent = 'No files selected yet.';
    resultDocCount.textContent = '0 files';
    resultWorkstream.textContent = 'Not analyzed';
    resultReadiness.textContent = 'Awaiting input';
    analysisFeed.innerHTML = `
      <div class="feed-item">
        <div class="feed-dot"></div>
        <div>
          <strong>Demo not started</strong>
          <p>Upload one or more files to activate the mock workflow.</p>
        </div>
      </div>
    `;
    return;
  }

  analyzeButton.disabled = false;
  clearButton.disabled = false;
  statusTitle.textContent = 'Files ready';
  statusText.textContent = `${selectedFiles.length} file(s) loaded and ready for mock analysis.`;
  resultDocCount.textContent = `${selectedFiles.length} file${selectedFiles.length > 1 ? 's' : ''}`;
  resultWorkstream.textContent = 'Pending review';
  resultReadiness.textContent = 'Input received';

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

  analysisFeed.innerHTML = `
    <div class="feed-item">
      <div class="feed-dot"></div>
      <div>
        <strong>Files added to demo</strong>
        <p>The workspace is ready for a simulated review pass.</p>
      </div>
    </div>
  `;
}

function setFiles(fileCollection) {
  selectedFiles = Array.from(fileCollection);
  renderFiles();
}

function runMockAnalysis() {
  if (!selectedFiles.length) return;

  const workstream = detectWorkstream(selectedFiles);
  const readiness = selectedFiles.length >= 2 ? 'Draft can be prepared' : 'More source material recommended';

  statusTitle.textContent = 'Analyzing files';
  statusText.textContent = 'Simulating intake, classification, and proposal preparation...';
  analyzeButton.disabled = true;
  analyzeButton.textContent = 'Analyzing...';

  analysisFeed.innerHTML = `
    <div class="feed-item">
      <div class="feed-dot"></div>
      <div>
        <strong>Analysis started</strong>
        <p>Reviewing uploaded material and preparing a mock summary.</p>
      </div>
    </div>
  `;

  window.setTimeout(() => {
    statusTitle.textContent = 'Analysis complete';
    statusText.textContent = 'The demo generated a mock summary based on the selected files.';
    resultDocCount.textContent = `${selectedFiles.length} file${selectedFiles.length > 1 ? 's' : ''}`;
    resultWorkstream.textContent = workstream;
    resultReadiness.textContent = readiness;
    analyzeButton.disabled = false;
    analyzeButton.textContent = 'Analyze files';

    analysisFeed.innerHTML = `
      <div class="feed-item">
        <div class="feed-dot"></div>
        <div>
          <strong>Content grouped</strong>
          <p>The uploaded files were grouped into a provisional workstream: ${workstream}.</p>
        </div>
      </div>
      <div class="feed-item">
        <div class="feed-dot"></div>
        <div>
          <strong>Proposal signal detected</strong>
          <p>The demo indicates the material is suitable for a structured draft and internal review.</p>
        </div>
      </div>
      <div class="feed-item">
        <div class="feed-dot"></div>
        <div>
          <strong>Recommended next step</strong>
          <p>Move to response drafting, scope review, and page generation for customer presentation.</p>
        </div>
      </div>
    `;
  }, 1400);
}

function clearFiles() {
  selectedFiles = [];
  fileInput.value = '';
  analyzeButton.textContent = 'Analyze files';
  renderFiles();
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

analyzeButton.addEventListener('click', runMockAnalysis);
clearButton.addEventListener('click', clearFiles);

renderFiles();
