/**
 * AEGIS CYBERSECURITY SUITE
 * Real-Time On-Access Shield (File Watcher & Active Guard)
 */

const chokidar = require('chokidar');
const path = require('path');
const os = require('os');
const fs = require('fs');
const { ScanEngine } = require('./scanner');
const { quarantineFile } = require('./quarantine');

class RealTimeGuard {
  constructor(options = {}) {
    this.isActive = false;
    this.watcher = null;
    this.scanner = new ScanEngine();
    this.autoQuarantine = options.autoQuarantine !== false;
    this.onThreatDetected = options.onThreatDetected || (() => {});
    this.onStatusChange = options.onStatusChange || (() => {});
    this.monitoredPaths = [];
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
      ignored: [/(^|[\/\\])\../, '**/*.aegis-vault', '**/quarantine_vault/**'],
      persistent: true,
      ignoreInitial: true, // Only monitor newly created or modified files
      awaitWriteFinish: {
        stabilityThreshold: 500,
        pollInterval: 100
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
          threat,
          isQuarantined: !!quarantinedRecord,
          quarantinedRecord,
          timestamp: new Date().toISOString()
        });
      }
    } catch (err) {
      console.error('Real-time file event inspection error:', err);
    }
  }
}

module.exports = {
  RealTimeGuard
};

