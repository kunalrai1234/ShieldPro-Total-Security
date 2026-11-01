/**
 * AEGIS CYBERSECURITY SUITE
 * Laptop Boot Auto-Start Manager (Windows Startup Registry)
 */

const { exec } = require('child_process');
const util = require('util');
const path = require('path');
const execAsync = util.promisify(exec);

const REG_KEY = 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run';
const APP_REG_NAME = 'AegisAntivirusSuite';

/**
 * Check if the application is registered to run on Windows startup
 */
async function isAutoStartEnabled() {
  try {
    const { stdout } = await execAsync(`reg query "${REG_KEY}" /v "${APP_REG_NAME}"`);
    return stdout.includes(APP_REG_NAME);
  } catch (err) {
    return false;
  }
}

/**
 * Enable auto-start on laptop boot
 */
async function enableAutoStart(appExecutablePath) {
  try {
    const execTarget = appExecutablePath || process.execPath;
    const command = `reg add "${REG_KEY}" /v "${APP_REG_NAME}" /t REG_SZ /d "\\"${execTarget}\\" --hidden" /f`;
    await execAsync(command);
    return { success: true, enabled: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Disable auto-start on laptop boot
 */
async function disableAutoStart() {
  try {
    const command = `reg delete "${REG_KEY}" /v "${APP_REG_NAME}" /f`;
    await execAsync(command);
    return { success: true, enabled: false };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

module.exports = {
  isAutoStartEnabled,
  enableAutoStart,
  disableAutoStart
};

