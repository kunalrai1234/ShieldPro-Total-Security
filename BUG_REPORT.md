# AEGIS CYBERSECURITY SUITE — BUG REPORT & REMEDIATION LOG

**Date:** November 1, 2026  
**Status:** In Progress / Remediating  

---

## Identified Bugs & Vulnerabilities

### BUG-001: Missing `second-instance` Event Handler in Main Process
* **Severity:** Medium
* **Category:** Application Lifecycle & Window Management
* **File:** `main.js`
* **Root Cause:** While `app.requestSingleInstanceLock()` was called, the application did not attach an `app.on('second-instance')` listener. When a second instance was launched (e.g. from Desktop shortcut while the app was running in the system tray), the secondary process exited, but the primary window remained hidden in the tray without notifying the user.
* **Remediation:** Add `app.on('second-instance', () => { if (mainWindow) { if (mainWindow.isMinimized()) mainWindow.restore(); mainWindow.show(); mainWindow.focus(); } });`.

---

### BUG-002: Fragile Line Offset in `firewall.js` Netstat Parser
* **Severity:** Low-Medium
* **Category:** Network Audit Reliability
* **File:** `src/engine/firewall.js`
* **Root Cause:** `getActiveConnections()` assumed a fixed 4-line header offset (`for (let i = 4; i < lines.length)`). On non-English Windows localizations or customized command prompts, header sizes vary, resulting in `NaN` PIDs or malformed socket rows.
* **Remediation:** Replace fixed index slicing with regex filtering: `lines.filter(l => /^\s*(TCP|UDP)\s+/i.test(l))`.

---

### BUG-003: File Shredder Failure on Read-Only Files
* **Severity:** Medium
* **Category:** File I/O & Permissions
* **File:** `src/engine/shredder.js`
* **Root Cause:** Opening a file with `fs.openSync(filePath, 'r+')` throws an `EPERM` error if the target file has the Windows Read-Only attribute (`+R`).
* **Remediation:** Add permission normalization before opening: `try { fs.chmodSync(filePath, 0o666); } catch (e) {}`.

---

### BUG-004: Lack of Rollback Transaction in Quarantine File Isolation
* **Severity:** Medium
* **Category:** Data Integrity & Error Recovery
* **File:** `src/engine/quarantine.js`
* **Root Cause:** In `quarantineFile()`, if writing the encrypted vault file succeeded but `fs.unlinkSync(targetPath)` failed (due to process lock or ACL denial), the encrypted file remained in the vault while the original file was still on disk, creating an orphan payload.
* **Remediation:** Wrap file deletion in a try-catch block and automatically unlink the newly created vault file if original file removal fails.

---

### BUG-005: Command Parameter Quoting in Startup Registry Manager
* **Severity:** Low
* **Category:** Windows Compatibility
* **File:** `src/engine/bootManager.js`
* **Root Cause:** When `process.execPath` contains spaces (e.g. `C:\Program Files\Aegis Antivirus\Aegis Antivirus.exe`), the nested quotes in `reg add` must be formatted strictly to prevent Windows Registry parsing truncation.
* **Remediation:** Format command string with explicit nested escape quotes: `reg add "${REG_KEY}" /v "${APP_REG_NAME}" /t REG_SZ /d "\"${execTarget}\" --hidden" /f`.

---

### BUG-006: Inline `onclick` Attributes in Renderer Template
* **Severity:** Low
* **Category:** UI Security & CSP Compliance
* **File:** `src/ui/renderer.js` & `src/ui/index.html`
* **Root Cause:** Quarantine table rows dynamically injected inline `onclick="restoreQuarantine('...')"` handlers into the DOM. In strict CSP configurations, inline handlers may be blocked or fail.
* **Remediation:** Replace inline handlers with standard event delegation on `#quarantineTableBody` listening for `data-action="restore"` and `data-action="delete"`.

---

### BUG-007: Unvalidated Custom Scan Folder Argument
* **Severity:** Low
* **Category:** Input Validation
* **File:** `main.js`
* **Root Cause:** `ipcMain.handle('scan-custom', async (_, folderPath))` directly passed `folderPath` to `scanEngine.startScan([folderPath])` without validating if the argument is null, undefined, or a non-existent path.
* **Remediation:** Guard with `if (!folderPath || typeof folderPath !== 'string' || !fs.existsSync(folderPath)) return { scannedFiles: 0, threatsDetected: [] };`.

---

### BUG-008: Tray Icon Resolution Path
* **Severity:** Low
* **Category:** UI Asset Loading
* **File:** `main.js`
* **Root Cause:** `createTray()` referenced `assets/icons/shield.png`, which is a lower resolution fallback rather than the official 256x256 `icon.png` or `icon.ico`.
* **Remediation:** Update tray icon reference to `assets/icons/icon.png` and ensure graceful fallback if tray icon instantiation fails.

