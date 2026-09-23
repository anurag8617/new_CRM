import mysql from 'mysql2/promise';
import { config } from './env.js';

let pool = null;

export const getPool = () => {
  if (!pool) {
    pool = mysql.createPool({
      host: config.db.host,
      port: config.db.port,
      user: config.db.user,
      password: config.db.password,
      database: config.db.database,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0,
    });
  }
  return pool;
};

export const checkDbConnection = async () => {
  try {
    // First, test connection to the MySQL server (even if database doesn't exist yet)
    const connection = await mysql.createConnection({
      host: config.db.host,
      port: config.db.port,
      user: config.db.user,
      password: config.db.password,
    });

    // Ensure database exists
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${config.db.database}\`;`);
    await connection.end();

    // Now test connection to the specific database with the pool
    const activePool = getPool();
    const [rows] = await activePool.query('SELECT 1 + 1 AS result');
    console.log(`[DB] MySQL connected successfully to database "${config.db.database}" on port ${config.db.port}.`);
    return { connected: true, database: config.db.database };
  } catch (error) {
    console.error(`[DB Error] Unable to connect to MySQL:`, error.message);
    return { connected: false, error: error.message };
  }
};

export default {
  getPool,
  checkDbConnection,
};
