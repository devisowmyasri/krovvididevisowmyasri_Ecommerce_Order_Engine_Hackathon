const fs = require('fs');
const path = require('path');

class AuditLogger {
  constructor() {
    this.logPath = path.join(__dirname, '../../logs/audit.log');
    if (!fs.existsSync(path.dirname(this.logPath))) {
      fs.mkdirSync(path.dirname(this.logPath), { recursive: true });
    }
  }

  log(action, userId, metadata = {}) {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${userId || 'SYSTEM'}: ${action} ${JSON.stringify(metadata)}\n`;
    
    // Immutable style: append only
    fs.appendFileSync(this.logPath, logEntry);
    console.log(`[Audit] ${action}`);
  }

  getLogs() {
    if (!fs.existsSync(this.logPath)) return [];
    return fs.readFileSync(this.logPath, 'utf8').split('\n').filter(Boolean);
  }
}

module.exports = new AuditLogger();
