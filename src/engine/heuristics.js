/**
 * AEGIS CYBERSECURITY SUITE
 * Static Heuristics, PE Inspection & Entropy Analysis
 */

const fs = require('fs');
const path = require('path');
const { SUSPICIOUS_SCRIPT_PATTERNS } = require('./signatures');

/**
 * Calculate Shannon Entropy of a buffer (0.0 to 8.0)
 * High entropy (> 7.2) typically indicates encrypted data, compressed archives, or packed executables.
 */
function calculateEntropy(buffer) {
  if (!buffer || buffer.length === 0) return 0;
  const frequencies = new Array(256).fill(0);
  for (let i = 0; i < buffer.length; i++) {
    frequencies[buffer[i]]++;
  }

  let entropy = 0;
  const total = buffer.length;
  for (let i = 0; i < 256; i++) {
    if (frequencies[i] > 0) {
      const p = frequencies[i] / total;
      entropy -= p * Math.log2(p);
    }
  }
  return parseFloat(entropy.toFixed(3));
}

/**
 * Inspect a file for suspicious patterns, PE header markers, and double extensions.
 */
function analyzeFileHeuristics(filePath, buffer) {
  const fileName = path.basename(filePath);
  const ext = path.extname(fileName).toLowerCase();
  const findings = [];

  // 1. Double extension deception check (e.g. document.pdf.exe, scan.jpg.scr)
  const doubleExtRegex = /\.(pdf|docx?|xlsx?|txt|jpg|png|mp4)\.(exe|scr|bat|cmd|vbs|js|ps1|hta)$/i;
  if (doubleExtRegex.test(fileName)) {
    findings.push({
      type: 'Heuristic.DoubleExtension',
      name: `Double Extension Deception (${fileName})`,
      severity: 'High',
      confidence: 0.95
    });
  }

  // 2. High risk executables or scripts in non-standard folders
  const highRiskExtensions = new Set(['.exe', '.scr', '.vbs', '.hta', '.bat', '.cmd', '.ps1']);
  if (highRiskExtensions.has(ext) && buffer.length > 0) {
    // Check for PE executable signature ('MZ' header at offset 0)
    const isPE = buffer.length >= 2 && buffer[0] === 0x4D && buffer[1] === 0x5A; // 'MZ'
    
    // Entropy check on executables
    const entropy = calculateEntropy(buffer.subarray(0, Math.min(buffer.length, 65536)));
    if (isPE && entropy > 7.4) {
      findings.push({
        type: 'Heuristic.PackedExecutable',
        name: `High-Entropy Packed Binary (Entropy: ${entropy})`,
        severity: 'Medium',
        confidence: 0.75
      });
    }

    // Inspect script content for obfuscation or abused LOLBins (Living Off the Land Binaries)
    if (['.bat', '.cmd', '.ps1', '.vbs', '.js'].includes(ext)) {
      const textContent = buffer.toString('utf8', 0, Math.min(buffer.length, 100000));
      for (const rule of SUSPICIOUS_SCRIPT_PATTERNS) {
        if (rule.pattern.test(textContent)) {
          findings.push({
            type: rule.name,
            name: `Suspicious Script Pattern (${rule.name})`,
            severity: rule.severity,
            confidence: 0.88
          });
        }
      }
    }
  }

  return {
    hasThreat: findings.length > 0,
    findings,
    isSuspicious: findings.some(f => f.severity === 'High' || f.severity === 'Critical')
  };
}

module.exports = {
  calculateEntropy,
  analyzeFileHeuristics
};

