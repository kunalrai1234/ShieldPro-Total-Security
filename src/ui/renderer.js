/**
 * AEGIS CYBERSECURITY SUITE
 * Renderer Controller & UI Orchestrator
 */

document.addEventListener('DOMContentLoaded', async () => {
  // Initialize Motion Engine
  const scanCanvas = window.motion.initScanCanvas('scanCanvas');

  // Titlebar controls
  document.getElementById('btnMinimize')?.addEventListener('click', () => window.aegis.minimize());
  document.getElementById('btnClose')?.addEventListener('click', () => window.aegis.close());

  // 1. Tab Navigation
  const navItems = document.querySelectorAll('.nav-item');
  const tabPanes = document.querySelectorAll('.tab-pane');

  function switchTab(tabId) {
    navItems.forEach(item => {
      item.classList.toggle('active', item.getAttribute('data-tab') === tabId);
    });
    tabPanes.forEach(pane => {
      pane.classList.toggle('active', pane.id === tabId);
    });

    // Refresh tab-specific data on open
    if (tabId === 'tab-firewall') refreshFirewall();
    if (tabId === 'tab-quarantine') refreshQuarantine();
    if (tabId === 'tab-reports') refreshReports();
    if (tabId === 'tab-settings') refreshBootSettings();
  }

  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const tabId = item.getAttribute('data-tab');
      switchTab(tabId);
    });
  });

  // Action cards on overview
  document.getElementById('btnTriggerQuickScan')?.addEventListener('click', () => {
    switchTab('tab-scan');
    startScan('quick');
  });

  document.getElementById('btnTriggerFullScan')?.addEventListener('click', () => {
    switchTab('tab-scan');
    startScan('full');
  });

  document.getElementById('btnTriggerCustomScan')?.addEventListener('click', async () => {
    const folder = await window.aegis.selectDirectory();
    if (folder) {
      switchTab('tab-scan');
      startScan('custom', folder);
    }
  });

  // 2. Scan Operations
  const scanFilesCount = document.getElementById('scanFilesCount');
  const scanStatusMessage = document.getElementById('scanStatusMessage');
  const currentFilePathDisplay = document.getElementById('currentFilePathDisplay');
  const btnStartQuickScan = document.getElementById('btnStartQuickScan');
  const btnStartCustomScan = document.getElementById('btnStartCustomScan');
  const btnCancelScan = document.getElementById('btnCancelScan');
  const threatsTableBody = document.getElementById('threatsTableBody');

  let isScanning = false;
  let detectedThreats = [];

  async function startScan(type, customPath = null) {
    if (isScanning) return;
    isScanning = true;
    detectedThreats = [];

    btnStartQuickScan.style.display = 'none';
    btnStartCustomScan.style.display = 'none';
    btnCancelScan.style.display = 'inline-flex';
    threatsTableBody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--text-light); padding: 24px;">Scanning in progress...</td></tr>';

    scanCanvas.start();
    scanStatusMessage.textContent = type === 'quick' ? 'Running Quick Scan...' : (type === 'full' ? 'Running Full Drive Scan...' : `Scanning ${customPath}...`);

    try {
      let result;
      if (type === 'quick') result = await window.aegis.startQuickScan();
      else if (type === 'full') result = await window.aegis.startFullScan();
      else if (type === 'custom') result = await window.aegis.startCustomScan(customPath);

      renderScanComplete(result);
    } catch (err) {
      scanStatusMessage.textContent = `Scan failed: ${err.message}`;
    } finally {
      isScanning = false;
      scanCanvas.stop();
      btnStartQuickScan.style.display = 'inline-flex';
      btnStartCustomScan.style.display = 'inline-flex';
      btnCancelScan.style.display = 'none';
      updateHealthScore();
    }
  }

  btnStartQuickScan?.addEventListener('click', () => startScan('quick'));
  btnStartCustomScan?.addEventListener('click', async () => {
    const folder = await window.aegis.selectDirectory();
    if (folder) startScan('custom', folder);
  });
  btnCancelScan?.addEventListener('click', () => {
    window.aegis.cancelScan();
    scanStatusMessage.textContent = 'Scan cancelled by user.';
  });

  window.aegis.onScanProgress((data) => {
    window.motion.animateCounter(scanFilesCount, data.scannedCount, 150);
    currentFilePathDisplay.textContent = data.currentFile || 'Scanning...';
    if (data.latestThreat) {
      detectedThreats.push(data.latestThreat);
      renderThreatsTable(detectedThreats);
    }
  });

  function renderScanComplete(stats) {
    scanStatusMessage.textContent = stats.threatsDetected.length === 0
      ? 'Scan Complete — No Threats Found'
      : `Scan Complete — ${stats.threatsDetected.length} Threat(s) Detected`;
    currentFilePathDisplay.textContent = `Scanned ${stats.scannedFiles} files in total.`;
    renderThreatsTable(stats.threatsDetected);
  }

  function renderThreatsTable(threats) {
    if (!threats || threats.length === 0) {
      threatsTableBody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--text-light); padding: 24px;">No active threats found in recent scan.</td></tr>';
      return;
    }

    threatsTableBody.innerHTML = threats.map(t => `
      <tr>
        <td style="font-weight: 600; color: var(--accent-danger);">${t.threatName}</td>
        <td>${t.category}</td>
        <td><span class="badge ${t.severity === 'Test/Safe' ? 'badge-safe' : 'badge-danger'}">${t.severity}</span></td>
        <td>${t.detectionType}</td>
        <td style="font-family: monospace; font-size: 11.5px; max-width: 250px; overflow: hidden; text-overflow: ellipsis;">${t.filePath}</td>
      </tr>
    `).join('');
  }

  // 3. Real-Time Shield
  const realTimeToggle = document.getElementById('realTimeToggle');
  const realTimeLogBody = document.getElementById('realTimeLogBody');
  const globalStatusDot = document.getElementById('globalStatusDot');
  const globalStatusText = document.getElementById('globalStatusText');

  realTimeToggle?.addEventListener('change', async (e) => {
    const enabled = e.target.checked;
    await window.aegis.toggleRealTime(enabled);
    updateGlobalStatus(enabled);
  });

  function updateGlobalStatus(active) {
    if (active) {
      globalStatusDot.style.background = 'var(--accent-safe)';
      globalStatusText.textContent = 'Protected';
    } else {
      globalStatusDot.style.background = 'var(--accent-warn)';
      globalStatusText.textContent = 'Shield Paused';
    }
    updateHealthScore();
  }

  window.aegis.onRealTimeThreat((evt) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${new Date().toLocaleTimeString()}</td>
      <td><span class="badge badge-warn">${evt.action}</span></td>
      <td style="font-family: monospace; font-size: 11.5px;">${evt.filePath}</td>
      <td><span class="badge badge-danger">${evt.threat.threatName} (${evt.isQuarantined ? 'Quarantined' : 'Detected'})</span></td>
    `;
    realTimeLogBody.prepend(tr);
    updateHealthScore();
  });

  // 4. Firewall & Sockets
  async function refreshFirewall() {
    const fw = await window.aegis.getFirewallStatus();
    document.getElementById('fwDomainState').innerHTML = fw.profiles?.domain
      ? '<span class="badge badge-safe">Active & Protected</span>'
      : '<span class="badge badge-warn">Disabled</span>';
    document.getElementById('fwPrivateState').innerHTML = fw.profiles?.private
      ? '<span class="badge badge-safe">Active & Protected</span>'
      : '<span class="badge badge-warn">Disabled</span>';
    document.getElementById('fwPublicState').innerHTML = fw.profiles?.public
      ? '<span class="badge badge-safe">Active & Protected</span>'
      : '<span class="badge badge-warn">Disabled</span>';

    const sock = await window.aegis.getActiveSockets();
    const sockBody = document.getElementById('socketsTableBody');
    if (sock.connections && sock.connections.length > 0) {
      sockBody.innerHTML = sock.connections.map(c => `
        <tr>
          <td><span class="badge badge-blue">${c.proto}</span></td>
          <td style="font-family: monospace;">${c.localAddress}</td>
          <td style="font-family: monospace;">${c.foreignAddress}</td>
          <td>${c.state}</td>
          <td>${c.pid}</td>
        </tr>
      `).join('');
    } else {
      sockBody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px;">No sockets found.</td></tr>';
    }
  }

  document.getElementById('btnRefreshSockets')?.addEventListener('click', refreshFirewall);

  // 5. File Shredder
  const btnSelectShredFile = document.getElementById('btnSelectShredFile');
  const shredStatusDisplay = document.getElementById('shredStatusDisplay');

  btnSelectShredFile?.addEventListener('click', async () => {
    const filePath = await window.aegis.selectFile();
    if (!filePath) return;

    const confirmed = confirm(`Are you sure you want to permanently shred this file?\n\n${filePath}\n\nThis will physically overwrite physical sectors 3 times and cannot be undone.`);
    if (!confirmed) return;

    shredStatusDisplay.style.display = 'block';
    shredStatusDisplay.textContent = 'Preparing DoD 5220.22-M 3-pass erasure...';

    window.aegis.onShredProgress((p) => {
      shredStatusDisplay.textContent = `[Pass ${p.pass}/${p.totalPasses}] ${p.status} (${p.percent}%)`;
    });

    const res = await window.aegis.shredFile(filePath);
    if (res.success) {
      shredStatusDisplay.textContent = `Success: File permanently shredded and erased from disk.`;
    } else {
      shredStatusDisplay.textContent = `Shredding failed: ${res.error}`;
    }
  });

  // 6. Quarantine
  async function refreshQuarantine() {
    const list = await window.aegis.getQuarantineList();
    const body = document.getElementById('quarantineTableBody');

    if (!list || list.length === 0) {
      body.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--text-light); padding: 24px;">Quarantine vault is empty.</td></tr>';
      return;
    }

    body.innerHTML = list.map(item => `
      <tr>
        <td style="font-weight: 600;">${item.fileName}</td>
        <td><span class="badge badge-danger">${item.threatName}</span></td>
        <td>${new Date(item.quarantinedAt).toLocaleString()}</td>
        <td style="font-family: monospace; font-size: 11.5px; max-width: 250px; overflow: hidden; text-overflow: ellipsis;">${item.originalPath}</td>
        <td>
          <button class="btn btn-outline" style="padding: 4px 8px; font-size: 11px;" onclick="restoreQuarantine('${item.id}')">Restore</button>
          <button class="btn btn-danger" style="padding: 4px 8px; font-size: 11px; margin-left: 4px;" onclick="deleteQuarantine('${item.id}')">Delete</button>
        </td>
      </tr>
    `).join('');
  }

  window.restoreQuarantine = async (id) => {
    await window.aegis.restoreQuarantine(id);
    refreshQuarantine();
    updateHealthScore();
  };

  window.deleteQuarantine = async (id) => {
    await window.aegis.deleteQuarantine(id);
    refreshQuarantine();
    updateHealthScore();
  };

  // 7. Audit Reports
  async function refreshReports() {
    const logs = await window.aegis.getReports();
    const body = document.getElementById('reportsTableBody');
    if (!logs || logs.length === 0) {
      body.innerHTML = '<tr><td colspan="3" style="text-align: center; color: var(--text-light); padding: 24px;">No historical events recorded yet.</td></tr>';
      return;
    }

    body.innerHTML = logs.map(l => `
      <tr>
        <td>${new Date(l.timestamp).toLocaleString()}</td>
        <td><span class="badge ${l.type === 'THREAT' ? 'badge-danger' : 'badge-safe'}">${l.type}</span></td>
        <td>${l.description}</td>
      </tr>
    `).join('');
  }

  // 8. Boot & Auto-Start
  const autoStartToggle = document.getElementById('autoStartToggle');
  async function refreshBootSettings() {
    const enabled = await window.aegis.isAutoStart();
    if (autoStartToggle) autoStartToggle.checked = enabled;
  }

  autoStartToggle?.addEventListener('change', async (e) => {
    await window.aegis.toggleAutoStart(e.target.checked);
  });

  // Health Score Updater
  async function updateHealthScore() {
    const score = await window.aegis.getHealthScore();
    const scoreEl = document.getElementById('healthScoreValue');
    if (scoreEl) {
      window.motion.animateCounter(scoreEl, score, 400);
      window.motion.pulseElement(scoreEl);
    }
  }

  // Initial Load
  updateHealthScore();
  refreshFirewall();
  refreshBootSettings();
});

