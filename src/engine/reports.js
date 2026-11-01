/**
 * AEGIS CYBERSECURITY SUITE
 * Security Audit Reports & Health Score Calculator
 */

const fs = require('fs');
const path = require('path');
const { getBaseStorageDir } = require('./storagePaths');

function getLogsFile() {
  return path.join(getBaseStorageDir(), 'audit_logs.json');
}

function getLogs() {
  try {
    const file = getLogsFile();
    if (fs.existsSync(file)) {
      return JSON.parse(fs.readFileSync(file, 'utf8'));
    }
  } catch (err) {
    console.error('Error reading audit logs:', err);
  }
  return [];
}

function appendLog(event) {
  const file = getLogsFile();
  const logs = getLogs();
  const entry = {
    id: Date.now().toString(),
    timestamp: new Date().toISOString(),
    ...event
  };
  logs.unshift(entry);
  if (logs.length > 200) logs.pop(); // Keep last 200 events
  try {
    fs.writeFileSync(file, JSON.stringify(logs, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to write audit logs:', err);
  }
  return entry;
}

/**
 * Calculate dynamic system security score (0 - 100)
 */
function calculateHealthScore(realTimeActive, firewallActive, unhandledThreatsCount = 0) {
  let score = 50; // baseline

  if (realTimeActive) score += 25;
  if (firewallActive) score += 25;

  // Deduct for active unhandled threats
  score -= Math.min(40, unhandledThreatsCount * 20);

  return Math.max(10, Math.min(100, score));
}

module.exports = {
  getLogs,
  appendLog,
  calculateHealthScore
};

