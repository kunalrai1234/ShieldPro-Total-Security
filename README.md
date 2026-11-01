# Aegis Total Protection — Modern Cybersecurity Suite

A lightweight, enterprise-grade desktop antivirus, firewall auditor, and privacy protection suite built for Windows 10 and Windows 11.

---

## 🌟 Key Features

### 1. Minimalist Light UI & Pure JavaScript Animations
- Clean, uncluttered Nordic aesthetic with high-contrast text, slate borders, and emerald security accents.
- 60 FPS HTML5 Canvas circular scanner animation with linear progress interpolation (`lerp`).
- Animated metric counters, pulse badges, and instant tab transitions.

### 2. Multi-Mode Virus & Malware Scanner
- **Quick Scan:** Scans Downloads, Desktop, Documents, Temp, and Windows Startup.
- **Full Scan:** Comprehensive audit across the entire user profile directory tree.
- **Custom Scan:** User-selected folder or removable USB drive.
- **Streaming Hash Engine:** Low memory SHA-256 and MD5 computation without loading entire files into RAM.
- **Signature & EICAR Verification:** Instant detection of the industry standard EICAR antivirus test signature.
- **Static Heuristics:** Detection of double-extension deception (e.g. `urgent.pdf.exe`), PE header entropy calculation, and obfuscated PowerShell/script patterns.

### 3. Real-Time On-Access Shield
- Chokidar-powered file system watchdog continuously inspecting newly created or modified files.
- Background protection with automatic isolation and native Windows notification alerts.

### 4. Windows Firewall & Network Auditor
- Audits Windows Firewall profiles (Domain, Private, Public) in real-time.
- Captures active TCP listening sockets and established network connections mapped to Process IDs (PID).

### 5. DoD 5220.22-M Secure File Shredder
- Multi-pass physical sector overwriter:
  - **Pass 1:** Zero bytes (`0x00`)
  - **Pass 2:** Binary ones (`0xFF`)
  - **Pass 3:** Cryptographic pseudo-random entropy
- Truncates file length to 0, randomizes metadata name, and unlinks from the file allocation table.

### 6. Safe Quarantine Vault
- Flagged threats are encrypted on disk with `AES-256-CBC` using a secure local key.
- Isolated files cannot accidentally execute on Windows.
- Supports 1-click safe decryption & restore to original path or permanent deletion.

### 7. Windows Boot Auto-Start (Laptop On Persistence)
- Integrates with the Windows Startup Registry (`HKCU\Software\Microsoft\Windows\CurrentVersion\Run`).
- Whenever the laptop boots up, the security engine starts automatically.
- Minimizes to the Windows System Notification Tray.

---

## 🚀 How to Run

### Option 1: Desktop Shortcut
Double-click the **Aegis Antivirus** icon on your Desktop (`C:\Users\kamle\Desktop\Aegis Antivirus.lnk`).

### Option 2: Command Line
```powershell
cd D:\project\Antivirus
npm start
```

### Option 3: Verification Test Harness
```powershell
cd D:\project\Antivirus
npm test
```
All 13 automated tests verify signature detection, heuristics, quarantine encryption, DoD shredding, firewall querying, and boot registry hooks.

---

## 📁 Project Structure

```
D:\project\Antivirus\
├── main.js                  # Electron Main Process & Security Orchestrator
├── preload.js               # Secure IPC Bridge with Context Isolation
├── package.json             # App Metadata & Dependencies
├── launch.bat               # 1-Click Executable Launcher
├── install-desktop-shortcut.ps1 # Desktop Shortcut Generator
│
├── src/
│   ├── engine/
│   │   ├── scanner.js       # Streaming File Scanner (Quick, Full, Custom)
│   │   ├── signatures.js    # Known Threat Hashes & EICAR Signatures
│   │   ├── heuristics.js    # Shannon Entropy & PE Header Inspector
│   │   ├── realTimeGuard.js # On-Access Directory Watchdog
│   │   ├── firewall.js      # Windows Firewall & Socket Auditor
│   │   ├── shredder.js      # DoD 5220.22-M 3-Pass File Eraser
│   │   ├── quarantine.js    # AES-256 Encrypted File Vault
│   │   ├── bootManager.js   # Windows Startup Registry Persistence
│   │   └── reports.js       # Audit Event Logs & Health Score
│   │
│   └── ui/
│       ├── index.html       # Minimal Light Theme Layout
│       ├── styles.css       # Clean Whites, Slate Borders & Typography
│       ├── animations.js    # 60 FPS Canvas Scan Ring & Lerp Motion
│       └── renderer.js      # Reactive UI State & IPC Consumer
│
├── tests/
│   └── verify-suite.js      # Automated End-to-End Verification Harness
└── quarantine_vault/        # Encrypted Quarantine Storage
```

