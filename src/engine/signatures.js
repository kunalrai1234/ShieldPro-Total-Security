/**
 * AEGIS CYBERSECURITY SUITE
 * Signatures Database & Known Threat Hashes
 */

// Standard EICAR Antivirus Test Signature & Hashes
const EICAR_STRING = 'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*';
const EICAR_SHA256 = '275a021bbfb6489e54d471899f7db9d1663fc695ec2fe2a2c4538aabf651fd0f';
const EICAR_MD5 = '44d88612fea8a8f36de82e1278abb02f';

// Known Benchmark Malicious Hashes (Sha256)
const KNOWN_THREAT_HASHES = new Map([
  [EICAR_SHA256, { name: 'EICAR-Test-File (Standard Antivirus Benchmark)', severity: 'Test/Safe', category: 'Benchmark' }],
  ['44d88612fea8a8f36de82e1278abb02f', { name: 'EICAR-Test-File.MD5', severity: 'Test/Safe', category: 'Benchmark' }],
  // Well-known historical malware hashes for benchmarking
  ['09a0877d99c437793ec7b9e65b3b55ad3300a012', { name: 'Trojan.Win32.WannaCry.Generic', severity: 'High', category: 'Ransomware' }],
  ['ed01ebfbc9eb5bbea545af4d01bf5f1071661840480439c6e5babe8e080e41aa', { name: 'Trojan.Ransom.WannaCrypt.A', severity: 'Critical', category: 'Ransomware' }],
  ['5176b6532822d861f2227c0938f21e8a4e295e4e81e670d72697842600206122', { name: 'Trojan.Generic.NotPetya', severity: 'Critical', category: 'Wiper' }],
  ['71b46329ce65536191c790d298b073f338e9a759b4edd169da09fb37b2a51742', { name: 'Backdoor.Win32.Emotet.Payload', severity: 'Critical', category: 'Trojan' }]
]);

// Suspicious Keywords & Heuristic Indicators
const SUSPICIOUS_SCRIPT_PATTERNS = [
  { pattern: /powershell(\.exe)?\s+(-(enc|encodedcommand)\s+[A-Za-z0-9+/=]{20,})/i, name: 'Heuristic.Script.ObfuscatedPowerShell', severity: 'High' },
  { pattern: /cmd(\.exe)?\s+\/c\s+echo\s+.*?\|\s*powershell/i, name: 'Heuristic.Script.CommandPipeToPS', severity: 'High' },
  { pattern: /wscript\.shell|cscript\.exe.*\.vbs/i, name: 'Heuristic.Script.VBSExecution', severity: 'Medium' },
  { pattern: /certutil(\.exe)?\s+-urlcache\s+-split\s+-f/i, name: 'Heuristic.Tool.CertutilAbuse', severity: 'High' },
  { pattern: /bitsadmin(\.exe)?\s+\/transfer/i, name: 'Heuristic.Tool.BitsadminDownload', severity: 'Medium' }
];

module.exports = {
  EICAR_STRING,
  EICAR_SHA256,
  EICAR_MD5,
  KNOWN_THREAT_HASHES,
  SUSPICIOUS_SCRIPT_PATTERNS
};

