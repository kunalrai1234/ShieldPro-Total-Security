/**
 * AEGIS CYBERSECURITY SUITE
 * Windows Firewall & Active Network Connection Auditor
 */

const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

/**
 * Check Windows Firewall status across Domain, Private and Public profiles
 */
async function getFirewallStatus() {
  try {
    const { stdout } = await execAsync('netsh advfirewall show allprofiles state');
    const isDomainOn = /Domain Profile Settings:[\s\S]*?State\s+ON/i.test(stdout);
    const isPrivateOn = /Private Profile Settings:[\s\S]*?State\s+ON/i.test(stdout);
    const isPublicOn = /Public Profile Settings:[\s\S]*?State\s+ON/i.test(stdout);

    return {
      success: true,
      profiles: {
        domain: isDomainOn,
        private: isPrivateOn,
        public: isPublicOn
      },
      isProtected: isPrivateOn && isPublicOn,
      summary: (isPrivateOn && isPublicOn) ? 'Active & Enforcing' : 'Partially Disabled'
    };
  } catch (err) {
    return {
      success: false,
      error: err.message,
      isProtected: false,
      summary: 'Unable to query firewall'
    };
  }
}

/**
 * Audit active TCP/UDP connections and listening sockets
 */
async function getActiveConnections() {
  try {
    const { stdout } = await execAsync('netstat -ano -p tcp');
    const lines = stdout.split('\r\n').filter(line => line.trim().length > 0);
    const connections = [];

    // Parse all valid TCP/UDP connection rows regardless of header size
    const validLines = lines.filter(line => /^\s*(TCP|UDP)\s+/i.test(line));

    for (let i = 0; i < Math.min(validLines.length, 50); i++) {
      const parts = validLines[i].trim().split(/\s+/);
      if (parts.length >= 4) {
        const proto = parts[0].toUpperCase();
        const localAddress = parts[1];
        const foreignAddress = parts[2];
        const state = parts.length >= 5 ? parts[3] : 'LISTENING';
        const pid = parts.length >= 5 ? parts[4] : parts[3];

        connections.push({
          proto,
          localAddress,
          foreignAddress,
          state,
          pid: parseInt(pid, 10) || 0
        });
      }
    }

    return {
      success: true,
      totalCount: connections.length,
      connections: connections.slice(0, 30) // Return top active sockets
    };
  } catch (err) {
    return {
      success: false,
      error: err.message,
      connections: []
    };
  }
}

module.exports = {
  getFirewallStatus,
  getActiveConnections
};

