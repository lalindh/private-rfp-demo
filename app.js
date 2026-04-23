const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const analyzeButton = document.getElementById('analyze-button');
const clearButton = document.getElementById('clear-button');
const fileList = document.getElementById('file-list');

const statusTitle = document.getElementById('status-title');
const statusText = document.getElementById('status-text');

const apiStatusTitle = document.getElementById('api-status-title');
const apiMessage = document.getElementById('api-message');

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
          <p>Upload one or more files to activate the analysis workflow.</p>
        </div>
      </div>
    `;
    return;
  }

  analyzeButton.disabled = false;
  clearButton.disabled = false;
  statusTitle.textContent = 'Files ready';
  statusText.textContent = `${selectedFiles.length} file(s) loaded and ready for analysis.`;
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
        <strong>Files added</strong>
        <p>The workspace is ready for a backend analysis request.</p>
      </div>
    </div>
  `;
}

function setFiles(fileCollection) {
  selectedFiles = Array.from(fileCollection);
  renderFiles();
}

async function runAnalysis() {
  if (!selectedFiles.length) return;

  statusTitle.textContent = 'Analyzing files';
  statusText.textContent = 'Sending selected file metadata to the analysis API...';
  analyzeButton.disabled = true;
  clearButton.disabled = true;
  analyzeButton.textContent = 'Analyzing...';

  analysisFeed.innerHTML = `
    <div class="feed-item">
      <div class="feed-dot"></div>
      <div>
        <strong>Analysis started</strong>
        <p>The backend is reviewing file metadata and preparing a structured response.</p>
      </div>
    </div>
  `;

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

    statusTitle.textContent = 'Analysis complete';
    statusText.textContent = 'The backend returned a structured analysis summary.';
    resultDocCount.textContent = `${data.summary.documentCount} file${data.summary.documentCount > 1 ? 's' : ''}`;
    resultWorkstream.textContent = data.summary.workstream;
    resultReadiness.textContent = data.summary.readiness;

    analysisFeed.innerHTML = data.feed.map(item => `
      <div class="feed-item">
        <div class="feed-dot"></div>
        <div>
          <strong>${item.title}</strong>
          <p>${item.text}</p>
        </div>
      </div>
    `).join('');
  } catch (error) {
    statusTitle.textContent = 'Analysis failed';
    statusText.textContent = 'The analysis API could not process the request.';
    analysisFeed.innerHTML = `
      <div class="feed-item">
        <div class="feed-dot"></div>
        <div>
          <strong>Analysis error</strong>
          <p>${error.message}</p>
        </div>
      </div>
    `;
    console.error('Analyze error:', error);
  } finally {
    analyzeButton.disabled = !selectedFiles.length;
    clearButton.disabled = !selectedFiles.length;
    analyzeButton.textContent = 'Analyze files';
  }
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

analyzeButton.addEventListener('click', runAnalysis);
clearButton.addEventListener('click', clearFiles);

renderFiles();
loadApiMessage();
