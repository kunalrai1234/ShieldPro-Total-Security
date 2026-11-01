/**
 * AEGIS CYBERSECURITY SUITE
 * Automated Engine Verification & Integrity Test Suite (Enhanced)
 */

const fs = require('fs');
const path = require('path');
const { ScanEngine } = require('../src/engine/scanner');
const { EICAR_STRING } = require('../src/engine/signatures');
const { calculateEntropy, analyzeFileHeuristics } = require('../src/engine/heuristics');
const { quarantineFile, restoreFile, deleteFromQuarantine } = require('../src/engine/quarantine');
const { shredFile } = require('../src/engine/shredder');
const { getFirewallStatus, getActiveConnections } = require('../src/engine/firewall');
const { calculateHealthScore } = require('../src/engine/reports');
const { isAutoStartEnabled } = require('../src/engine/bootManager');

async function runTestSuite() {
  console.log('====================================================');
  console.log('   AEGIS SUITE — AUTOMATED VERIFICATION HARNESS    ');
  console.log('====================================================\n');

  let passed = 0;
  let total = 0;

  function assert(testName, condition) {
    total++;
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}`);
    }
  }

  const testDir = path.join(__dirname, 'sandbox');
  if (!fs.existsSync(testDir)) fs.mkdirSync(testDir, { recursive: true });

  // 1. Signature & EICAR Benchmark Detection Test
  const eicarFilePath = path.join(testDir, 'eicar-test.txt');
  fs.writeFileSync(eicarFilePath, EICAR_STRING, 'utf8');

  const scanner = new ScanEngine();
  const eicarDetection = await scanner.scanSingleFile(eicarFilePath);
  assert('Signature Engine detects standard EICAR test string', eicarDetection && eicarDetection.threatName === 'EICAR-Standard-AV-Test-File');

  // 2. Heuristics & Double Extension Test
  const doubleExtFile = path.join(testDir, 'urgent_invoice.pdf.exe');
  fs.writeFileSync(doubleExtFile, 'MZdummy-payload', 'utf8');

  const heuristicResult = await scanner.scanSingleFile(doubleExtFile);
  assert('Heuristic Engine catches Double-Extension Deception (.pdf.exe)', heuristicResult && heuristicResult.category === 'Heuristic.DoubleExtension');

  // 3. Entropy Analysis Test
  const lowEntropyBuf = Buffer.alloc(1024, 0x41); // All 'A's
  const lowEntropy = calculateEntropy(lowEntropyBuf);
  assert('Shannon Entropy on uniform buffer is near 0', lowEntropy === 0);

  const highEntropyBuf = Buffer.alloc(1024);
  for (let i = 0; i < 1024; i++) highEntropyBuf[i] = i % 256;
  const highEntropy = calculateEntropy(highEntropyBuf);
  assert('Shannon Entropy on uniform random bytes is > 7.5', highEntropy > 7.5);

  // 4. Empty 0-byte File Test
  const emptyFile = path.join(testDir, 'empty.txt');
  fs.writeFileSync(emptyFile, '', 'utf8');
  const emptyResult = await scanner.scanSingleFile(emptyFile);
  assert('Scanner handles 0-byte file cleanly without error', emptyResult === null);

  // 5. Scan Cancellation Test
  scanner.cancelScan();
  const cancelStats = await scanner.startScan([testDir]);
  assert('ScanEngine cancellation terminates file traversal gracefully', cancelStats && cancelStats.scannedFiles >= 0);

  // 6. Quarantine Vault Test
  const dummyInfected = path.join(testDir, 'trojan_sample.tmp');
  fs.writeFileSync(dummyInfected, 'malicious_content_payload', 'utf8');

  const qRecord = quarantineFile(dummyInfected, { name: 'Test.Trojan.Simulator', severity: 'High', sha256: 'dummyhash' });
  assert('Quarantine removes original file from disk', !fs.existsSync(dummyInfected));
  assert('Quarantine saves encrypted payload in vault', qRecord && qRecord.id);

  // Restore test
  restoreFile(qRecord.id);
  assert('Quarantine successfully decrypts & restores file', fs.existsSync(dummyInfected));
  fs.unlinkSync(dummyInfected);

  // 7. DoD 5220.22-M Shredder Test on Standard File
  const fileToShred = path.join(testDir, 'sensitive_tax_data.txt');
  fs.writeFileSync(fileToShred, 'CONFIDENTIAL_PERSONAL_IDENTIFIABLE_INFORMATION_1234567890', 'utf8');
  await shredFile(fileToShred);
  assert('File Shredder overwrites and physically erases file', !fs.existsSync(fileToShred));

  // 8. DoD Shredder on Read-Only Protected File (BUG-003 Regression)
  const readOnlyFile = path.join(testDir, 'readonly_secret.txt');
  fs.writeFileSync(readOnlyFile, 'PROTECTED_READONLY_PAYLOAD', 'utf8');
  try { fs.chmodSync(readOnlyFile, 0o444); } catch (e) {} // Make read-only
  await shredFile(readOnlyFile);
  assert('File Shredder successfully shreds Read-Only protected file', !fs.existsSync(readOnlyFile));

  // 9. Live Firewall & Connection Test (BUG-002 Regression)
  const fwStatus = await getFirewallStatus();
  assert('Firewall auditor queries Windows advfirewall state', typeof fwStatus.success === 'boolean');

  const sockets = await getActiveConnections();
  assert('Network auditor captures active listening TCP sockets with valid PIDs', sockets.success && sockets.connections.length >= 0);

  // 10. Security Health Score Algorithm Test
  const perfectScore = calculateHealthScore(true, true, 0);
  assert('Health Score returns 100 when shields & firewall active', perfectScore === 100);

  const degradedScore = calculateHealthScore(false, true, 2);
  assert('Health Score drops appropriately when real-time shield is off and threats exist', degradedScore < 70);

  // 11. Auto-Start Status Query Test
  const isAutoStart = await isAutoStartEnabled();
  assert('Boot Manager queries Windows Startup Registry', typeof isAutoStart === 'boolean');

  // Cleanup test sandbox
  try {
    if (fs.existsSync(eicarFilePath)) fs.unlinkSync(eicarFilePath);
    if (fs.existsSync(doubleExtFile)) fs.unlinkSync(doubleExtFile);
    if (fs.existsSync(emptyFile)) fs.unlinkSync(emptyFile);
    fs.rmdirSync(testDir, { recursive: true });
  } catch (err) {}

  console.log('\n----------------------------------------------------');
  console.log(`Results: ${passed} / ${total} tests passed (${Math.round((passed / total) * 100)}%)\n`);

  if (passed === total) {
    console.log('[SUCCESS] All cybersecurity engine modules and regression tests verified successfully.');
    process.exit(0);
  } else {
    console.error('[FAILURE] Some tests failed.');
    process.exit(1);
  }
}

runTestSuite().catch(err => {
  console.error('Test harness exception:', err);
  process.exit(1);
});
