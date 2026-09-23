import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';
import { config } from '../config/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const runMigrations = async () => {
  console.log('[Migration] Starting MySQL database migration...');
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');

  // Create dedicated connection with multipleStatements enabled for DDL
  const connection = await mysql.createConnection({
    host: config.db.host,
    port: config.db.port,
    user: config.db.user,
    password: config.db.password,
    multipleStatements: true,
  });

  try {
    // 1. Ensure database exists
    console.log(`[Migration] Verifying database "${config.db.database}"...`);
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${config.db.database}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    await connection.query(`USE \`${config.db.database}\`;`);

    // 2. Execute schema DDL
    console.log('[Migration] Executing schema.sql...');
    await connection.query(schemaSql);

    // 3. Inspect created tables
    const [tables] = await connection.query('SHOW TABLES;');
    const tableNames = tables.map((row) => Object.values(row)[0]);

    console.log(`[Migration] Successfully applied migrations! Tables in "${config.db.database}":`);
    tableNames.forEach((t, i) => console.log(`  ${i + 1}. ${t}`));

    return { success: true, tables: tableNames };
  } catch (error) {
    console.error('[Migration Error] Migration failed:', error);
    throw error;
  } finally {
    await connection.end();
  }
};

// Execute if run directly from CLI
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runMigrations()
    .then(() => {
      console.log('[Migration] Complete.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('[Migration] Failed:', err);
      process.exit(1);
    });
}
