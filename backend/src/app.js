import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config/env.js';
import { checkDbConnection } from './config/db.js';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler.js';
import authRoutes from './modules/auth/auth.routes.js';
import companiesRoutes from './modules/companies/companies.routes.js';
import contactsRoutes from './modules/contacts/contacts.routes.js';
import activitiesRoutes from './modules/activities/activities.routes.js';

const app = express();

// Security and basic middlewares
app.use(helmet());
app.use(
  cors({
    origin: config.clientUrl,
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (config.nodeEnv === 'development') {
  app.use(morgan('dev'));
}

// Health check endpoint
app.get('/api/health', async (req, res) => {
  const dbStatus = await checkDbConnection();
  res.json({
    status: 'ok',
    service: 'CRM Backend API',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    database: dbStatus,
  });
});

// Base API route
app.get('/api/v1', (req, res) => {
  res.json({
    message: 'Welcome to Advanced AI-Native CRM API v1',
    documentation: '/api/v1/docs',
    version: '1.0.0',
  });
});

// Authentication & Identity Routes
app.use('/api/v1/auth', authRoutes);

// Core Standard CRM Objects (§6, §7, §10)
app.use('/api/v1/companies', companiesRoutes);
app.use('/api/v1/contacts', contactsRoutes);
app.use('/api/v1/activities', activitiesRoutes);

// System database status & schema metrics
app.get('/api/v1/system/db-status', async (req, res, next) => {
  try {
    const { getPool } = await import('./config/db.js');
    const pool = getPool();

    // Query all tables
    const [tables] = await pool.query('SHOW TABLES;');
    const tableNames = tables.map((row) => Object.values(row)[0]);

    // Query entity counts
    const [[{ orgCount }]] = await pool.query('SELECT COUNT(*) AS orgCount FROM organizations');
    const [[{ workspaceCount }]] = await pool.query('SELECT COUNT(*) AS workspaceCount FROM workspaces');
    const [[{ userCount }]] = await pool.query('SELECT COUNT(*) AS userCount FROM users');
    const [[{ roleCount }]] = await pool.query('SELECT COUNT(*) AS roleCount FROM roles');
    const [[{ permissionCount }]] = await pool.query('SELECT COUNT(*) AS permissionCount FROM permissions');
    const [[{ companyCount }]] = await pool.query('SELECT COUNT(*) AS companyCount FROM companies');
    const [[{ contactCount }]] = await pool.query('SELECT COUNT(*) AS contactCount FROM contacts');
    const [[{ activityCount }]] = await pool.query('SELECT COUNT(*) AS activityCount FROM activities');

    // Fetch tenant sample
    const [orgs] = await pool.query('SELECT id, name, slug, currency, timezone, status FROM organizations LIMIT 1');
    const [adminUsers] = await pool.query('SELECT id, email, first_name, last_name, job_title, status FROM users LIMIT 1');
    const [roleList] = await pool.query('SELECT id, name, description, is_system_role FROM roles ORDER BY id ASC');

    res.json({
      success: true,
      database: config.db.database,
      totalTables: tableNames.length,
      tables: tableNames,
      counts: {
        organizations: orgCount,
        workspaces: workspaceCount,
        users: userCount,
        roles: roleCount,
        permissions: permissionCount,
        companies: companyCount,
        contacts: contactCount,
        activities: activityCount,
      },
      tenant: orgs[0] || null,
      adminUser: adminUsers[0] || null,
      roles: roleList,
    });
  } catch (err) {
    next(err);
  }
});

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
