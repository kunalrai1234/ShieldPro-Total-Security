/**
 * AEGIS CYBERSECURITY SUITE
 * DoD 5220.22-M Compliant Secure File Shredder
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/**
 * Physically overwrite file bytes before deletion
 */
async function shredFile(filePath, progressCallback = () => { }) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Target file not found: ${filePath}`);
  }

  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const fd = fs.openSync(filePath, 'r+');

  const CHUNK_SIZE = 64 * 1024; // 64 KB buffer

  try {
    // Pass 1: Overwrite with Zeros (0x00)
    progressCallback({ pass: 1, totalPasses: 3, percent: 33, status: 'Overwriting with zero bytes (0x00)...' });
    const zeroBuffer = Buffer.alloc(CHUNK_SIZE, 0x00);
    let bytesWritten = 0;
    while (bytesWritten < fileSize) {
      const bytesToWrite = Math.min(CHUNK_SIZE, fileSize - bytesWritten);
      fs.writeSync(fd, zeroBuffer, 0, bytesToWrite, bytesWritten);
      bytesWritten += bytesToWrite;
    }
    fs.fsyncSync(fd);

    // Pass 2: Overwrite with Ones (0xFF)
    progressCallback({ pass: 2, totalPasses: 3, percent: 66, status: 'Overwriting with binary ones (0xFF)...' });
    const oneBuffer = Buffer.alloc(CHUNK_SIZE, 0xFF);
    bytesWritten = 0;
    while (bytesWritten < fileSize) {
      const bytesToWrite = Math.min(CHUNK_SIZE, fileSize - bytesWritten);
      fs.writeSync(fd, oneBuffer, 0, bytesToWrite, bytesWritten);
      bytesWritten += bytesToWrite;
    }
    fs.fsyncSync(fd);

    // Pass 3: Overwrite with Cryptographic Pseudo-Random Bytes
    progressCallback({ pass: 3, totalPasses: 3, percent: 90, status: 'Overwriting with cryptographic random entropy...' });
    bytesWritten = 0;
    while (bytesWritten < fileSize) {
      const bytesToWrite = Math.min(CHUNK_SIZE, fileSize - bytesWritten);
      const randBuffer = crypto.randomBytes(bytesToWrite);
      fs.writeSync(fd, randBuffer, 0, bytesToWrite, bytesWritten);
      bytesWritten += bytesToWrite;
    }
    fs.fsyncSync(fd);

    // Truncate file size to 0
    fs.ftruncateSync(fd, 0);
  } finally {
    fs.closeSync(fd);
  }

  // Rename to random string to obfuscate MFT/Directory metadata
  const dir = path.dirname(filePath);
  const randomName = path.join(dir, crypto.randomBytes(12).toString('hex') + '.tmp');
  try {
    fs.renameSync(filePath, randomName);
    fs.unlinkSync(randomName);
  } catch (err) {
    // Fallback direct delete
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  progressCallback({ pass: 3, totalPasses: 3, percent: 100, status: 'File permanently shredded and destroyed.' });
  return { success: true, originalPath: filePath, size: fileSize };
}

module.exports = {
  shredFile
};

