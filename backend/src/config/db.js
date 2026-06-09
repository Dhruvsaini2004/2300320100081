const { Pool } = require('pg');
const { logger } = require('../middleware/logger');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 5432,
  database: process.env.DB_NAME || 'notification_platform',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres'
});

pool.on('connect', () => {
  logger.info('Database connected');
});

pool.on('error', (err) => {
  logger.error('Unexpected database error', { error: err.message });
});

async function query(text, params) {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    logger.info(`DB Query executed`, { duration: `${duration}ms`, rows: result.rowCount });
    return result;
  } catch (err) {
    logger.error('DB Query failed', { error: err.message, query: text });
    throw err;
  }
}

module.exports = { pool, query };
