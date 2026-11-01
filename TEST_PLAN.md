# AEGIS CYBERSECURITY SUITE — TEST PLAN

**Date:** November 1, 2026  
**Target:** Windows 10 / Windows 11 (x64)  
**Execution Environment:** Node.js v26.13.0 + Electron 45.2.1  

---

## 1. Test Strategy Overview

The testing strategy focuses on 100% ground-truth validation:
- **No Mock Security Logic:** All tests must create real files on disk, compute real SHA-256 hashes, execute real AES-256 encryption/decryption, execute actual physical file overwrites, and interact with live Windows interfaces.
- **Safe Testing:** Only benign test files, simulated threat signatures, and the official EICAR test string (`X5O!P%@AP[4\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*`) are used. Real malware is strictly forbidden on the host machine.
- **Regression Testing:** Automated verification harness runs in CI/local terminal before packaging and verifies all fixes.

---

## 2. Test Suites & Test Cases

### Suite A: Detection Engine & Signatures
1. **TC-01: EICAR Standard Benchmark Detection**
   - *Input:* File containing exact EICAR 68-byte string.
   - *Expected:* Flagged as `EICAR-Standard-AV-Test-File`, severity `Test/Safe`, confidence 1.0.
2. **TC-02: Known Threat Hash Matching**
   - *Input:* File whose SHA-256 matches `KNOWN_THREAT_HASHES`.
   - *Expected:* Detected as malicious with matched name and category.
3. **TC-03: Double Extension Deception**
   - *Input:* File named `statement.pdf.exe`.
   - *Expected:* Caught by heuristics with `Heuristic.DoubleExtension`.
4. **TC-04: Shannon Entropy Calculation**
   - *Input:* 1 KB buffer of all `0x41` ('A's) vs 1 KB uniform pseudorandom buffer.
   - *Expected:* Uniform buffer entropy = 0.0; Random buffer entropy > 7.5.
5. **TC-05: Zero-Byte & Empty Files**
   - *Input:* 0-byte file.
   - *Expected:* Cleanly handled without crashing or throwing divide-by-zero.
6. **TC-06: Permission Denied & Locked Files**
   - *Input:* System file or locked file.
   - *Expected:* Gracefully skipped without unhandled exception.

### Suite B: Quarantine Vault
1. **TC-07: Quarantine Isolation**
   - *Input:* Infected sample file.
   - *Expected:* Original file unlinked; encrypted `.aegis-vault` file written; manifest updated.
2. **TC-08: Safe Decryption & Restoration**
   - *Input:* File ID from manifest.
   - *Expected:* File decrypted back to original path with identical content; vault payload unlinked.
3. **TC-09: Permanent Deletion**
   - *Input:* File ID from manifest.
   - *Expected:* Vault payload deleted; manifest record removed.
4. **TC-10: Rollback on Unlink Failure**
   - *Input:* Read-only or locked target file.
   - *Expected:* Vault file cleaned up if original cannot be removed.

### Suite C: DoD 5220.22-M File Shredder
1. **TC-11: 3-Pass Physical Overwrite**
   - *Input:* File with sensitive ASCII text.
   - *Expected:* Sector overwritten 3 times; file truncated to 0; metadata randomized; file deleted.
2. **TC-12: Read-Only Attribute Handling**
   - *Input:* File with `+R` (read-only) attribute.
   - *Expected:* Attribute stripped; successfully shredded without permission error.

### Suite D: Windows System Integrations
1. **TC-13: Windows Firewall Query**
   - *Input:* Execution of `netsh advfirewall show allprofiles`.
   - *Expected:* Returns boolean status for Domain, Private, and Public profiles.
2. **TC-14: Active Network Sockets Audit**
   - *Input:* Execution of `netstat -ano -p tcp`.
   - *Expected:* Accurately extracts local address, foreign address, state, and PID.
3. **TC-15: Auto-Start Registry Query & Toggle**
   - *Input:* Query `HKCU\Software\Microsoft\Windows\CurrentVersion\Run`.
   - *Expected:* Returns boolean auto-start state; toggles registry key cleanly.
4. **TC-16: Dynamic Security Health Score**
   - *Input:* Real-time active + firewall on + 0 threats vs real-time off + 2 threats.
   - *Expected:* Score drops dynamically from 100 to degraded score (<70).

### Suite E: Application Lifecycle & UI
1. **TC-17: Single-Instance Enforcement & Focus**
   - *Input:* Launch second instance.
   - *Expected:* Second instance terminates; first instance restores and focuses.
2. **TC-18: Scan Cancellation**
   - *Input:* Start scan then click cancel.
   - *Expected:* Traversal stops immediately; returns partial file count.
3. **TC-19: Event Delegation for Quarantine Actions**
   - *Input:* Click restore/delete in quarantine table.
   - *Expected:* Event handled cleanly without inline script evaluation.

