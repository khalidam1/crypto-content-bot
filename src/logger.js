// ============================================================
// logger.js — نظام تسجيل الأحداث والأخطاء
// ============================================================

const LEVELS = { INFO: '📋', SUCCESS: '✅', WARN: '⚠️', ERROR: '❌' };

function log(level, message, data = null) {
  const emoji = LEVELS[level] || '📋';
  const time  = new Date().toISOString();
  const line  = `[${time}] ${emoji} ${message}`;

  if (level === 'ERROR') {
    console.error(line, data ? JSON.stringify(data) : '');
  } else {
    console.log(line, data ? JSON.stringify(data) : '');
  }
}

export const logger = {
  info:    (msg, data) => log('INFO',    msg, data),
  success: (msg, data) => log('SUCCESS', msg, data),
  warn:    (msg, data) => log('WARN',    msg, data),
  error:   (msg, data) => log('ERROR',   msg, data),
};
