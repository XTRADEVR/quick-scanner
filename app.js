// State
const ONBOARDING_DATA = [
  {
    screen_id: "onboarding_scan",
    title: "Scan Anything",
    subtitle: "Scan any size of document and crop them according to your needs.",
    action: "Next"
  },
  {
    screen_id: "onboarding_qr",
    title: "QR Scanner",
    subtitle: "Scan any QR code with ease. Just click on scan.",
    action: "Next"
  },
  {
    screen_id: "onboarding_manage",
    title: "Manage Documents",
    subtitle: "Manage your documents in an easy way & access them in no time.",
    action: "Next"
  },
  {
    screen_id: "onboarding_share",
    title: "Share Instantly",
    subtitle: "Share your documents instantly with others.",
    action: "Enter"
  }
];

let currentStep = 0;
let documents = [];
let currentTab = "All Docs";
let videoStream = null;
let currentFacingMode = "environment";
let currentRotation = 0;
let currentFilter = "Original";
let currentBrightness = 100;

// Screens
const screens = {
  onboarding: document.getElementById('onboarding-screen'),
  dashboard: document.getElementById('dashboard-screen'),
  camera: document.getElementById('camera-screen'),
  editor: document.getElementById('editor-screen')
};

function switchScreen(screenName) {
  Object.values(screens).forEach(s => s.classList.remove('active'));
  if (screens[screenName]) {
    screens[screenName].classList.add('active');
  }
}

// 1. ONBOARDING LOGIC
const onbTitle = document.getElementById('onboarding-title');
const onbSub = document.getElementById('onboarding-subtitle');
const onbActionBtn = document.getElementById('onboarding-action-btn');
const onbSkipBtn = document.getElementById('onboarding-skip-btn');
const dots = document.querySelectorAll('.dots-indicator .dot');

function updateOnboardingUI() {
  const data = ONBOARDING_DATA[currentStep];
  onbTitle.textContent = data.title;
  onbSub.textContent = data.subtitle;
  onbActionBtn.textContent = data.action;

  dots.forEach((dot, index) => {
    dot.classList.toggle('active', index === currentStep);
  });
}

onbActionBtn.addEventListener('click', () => {
  if (currentStep < ONBOARDING_DATA.length - 1) {
    currentStep++;
    updateOnboardingUI();
  } else {
    finishOnboarding();
  }
});

onbSkipBtn.addEventListener('click', finishOnboarding);

function finishOnboarding() {
  localStorage.setItem('quick_scanner_onboarded', 'true');
  switchScreen('dashboard');
  renderDocuments();
}

// Check initial onboarding state
if (localStorage.getItem('quick_scanner_onboarded') === 'true') {
  switchScreen('dashboard');
}

// 2. DASHBOARD LOGIC
const emptyState = document.getElementById('empty-state');
const docList = document.getElementById('document-list');

document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    e.target.classList.add('active');
    currentTab = e.target.getAttribute('data-tab');
    renderDocuments();
  });
});

function renderDocuments() {
  const filtered = currentTab === "All Docs"
    ? documents
    : documents.filter(d => d.category === currentTab);

  if (filtered.length === 0) {
    emptyState.style.display = 'flex';
    docList.style.display = 'none';
  } else {
    emptyState.style.display = 'none';
    docList.style.display = 'flex';
    docList.innerHTML = filtered.map(doc => `
      <div class="doc-card">
        <img class="doc-thumbnail" src="${doc.image}" alt="${doc.name}">
        <div class="doc-info">
          <div class="doc-name">${doc.name}</div>
          <div class="doc-meta">${doc.category} • ${doc.date}</div>
        </div>
        <div class="doc-actions">
          <button class="mini-btn" onclick="exportDoc('${doc.id}', 'PDF')">PDF</button>
          <button class="mini-btn" onclick="exportDoc('${doc.id}', 'JPG')">JPG</button>
        </div>
      </div>
    `).join('');
  }
}

window.exportDoc = function(id, format) {
  const item = documents.find(d => d.id === id);
  if (!item) return;
  const link = document.createElement('a');
  link.download = `${item.name}.${format.toLowerCase()}`;
  link.href = item.image;
  link.click();
};

// 3. CAMERA SCANNER LOGIC
const videoElement = document.getElementById('camera-video');
const canvasElement = document.getElementById('camera-canvas');
const cameraTitle = document.getElementById('camera-title-label');
const galleryInput = document.getElementById('gallery-input');
const btnCapture = document.getElementById('btn-capture');
const btnSwitchCamera = document.getElementById('btn-switch-camera');
const cameraCloseBtn = document.getElementById('camera-close-btn');

async function startCamera() {
  stopCamera();
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: currentFacingMode }
    });
    videoStream = stream;
    videoElement.srcObject = stream;
  } catch (err) {
    console.warn("Camera not accessible:", err);
  }
}

function stopCamera() {
  if (videoStream) {
    videoStream.getTracks().forEach(track => track.stop());
    videoStream = null;
  }
}

document.getElementById('btn-nav-scan').addEventListener('click', () => {
  cameraTitle.textContent = "Document Scanner";
  switchScreen('camera');
  startCamera();
});

cameraCloseBtn.addEventListener('click', () => {
  stopCamera();
  switchScreen('dashboard');
});

// Scan Modes
document.querySelectorAll('.mode-item').forEach(btn => {
  btn.addEventListener('click', (e) => {
    document.querySelectorAll('.mode-item').forEach(b => b.classList.remove('active'));
    e.target.classList.add('active');
    const mode = e.target.getAttribute('data-mode');
    cameraTitle.textContent = `${mode} Scanner`;
    adjustViewfinder(mode);
  });
});

function adjustViewfinder(mode) {
  const vf = document.getElementById('viewfinder');
  if (mode === "ID Card") {
    vf.style.width = '85%';
    vf.style.height = '48%';
  } else if (mode === "Book") {
    vf.style.width = '90%';
    vf.style.height = '75%';
  } else {
    vf.style.width = '82%';
    vf.style.height = '68%';
  }
}

// Switch Camera
btnSwitchCamera.addEventListener('click', () => {
  currentFacingMode = currentFacingMode === "environment" ? "user" : "environment";
  startCamera();
});

// Capture
btnCapture.addEventListener('click', () => {
  canvasElement.width = videoElement.videoWidth || 640;
  canvasElement.height = videoElement.videoHeight || 480;
  const ctx = canvasElement.getContext('2d');
  
  if (videoStream) {
    ctx.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height);
  } else {
    // Fallback if camera stream is inactive
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(0, 0, canvasElement.width, canvasElement.height);
    ctx.fillStyle = '#1ECB8B';
    ctx.font = '24px sans-serif';
    ctx.fillText('Sample Document Scanned', 50, 100);
  }

  const dataUrl = canvasElement.toDataURL('image/png');
  openEditor(dataUrl);
});

// Gallery Import
galleryInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (evt) => {
      openEditor(evt.target.result);
    };
    reader.readAsDataURL(file);
  }
});

// 4. EDITOR & CROP SCREEN LOGIC
const editingImage = document.getElementById('editing-image');
const brightnessRange = document.getElementById('brightness-range');
const btnRotate = document.getElementById('btn-rotate');
const btnRetake = document.getElementById('btn-retake');
const editorSaveBtn = document.getElementById('editor-save-btn');
const editorBackBtn = document.getElementById('editor-back-btn');

function openEditor(imageSrc) {
  stopCamera();
  editingImage.src = imageSrc;
  currentRotation = 0;
  currentBrightness = 100;
  currentFilter = "Original";
  brightnessRange.value = 100;
  applyImageStyles();
  switchScreen('editor');
}

function applyImageStyles() {
  let filterCss = `brightness(${currentBrightness}%)`;
  if (currentFilter === "Color") {
    filterCss += ` saturate(160%) contrast(110%)`;
  } else if (currentFilter === "Sharp Black") {
    filterCss += ` grayscale(100%) contrast(200%)`;
  } else if (currentFilter === "OCV Black") {
    filterCss += ` grayscale(100%) contrast(300%) threshold`;
  }
  editingImage.style.filter = filterCss;
  editingImage.style.transform = `rotate(${currentRotation}deg)`;
}

brightnessRange.addEventListener('input', (e) => {
  currentBrightness = e.target.value;
  applyImageStyles();
});

document.querySelectorAll('.filter-pill').forEach(pill => {
  pill.addEventListener('click', (e) => {
    document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
    e.target.classList.add('active');
    currentFilter = e.target.getAttribute('data-filter');
    applyImageStyles();
  });
});

btnRotate.addEventListener('click', () => {
  currentRotation = (currentRotation + 90) % 360;
  applyImageStyles();
});

btnRetake.addEventListener('click', () => {
  switchScreen('camera');
  startCamera();
});

editorBackBtn.addEventListener('click', () => {
  switchScreen('dashboard');
});

editorSaveBtn.addEventListener('click', () => {
  const newDoc = {
    id: 'doc_' + Date.now(),
    name: `Scan_${new Date().toLocaleTimeString().replace(/:/g, '-')}`,
    category: currentTab === "All Docs" ? "Document" : currentTab,
    date: new Date().toLocaleDateString(),
    image: editingImage.src
  };
  documents.unshift(newDoc);
  switchScreen('dashboard');
  renderDocuments();
});

// 5. QR MODAL
const qrModal = document.getElementById('qr-modal');
const qrModalTitle = document.getElementById('qr-modal-title');
const qrModalBody = document.getElementById('qr-modal-body');
const qrModalClose = document.getElementById('qr-modal-close');

document.getElementById('btn-nav-qr-gen').addEventListener('click', () => {
  qrModalTitle.textContent = "QR Generator";
  qrModalBody.innerHTML = `
    <input type="text" id="qr-input" placeholder="Type text or URL..." style="width:100%;padding:10px;border-radius:8px;border:1px solid #ccc;margin-bottom:12px;">
    <button class="secondary-btn" id="qr-generate-btn" style="width:100%;">Generate</button>
    <div id="qr-output" style="margin-top:14px;"></div>
  `;
  qrModal.classList.add('active');

  document.getElementById('qr-generate-btn').addEventListener('click', () => {
    const val = document.getElementById('qr-input').value.trim() || 'Quick Scanner PWA';
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(val)}`;
    document.getElementById('qr-output').innerHTML = `<img src="${qrUrl}" alt="QR Code" style="margin:auto; display:block;">`;
  });
});

document.getElementById('btn-nav-qr-reader').addEventListener('click', () => {
  qrModalTitle.textContent = "QR Reader";
  qrModalBody.innerHTML = `
    <p style="font-size:14px;color:#6b7280;margin-bottom:12px;">Scan any QR code with ease. Click below to start scanning.</p>
    <button class="primary-btn" id="start-qr-scan-btn">Open Scanner</button>
  `;
  qrModal.classList.add('active');

  document.getElementById('start-qr-scan-btn').addEventListener('click', () => {
    qrModal.classList.remove('active');
    cameraTitle.textContent = "QR Scanner";
    switchScreen('camera');
    startCamera();
  });
});

qrModalClose.addEventListener('click', () => {
  qrModal.classList.remove('active');
});
