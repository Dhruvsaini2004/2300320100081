const fs = require('fs');
const path = require('path');

const LOG_DIR = path.join(__dirname, '..', '..', 'logs');
const LOG_FILE = path.join(LOG_DIR, 'app.log');

if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3
};

const CURRENT_LEVEL = LOG_LEVELS.INFO;

function formatTimestamp() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
}

function appendToFile(level, message, meta) {
  const timestamp = formatTimestamp();
  const metaStr = meta ? ` | ${JSON.stringify(meta)}` : '';
  const logLine = `[${timestamp}] [${level}] ${message}${metaStr}\n`;
  fs.appendFileSync(LOG_FILE, logLine);
}

const logger = {
  debug(message, meta) {
    if (CURRENT_LEVEL <= LOG_LEVELS.DEBUG) {
      appendToFile('DEBUG', message, meta);
    }
  },
  info(message, meta) {
    if (CURRENT_LEVEL <= LOG_LEVELS.INFO) {
      appendToFile('INFO', message, meta);
    }
  },
  warn(message, meta) {
    if (CURRENT_LEVEL <= LOG_LEVELS.WARN) {
      appendToFile('WARN', message, meta);
    }
  },
  error(message, meta) {
    if (CURRENT_LEVEL <= LOG_LEVELS.ERROR) {
      appendToFile('ERROR', message, meta);
    }
  }
};

function requestLogger(req, res, next) {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(`${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`, {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
  });
  next();
}

module.exports = { logger, requestLogger };
