/**
 * AEGIS CYBERSECURITY SUITE
 * Electron Main Process & Security Orchestrator
 */

const { app, BrowserWindow, ipcMain, dialog, Tray, Menu, Notification } = require('electron');
const path = require('path');
const os = require('os');
const { ScanEngine, getQuickScanTargets } = require('./src/engine/scanner');
const { RealTimeGuard } = require('./src/engine/realTimeGuard');
const { getFirewallStatus, getActiveConnections } = require('./src/engine/firewall');
const { shredFile } = require('./src/engine/shredder');
const { loadManifest, restoreFile, deleteFromQuarantine } = require('./src/engine/quarantine');
const { getLogs, appendLog, calculateHealthScore } = require('./src/engine/reports');
const { isAutoStartEnabled, enableAutoStart, disableAutoStart } = require('./src/engine/bootManager');

// Single instance lock
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

let mainWindow = null;
let tray = null;
let isQuitting = false;

// Global Engines
const scanEngine = new ScanEngine();
const realTimeGuard = new RealTimeGuard({
  onThreatDetected: (threatEvent) => {
    // Show Windows Native Notification
    if (Notification.isSupported()) {
      new Notification({
        title: threatEvent.isDownload ? 'ShieldPro Download Shield — Threat Blocked!' : 'ShieldPro Real-Time Shield Alert',
        body: `Threat intercepted: ${threatEvent.threat.threatName}\nFile: ${path.basename(threatEvent.filePath)}`,
        icon: path.join(__dirname, 'assets/icons/icon.png'),
        urgency: 'critical'
      }).show();
    }

    appendLog({
      type: 'THREAT',
      description: `Intercepted ${threatEvent.threat.threatName} in ${threatEvent.filePath}`,
      details: threatEvent
    });

    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('realtime-threat', threatEvent);
    }
  },
  onFileScanned: (scanEvent) => {
    // Notify user when a downloaded file is verified clean and safe
    if (scanEvent.isDownload && Notification.isSupported()) {
      new Notification({
        title: 'ShieldPro Download Shield — File Safe',
        body: `✅ "${scanEvent.fileName}" is clean & safe to open.\n(SHA-256 verified, 0 threats detected)`,
        icon: path.join(__dirname, 'assets/icons/icon.png')
      }).show();
    }

    appendLog({
      type: scanEvent.isDownload ? 'DOWNLOAD_SAFE' : 'SCAN_CLEAN',
      description: `File verified safe: ${scanEvent.fileName}`,
      details: scanEvent
    });

    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('realtime-safe', scanEvent);
    }
  }
});

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1080,
    height: 720,
    minWidth: 900,
    minHeight: 600,
    frame: false,
    show: false,
    icon: path.join(__dirname, 'assets/icons/icon.ico'),
    backgroundColor: '#f8fafc',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'src/ui/index.html'));

  mainWindow.once('ready-to-show', () => {
    // Check if launched with --hidden (from Windows boot auto-start)
    if (!process.argv.includes('--hidden')) {
      mainWindow.show();
    }
  });

  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
      return false;
    }
  });
}

function createTray() {
  // Simple tray setup
  tray = new Tray(path.join(__dirname, 'assets/icons/shield.png'));
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Open ShieldPro Total Security', click: () => { mainWindow.show(); mainWindow.focus(); } },
    { type: 'separator' },
    { label: 'Real-Time Protection Active', enabled: false },
    { type: 'separator' },
    { label: 'Exit Application', click: () => { isQuitting = true; app.quit(); } }
  ]);

  tray.setToolTip('ShieldPro Total Security — Protected');
  tray.setContextMenu(contextMenu);
  tray.on('double-click', () => {
    mainWindow.show();
    mainWindow.focus();
  });
}

app.whenReady().then(async () => {
  createWindow();
  
  // Start Real-Time Watchdog automatically
  realTimeGuard.start();

  appendLog({
    type: 'SYSTEM',
    description: 'ShieldPro Security Engine started & Real-Time Shield engaged.'
  });

  // Try creating tray if icon exists or fallback gracefully
  try {
    createTray();
  } catch (err) {
    // Fallback if icon format requires conversion
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('before-quit', () => {
  isQuitting = true;
  realTimeGuard.stop();
});

app.on('session-end', () => {
  isQuitting = true;
  realTimeGuard.stop();
});

// App Window Management IPC
ipcMain.on('window-minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.on('window-close', () => {
  if (mainWindow) mainWindow.hide(); // Minimize to tray
});

// Scanner IPC
ipcMain.handle('scan-quick', async () => {
  appendLog({ type: 'SCAN', description: 'Initiated Quick Scan.' });
  const targets = getQuickScanTargets();
  const results = await scanEngine.startScan(targets, (progress) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('scan-progress', progress);
    }
  });
  return results;
});

ipcMain.handle('scan-full', async () => {
  appendLog({ type: 'SCAN', description: 'Initiated Full Drive Scan.' });
  // Target user home root
  const results = await scanEngine.startScan([os.homedir()], (progress) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('scan-progress', progress);
    }
  });
  return results;
});

ipcMain.handle('scan-custom', async (_event, folderPath) => {
  const fs = require('fs');
  if (!folderPath || typeof folderPath !== 'string' || !fs.existsSync(folderPath)) {
    return {
      scannedFiles: 0,
      threatsDetected: [],
      startTime: new Date(),
      endTime: new Date()
    };
  }
  appendLog({ type: 'SCAN', description: `Initiated Custom Scan on ${folderPath}` });
  const results = await scanEngine.startScan([folderPath], (progress) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('scan-progress', progress);
    }
  });
  return results;
});

ipcMain.on('scan-cancel', () => {
  scanEngine.cancelScan();
  appendLog({ type: 'SCAN', description: 'Scan aborted by user.' });
});

ipcMain.handle('dialog-select-directory', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  });
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle('dialog-select-file', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile']
  });
  return result.canceled ? null : result.filePaths[0];
});

// Real-Time Shield IPC
ipcMain.handle('realtime-toggle', async (_event, enable) => {
  if (enable) {
    realTimeGuard.start();
    appendLog({ type: 'SHIELD', description: 'Real-Time Protection enabled.' });
  } else {
    realTimeGuard.stop();
    appendLog({ type: 'SHIELD', description: 'Real-Time Protection paused by user.' });
  }
  return realTimeGuard.isActive;
});

ipcMain.handle('realtime-status', () => realTimeGuard.isActive);

// Firewall & Network IPC
ipcMain.handle('firewall-status', async () => getFirewallStatus());
ipcMain.handle('firewall-sockets', async () => getActiveConnections());

// Shredder IPC
ipcMain.handle('shredder-shred', async (_event, filePath) => {
  try {
    const res = await shredFile(filePath, (progress) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('shred-progress', progress);
      }
    });
    appendLog({ type: 'PRIVACY', description: `Permanently shredded file: ${filePath}` });
    return res;
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// Quarantine Vault IPC
ipcMain.handle('quarantine-list', () => loadManifest());
ipcMain.handle('quarantine-restore', (_event, id) => {
  try {
    const restored = restoreFile(id);
    appendLog({ type: 'VAULT', description: `Restored file ${restored.fileName} to ${restored.originalPath}` });
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('quarantine-delete', (_event, id) => {
  const ok = deleteFromQuarantine(id);
  appendLog({ type: 'VAULT', description: `Deleted quarantine entry ${id}` });
  return { success: ok };
});

// Reports & Security Score IPC
ipcMain.handle('reports-list', () => getLogs());
ipcMain.handle('reports-score', async () => {
  const fw = await getFirewallStatus();
  const manifest = loadManifest();
  return calculateHealthScore(realTimeGuard.isActive, fw.isProtected, manifest.length);
});

// Boot & Auto-Start IPC
ipcMain.handle('boot-status', async () => isAutoStartEnabled());
ipcMain.handle('boot-toggle', async (_event, enable) => {
  if (enable) {
    const res = await enableAutoStart();
    appendLog({ type: 'BOOT', description: 'Enabled Windows Startup Auto-Boot.' });
    return res;
  } else {
    const res = await disableAutoStart();
    appendLog({ type: 'BOOT', description: 'Disabled Windows Startup Auto-Boot.' });
    return res;
  }
});

