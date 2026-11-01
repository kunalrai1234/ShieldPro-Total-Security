/**
 * AEGIS CYBERSECURITY SUITE
 * Dynamic Persistent Storage Path Resolver (Asar-Safe)
 */

const path = require('path');
const fs = require('fs');

function getBaseStorageDir() {
  let baseDir;
  try {
    const electron = require('electron');
    const app = electron.app || (electron.remote && electron.remote.app);
    if (app && typeof app.getPath === 'function') {
      baseDir = path.join(app.getPath('userData'), 'vault');
    }
  } catch (err) {
    // Fallback for tests or non-electron environments
  }

  if (!baseDir) {
    baseDir = path.resolve(__dirname, '../../quarantine_vault');
  }

  if (!fs.existsSync(baseDir)) {
    try {
      fs.mkdirSync(baseDir, { recursive: true });
    } catch (e) {}
  }

  return baseDir;
}

module.exports = {
  getBaseStorageDir
};

