/**
 * AEGIS CYBERSECURITY SUITE
 * Secure Preload IPC Bridge
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('aegis', {
  // Window Controls
  minimize: () => ipcRenderer.send('window-minimize'),
  close: () => ipcRenderer.send('window-close'),

  // Scanner
  startQuickScan: () => ipcRenderer.invoke('scan-quick'),
  startFullScan: () => ipcRenderer.invoke('scan-full'),
  startCustomScan: (folderPath) => ipcRenderer.invoke('scan-custom', folderPath),
  cancelScan: () => ipcRenderer.send('scan-cancel'),
  selectDirectory: () => ipcRenderer.invoke('dialog-select-directory'),
  selectFile: () => ipcRenderer.invoke('dialog-select-file'),

  // Real-Time Shield
  toggleRealTime: (enable) => ipcRenderer.invoke('realtime-toggle', enable),
  getRealTimeStatus: () => ipcRenderer.invoke('realtime-status'),

  // Firewall
  getFirewallStatus: () => ipcRenderer.invoke('firewall-status'),
  getActiveSockets: () => ipcRenderer.invoke('firewall-sockets'),

  // Shredder
  shredFile: (filePath) => ipcRenderer.invoke('shredder-shred', filePath),

  // Quarantine
  getQuarantineList: () => ipcRenderer.invoke('quarantine-list'),
  restoreQuarantine: (id) => ipcRenderer.invoke('quarantine-restore', id),
  deleteQuarantine: (id) => ipcRenderer.invoke('quarantine-delete', id),

  // Reports & Health
  getReports: () => ipcRenderer.invoke('reports-list'),
  getHealthScore: () => ipcRenderer.invoke('reports-score'),

  // Boot & Settings
  isAutoStart: () => ipcRenderer.invoke('boot-status'),
  toggleAutoStart: (enable) => ipcRenderer.invoke('boot-toggle', enable),

  // Event Listeners (Streaming IPC)
  onScanProgress: (callback) => ipcRenderer.on('scan-progress', (_event, data) => callback(data)),
  onScanComplete: (callback) => ipcRenderer.on('scan-complete', (_event, data) => callback(data)),
  onRealTimeThreat: (callback) => ipcRenderer.on('realtime-threat', (_event, data) => callback(data)),
  onShredProgress: (callback) => ipcRenderer.on('shred-progress', (_event, data) => callback(data))
});

