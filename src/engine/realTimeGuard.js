/**
 * SHIELDPRO TOTAL SECURITY
 * Real-Time On-Access Shield & Download Sentinel
 */

const chokidar = require('chokidar');
const path = require('path');
const os = require('os');
const fs = require('fs');
const { ScanEngine } = require('./scanner');
const { quarantineFile } = require('./quarantine');

// Temporary in-progress download extensions used by browsers
const INCOMPLETE_DOWNLOAD_EXTENSIONS = new Set([
  '.crdownload', // Chrome & Edge
  '.part',       // Firefox
  '.download',   // Safari & others
  '.tmp',        // General temporary download
  '.opdownload'  // Opera
]);

class RealTimeGuard {
  constructor(options = {}) {
    this.isActive = false;
    this.watcher = null;
    this.scanner = new ScanEngine();
    this.autoQuarantine = options.autoQuarantine !== false;
    this.notifyOnSafe = options.notifyOnSafe !== false;
    this.onThreatDetected = options.onThreatDetected || (() => {});
    this.onFileScanned = options.onFileScanned || (() => {});
    this.onStatusChange = options.onStatusChange || (() => {});
    this.monitoredPaths = [];
    this.recentlyScanned = new Map(); // Debounce map (path -> timestamp)
  }

  getDefaultWatchPaths() {
    const home = os.homedir();
    const paths = [
      path.join(home, 'Downloads'),
      path.join(home, 'Desktop'),
      path.join(home, 'AppData', 'Roaming', 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Startup')
    ];
    return paths.filter(p => fs.existsSync(p));
  }

  start(customPaths = null) {
    if (this.isActive) return;

    this.monitoredPaths = customPaths && customPaths.length > 0 ? customPaths : this.getDefaultWatchPaths();

    this.watcher = chokidar.watch(this.monitoredPaths, {
      ignored: [
        /(^|[\/\\])\../,
        '**/*.aegis-vault',
        '**/quarantine_vault/**',
        '**/vault/**'
      ],
      persistent: true,
      ignoreInitial: true, // Only monitor newly downloaded or modified files
      awaitWriteFinish: {
        stabilityThreshold: 800, // Wait until file write completes
        pollInterval: 150
      }
    });

    this.watcher.on('add', (filePath) => this.handleFileEvent('CREATE', filePath));
    this.watcher.on('change', (filePath) => this.handleFileEvent('MODIFY', filePath));
    this.watcher.on('error', (error) => console.error('Real-Time Watcher error:', error));

    this.isActive = true;
    this.onStatusChange({ isActive: true, monitoredPaths: this.monitoredPaths });
  }

  stop() {
    if (!this.isActive || !this.watcher) return;
    this.watcher.close();
    this.watcher = null;
    this.isActive = false;
    this.onStatusChange({ isActive: false, monitoredPaths: [] });
  }

  async handleFileEvent(action, filePath) {
    try {
      if (!fs.existsSync(filePath)) return;
      const stat = fs.statSync(filePath);
      if (stat.isDirectory()) return;

      const ext = path.extname(filePath).toLowerCase();
      // Ignore in-progress incomplete browser downloads
      if (INCOMPLETE_DOWNLOAD_EXTENSIONS.has(ext)) {
        return;
      }

      // Debounce: prevent duplicate scan events within 2 seconds
      const now = Date.now();
      const lastScan = this.recentlyScanned.get(filePath);
      if (lastScan && now - lastScan < 2000) {
        return;
      }
      this.recentlyScanned.set(filePath, now);
      if (this.recentlyScanned.size > 200) {
        const oldestKey = this.recentlyScanned.keys().next().value;
        this.recentlyScanned.delete(oldestKey);
      }

      // Check if file is in Downloads directory
      const isDownload = filePath.toLowerCase().includes('download');
      const fileName = path.basename(filePath);

      // Perform file scan
      const threat = await this.scanner.scanSingleFile(filePath);

      if (threat) {
        let quarantinedRecord = null;
        if (this.autoQuarantine && threat.severity !== 'Test/Safe') {
          try {
            quarantinedRecord = quarantineFile(filePath, threat);
          } catch (qErr) {
            console.error('Auto quarantine failed:', qErr);
          }
        }

        this.onThreatDetected({
          action,
          filePath,
          fileName,
          isDownload,
          threat,
          isQuarantined: !!quarantinedRecord,
          quarantinedRecord,
          timestamp: new Date().toISOString()
        });
      } else {
        // File is clean & safe!
        const hashes = await this.scanner.computeFileHashes(filePath).catch(() => ({ sha256: '' }));
        this.onFileScanned({
          action,
          filePath,
          fileName,
          isDownload,
          isSafe: true,
          fileSize: stat.size,
          sha256: hashes.sha256 || '',
          timestamp: new Date().toISOString()
        });
      }
    } catch (err) {
      console.error('Real-time download inspection error:', err);
    }
  }
}

module.exports = {
  RealTimeGuard
};
