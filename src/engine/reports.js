/**
 * AEGIS CYBERSECURITY SUITE
 * Security Audit Reports & Health Score Calculator
 */

const fs = require('fs');
const path = require('path');

const LOGS_FILE = path.resolve(__dirname, '../../quarantine_vault/audit_logs.json');

function getLogs() {
  try {
    if (fs.existsSync(LOGS_FILE)) {
      return JSON.parse(fs.readFileSync(LOGS_FILE, 'utf8'));
    }
  } catch (err) {
    console.error('Error reading audit logs:', err);
  }
  return [];
}

function appendLog(event) {
  const logs = getLogs();
  const entry = {
    id: Date.now().toString(),
    timestamp: new Date().toISOString(),
    ...event
  };
  logs.unshift(entry);
  if (logs.length > 200) logs.pop(); // Keep last 200 events
  fs.writeFileSync(LOGS_FILE, JSON.stringify(logs, null, 2), 'utf8');
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

