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
import dealsRoutes from './modules/deals/deals.routes.js';
import pipelinesRoutes from './modules/pipelines/pipelines.routes.js';
import customObjectsRoutes from './modules/custom-objects/custom-objects.routes.js';
import workflowsRoutes from './modules/workflows/workflows.routes.js';
import tasksRoutes from './modules/tasks/tasks.routes.js';
import notificationsRoutes from './modules/notifications/notifications.routes.js';
import communicationsRoutes from './modules/communications/communications.routes.js';
import analyticsRoutes from './modules/analytics/analytics.routes.js';
import aiRoutes from './modules/ai/ai.routes.js';
import cpqRoutes from './modules/cpq/cpq.routes.js';
import supportRoutes from './modules/support/support.routes.js';
import marketingRoutes from './modules/marketing/marketing.routes.js';

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

// Core Standard & Custom CRM Objects (§2, §6, §7, §9, §10, §12, §13, §15, §23)
app.use('/api/v1/companies', companiesRoutes);
app.use('/api/v1/contacts', contactsRoutes);
app.use('/api/v1/deals', dealsRoutes);
app.use('/api/v1/pipelines', pipelinesRoutes);
app.use('/api/v1/custom-objects', customObjectsRoutes);
app.use('/api/v1/activities', activitiesRoutes);
app.use('/api/v1/workflows', workflowsRoutes);
app.use('/api/v1/tasks', tasksRoutes);
app.use('/api/v1/notifications', notificationsRoutes);
app.use('/api/v1/communications', communicationsRoutes);
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/v1/ai', aiRoutes);
app.use('/api/v1/cpq', cpqRoutes);
app.use('/api/v1/support', supportRoutes);
app.use('/api/v1/marketing', marketingRoutes);

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
    const [[{ dealCount }]] = await pool.query('SELECT COUNT(*) AS dealCount FROM deals');
    const [[{ pipelineCount }]] = await pool.query('SELECT COUNT(*) AS pipelineCount FROM pipelines');
    const [[{ customObjectsCount }]] = await pool.query('SELECT COUNT(*) AS customObjectsCount FROM custom_objects');
    const [[{ customRecordsCount }]] = await pool.query('SELECT COUNT(*) AS customRecordsCount FROM custom_records');
    const [[{ activityCount }]] = await pool.query('SELECT COUNT(*) AS activityCount FROM activities');
    const [[{ workflowCount }]] = await pool.query('SELECT COUNT(*) AS workflowCount FROM workflows');
    const [[{ workflowExecutionsCount }]] = await pool.query('SELECT COUNT(*) AS workflowExecutionsCount FROM workflow_executions');
    const [[{ taskCount }]] = await pool.query('SELECT COUNT(*) AS taskCount FROM tasks');
    const [[{ notificationCount }]] = await pool.query('SELECT COUNT(*) AS notificationCount FROM notifications');
    const [[{ emailCount }]] = await pool.query('SELECT COUNT(*) AS emailCount FROM email_messages');
    const [[{ callCount }]] = await pool.query('SELECT COUNT(*) AS callCount FROM calls_log');
    const [[{ reportCount }]] = await pool.query('SELECT COUNT(*) AS reportCount FROM reports');
    const [[{ dashboardCount }]] = await pool.query('SELECT COUNT(*) AS dashboardCount FROM dashboards');
    const [[{ agentCount }]] = await pool.query('SELECT COUNT(*) AS agentCount FROM agents');
    const [[{ agentRunsCount }]] = await pool.query('SELECT COUNT(*) AS agentRunsCount FROM agent_runs');
    const [[{ productCount }]] = await pool.query('SELECT COUNT(*) AS productCount FROM products');
    const [[{ priceBookCount }]] = await pool.query('SELECT COUNT(*) AS priceBookCount FROM price_books');
    const [[{ quoteCount }]] = await pool.query('SELECT COUNT(*) AS quoteCount FROM quotes');
    const [[{ ticketCount }]] = await pool.query('SELECT COUNT(*) AS ticketCount FROM tickets');
    const [[{ slaCount }]] = await pool.query('SELECT COUNT(*) AS slaCount FROM sla_policies');
    const [[{ messageCount }]] = await pool.query('SELECT COUNT(*) AS messageCount FROM ticket_messages');
    const [[{ kbCount }]] = await pool.query('SELECT COUNT(*) AS kbCount FROM kb_articles');
    const [[{ sequenceCount }]] = await pool.query('SELECT COUNT(*) AS sequenceCount FROM sequences');
    const [[{ sequenceStepsCount }]] = await pool.query('SELECT COUNT(*) AS sequenceStepsCount FROM sequence_steps');
    const [[{ sequenceEnrollmentsCount }]] = await pool.query('SELECT COUNT(*) AS sequenceEnrollmentsCount FROM sequence_enrollments');
    const [[{ campaignCount }]] = await pool.query('SELECT COUNT(*) AS campaignCount FROM email_campaigns');
    const [[{ campaignRecipientsCount }]] = await pool.query('SELECT COUNT(*) AS campaignRecipientsCount FROM campaign_recipients');

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
        deals: dealCount,
        pipelines: pipelineCount,
        customObjects: customObjectsCount,
        customRecords: customRecordsCount,
        activities: activityCount,
        workflows: workflowCount,
        workflowExecutions: workflowExecutionsCount,
        tasks: taskCount,
        notifications: notificationCount,
        emails: emailCount,
        calls: callCount,
        reports: reportCount,
        dashboards: dashboardCount,
        agents: agentCount,
        agentRuns: agentRunsCount,
        products: productCount,
        priceBooks: priceBookCount,
        quotes: quoteCount,
        tickets: ticketCount,
        slaPolicies: slaCount,
        ticketMessages: messageCount,
        kbArticles: kbCount,
        sequences: sequenceCount,
        sequenceSteps: sequenceStepsCount,
        sequenceEnrollments: sequenceEnrollmentsCount,
        campaigns: campaignCount,
        campaignRecipients: campaignRecipientsCount,
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
