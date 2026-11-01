/**
 * AEGIS CYBERSECURITY SUITE
 * Multi-Threaded On-Demand File Scanner
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const os = require('os');
const { KNOWN_THREAT_HASHES, EICAR_STRING } = require('./signatures');
const { analyzeFileHeuristics } = require('./heuristics');

class ScanEngine {
  constructor() {
    this.isScanning = false;
    this.shouldCancel = false;
    this.stats = {
      scannedFiles: 0,
      threatsDetected: [],
      startTime: null,
      endTime: null
    };
  }

  cancelScan() {
    this.shouldCancel = true;
  }

  /**
   * Fast Streaming Hash Calculator
   */
  async computeFileHashes(filePath) {
    return new Promise((resolve, reject) => {
      const sha256 = crypto.createHash('sha256');
      const md5 = crypto.createHash('md5');
      const stream = fs.createReadStream(filePath, { highWaterMark: 64 * 1024 });

      let previewBuffer = Buffer.alloc(0);

      stream.on('data', (chunk) => {
        sha256.update(chunk);
        md5.update(chunk);
        if (previewBuffer.length < 65536) {
          previewBuffer = Buffer.concat([previewBuffer, chunk]);
        }
      });

      stream.on('end', () => {
        resolve({
          sha256: sha256.digest('hex'),
          md5: md5.digest('hex'),
          previewBuffer
        });
      });

      stream.on('error', (err) => {
        reject(err);
      });
    });
  }

  /**
   * Scan an individual file against known signatures & heuristics
   */
  async scanSingleFile(filePath) {
    try {
      if (!fs.existsSync(filePath)) return null;
      const stat = fs.statSync(filePath);
      if (stat.isDirectory()) return null;

      // Skip files larger than 250MB for real-time responsiveness (configurable)
      if (stat.size > 250 * 1024 * 1024) {
        return null;
      }

      // 1. Check for EICAR standard test string directly if small file
      if (stat.size < 5000) {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        if (fileContent.includes(EICAR_STRING)) {
          return {
            filePath,
            fileName: path.basename(filePath),
            threatName: 'EICAR-Standard-AV-Test-File',
            category: 'Benchmark/Validation',
            severity: 'Test/Safe',
            confidence: 1.0,
            detectionType: 'Signature'
          };
        }
      }

      // 2. Compute Streaming Hashes
      const { sha256, md5, previewBuffer } = await this.computeFileHashes(filePath);

      // Check Known Threat Hash DB
      if (KNOWN_THREAT_HASHES.has(sha256)) {
        const threat = KNOWN_THREAT_HASHES.get(sha256);
        return {
          filePath,
          fileName: path.basename(filePath),
          threatName: threat.name,
          category: threat.category,
          severity: threat.severity,
          confidence: 1.0,
          sha256,
          detectionType: 'Known-Hash'
        };
      }

      if (KNOWN_THREAT_HASHES.has(md5)) {
        const threat = KNOWN_THREAT_HASHES.get(md5);
        return {
          filePath,
          fileName: path.basename(filePath),
          threatName: threat.name,
          category: threat.category,
          severity: threat.severity,
          confidence: 1.0,
          sha256,
          detectionType: 'Known-MD5'
        };
      }

      // 3. Heuristic & Static Inspection
      const heuristicResults = analyzeFileHeuristics(filePath, previewBuffer);
      if (heuristicResults.hasThreat) {
        const primaryThreat = heuristicResults.findings[0];
        return {
          filePath,
          fileName: path.basename(filePath),
          threatName: primaryThreat.name,
          category: primaryThreat.type,
          severity: primaryThreat.severity,
          confidence: primaryThreat.confidence,
          sha256,
          detectionType: 'Heuristic'
        };
      }

      return null;
    } catch (err) {
      // Handle file permission locks gracefully
      return null;
    }
  }

  /**
   * Recursive directory iterator
   */
  async *traverseDirectory(dirPath) {
    let entries = [];
    try {
      entries = fs.readdirSync(dirPath, { withFileTypes: true });
    } catch (err) {
      return;
    }

    for (const entry of entries) {
      if (this.shouldCancel) return;
      const fullPath = path.join(dirPath, entry.name);
      
      // Skip hidden / system volume information
      if (entry.name === '$Recycle.Bin' || entry.name === 'System Volume Information' || entry.name.startsWith('.git')) {
        continue;
      }

      if (entry.isDirectory()) {
        yield* this.traverseDirectory(fullPath);
      } else if (entry.isFile()) {
        yield fullPath;
      }
    }
  }

  /**
   * Run Scan with live event stream
   */
  async startScan(targetPaths, onProgress = () => {}) {
    this.isScanning = true;
    this.shouldCancel = false;
    this.stats = {
      scannedFiles: 0,
      threatsDetected: [],
      startTime: new Date(),
      endTime: null
    };

    try {
      for (const target of targetPaths) {
        if (this.shouldCancel) break;

        if (!fs.existsSync(target)) continue;
        const stat = fs.statSync(target);

        if (stat.isFile()) {
          this.stats.scannedFiles++;
          const threat = await this.scanSingleFile(target);
          if (threat) this.stats.threatsDetected.push(threat);
          onProgress({
            currentFile: target,
            scannedCount: this.stats.scannedFiles,
            threatCount: this.stats.threatsDetected.length,
            latestThreat: threat
          });
        } else if (stat.isDirectory()) {
          for await (const filePath of this.traverseDirectory(target)) {
            if (this.shouldCancel) break;
            this.stats.scannedFiles++;
            const threat = await this.scanSingleFile(filePath);
            if (threat) {
              this.stats.threatsDetected.push(threat);
            }

            if (this.stats.scannedFiles % 5 === 0 || threat) {
              onProgress({
                currentFile: filePath,
                scannedCount: this.stats.scannedFiles,
                threatCount: this.stats.threatsDetected.length,
                latestThreat: threat
              });
            }
          }
        }
      }
    } finally {
      this.isScanning = false;
      this.stats.endTime = new Date();
    }

    return this.stats;
  }
}

/**
 * Get Standard Quick Scan Targets
 */
function getQuickScanTargets() {
  const home = os.homedir();
  const targets = [
    path.join(home, 'Downloads'),
    path.join(home, 'Desktop'),
    path.join(home, 'Documents'),
    path.join(process.env.TEMP || path.join(home, 'AppData', 'Local', 'Temp')),
    path.join(home, 'AppData', 'Roaming', 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Startup')
  ];
  return targets.filter(t => fs.existsSync(t));
}

module.exports = {
  ScanEngine,
  getQuickScanTargets
};

