/**
 * AEGIS CYBERSECURITY SUITE
 * Safe Quarantine Isolation & AES-256 Vault
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const VAULT_DIR = path.resolve(__dirname, '../../quarantine_vault');
const MANIFEST_PATH = path.join(VAULT_DIR, 'vault_manifest.json');
const VAULT_KEY = crypto.createHash('sha256').update('aegis-antivirus-local-vault-key-v1').digest();

// Ensure vault directory exists
if (!fs.existsSync(VAULT_DIR)) {
  fs.mkdirSync(VAULT_DIR, { recursive: true });
}

function loadManifest() {
  try {
    if (fs.existsSync(MANIFEST_PATH)) {
      return JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
    }
  } catch (err) {
    console.error('Failed to load quarantine manifest:', err);
  }
  return [];
}

function saveManifest(manifest) {
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2), 'utf8');
}

/**
 * Encrypt and quarantine a target file
 */
function quarantineFile(targetPath, threatDetails) {
  if (!fs.existsSync(targetPath)) {
    throw new Error(`File does not exist: ${targetPath}`);
  }

  const fileBuffer = fs.readFileSync(targetPath);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', VAULT_KEY, iv);
  const encrypted = Buffer.concat([cipher.update(fileBuffer), cipher.final()]);

  const fileId = crypto.randomUUID();
  const quarantinedFileName = `${fileId}.aegis-vault`;
  const vaultFilePath = path.join(VAULT_DIR, quarantinedFileName);

  // Write IV + encrypted content
  fs.writeFileSync(vaultFilePath, Buffer.concat([iv, encrypted]));

  // Remove original file
  fs.unlinkSync(targetPath);

  const manifest = loadManifest();
  const record = {
    id: fileId,
    originalPath: targetPath,
    fileName: path.basename(targetPath),
    threatName: threatDetails.name || 'Generic.Threat',
    severity: threatDetails.severity || 'High',
    sha256: threatDetails.sha256 || '',
    quarantinedAt: new Date().toISOString(),
    vaultFile: quarantinedFileName,
    fileSize: fileBuffer.length
  };

  manifest.push(record);
  saveManifest(manifest);

  return record;
}

/**
 * Restore file from quarantine
 */
function restoreFile(fileId) {
  const manifest = loadManifest();
  const index = manifest.findIndex(item => item.id === fileId);
  if (index === -1) {
    throw new Error('Quarantine record not found');
  }

  const record = manifest[index];
  const vaultFilePath = path.join(VAULT_DIR, record.vaultFile);

  if (!fs.existsSync(vaultFilePath)) {
    throw new Error('Vault payload missing on disk');
  }

  const payload = fs.readFileSync(vaultFilePath);
  const iv = payload.subarray(0, 16);
  const encryptedData = payload.subarray(16);

  const decipher = crypto.createDecipheriv('aes-256-cbc', VAULT_KEY, iv);
  const decrypted = Buffer.concat([decipher.update(encryptedData), decipher.final()]);

  // Ensure target folder exists
  const targetDir = path.dirname(record.originalPath);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  fs.writeFileSync(record.originalPath, decrypted);
  fs.unlinkSync(vaultFilePath);

  manifest.splice(index, 1);
  saveManifest(manifest);

  return record;
}

/**
 * Permanently delete quarantined item
 */
function deleteFromQuarantine(fileId) {
  const manifest = loadManifest();
  const index = manifest.findIndex(item => item.id === fileId);
  if (index === -1) {
    return false;
  }

  const record = manifest[index];
  const vaultFilePath = path.join(VAULT_DIR, record.vaultFile);
  if (fs.existsSync(vaultFilePath)) {
    fs.unlinkSync(vaultFilePath);
  }

  manifest.splice(index, 1);
  saveManifest(manifest);
  return true;
}

module.exports = {
  loadManifest,
  quarantineFile,
  restoreFile,
  deleteFromQuarantine
};

