import bcrypt from 'bcryptjs';
import mysql from 'mysql2/promise';
import { config } from '../config/env.js';

export const seedDatabase = async () => {
  console.log('[Seed] Starting database seeding...');

  const connection = await mysql.createConnection({
    host: config.db.host,
    port: config.db.port,
    user: config.db.user,
    password: config.db.password,
    database: config.db.database,
  });

  try {
    // -------------------------------------------------------------------
    // 1. Seed System Permissions Catalog
    // -------------------------------------------------------------------
    console.log('[Seed] Seeding permissions catalog...');
    const permissions = [
      // Organizations & Workspaces
      { module: 'organizations', action: 'view', description: 'View organization details' },
      { module: 'organizations', action: 'manage', description: 'Manage organization settings and billing' },
      { module: 'workspaces', action: 'view', description: 'View workspaces' },
      { module: 'workspaces', action: 'manage', description: 'Create and edit workspaces' },

      // Users, Teams & Roles
      { module: 'users', action: 'view', description: 'View user directory' },
      { module: 'users', action: 'create', description: 'Invite new users' },
      { module: 'users', action: 'edit', description: 'Edit user accounts and profiles' },
      { module: 'users', action: 'delete', description: 'Deactivate or delete users' },
      { module: 'roles', action: 'view', description: 'View roles and permissions' },
      { module: 'roles', action: 'manage', description: 'Create and modify roles' },
      { module: 'teams', action: 'view', description: 'View team structure' },
      { module: 'teams', action: 'manage', description: 'Manage teams and assignments' },

      // Standard CRM Objects
      { module: 'contacts', action: 'view', description: 'View contact records' },
      { module: 'contacts', action: 'create', description: 'Create new contacts' },
      { module: 'contacts', action: 'edit', description: 'Edit existing contacts' },
      { module: 'contacts', action: 'delete', description: 'Delete contact records' },
      { module: 'contacts', action: 'export', description: 'Export contacts to CSV/Excel' },
      { module: 'contacts', action: 'import', description: 'Import contacts in bulk' },

      { module: 'companies', action: 'view', description: 'View company accounts' },
      { module: 'companies', action: 'create', description: 'Create new company accounts' },
      { module: 'companies', action: 'edit', description: 'Edit company accounts' },
      { module: 'companies', action: 'delete', description: 'Delete company accounts' },

      { module: 'deals', action: 'view', description: 'View pipeline and deals' },
      { module: 'deals', action: 'create', description: 'Create new deals' },
      { module: 'deals', action: 'edit', description: 'Update deals and stages' },
      { module: 'deals', action: 'delete', description: 'Delete deals' },

      // Custom Objects & Tables (Core Differentiator - Spec §2)
      { module: 'custom_objects', action: 'view', description: 'View custom object records' },
      { module: 'custom_objects', action: 'create', description: 'Create custom object records' },
      { module: 'custom_objects', action: 'edit', description: 'Edit custom object records' },
      { module: 'custom_objects', action: 'delete', description: 'Delete custom object records' },
      { module: 'custom_objects', action: 'schema_manage', description: 'Design custom tables and fields' },

      // Automation & Workflows (Spec §15)
      { module: 'workflows', action: 'view', description: 'View workflow automations' },
      { module: 'workflows', action: 'manage', description: 'Create, edit, publish workflows' },

      // AI System (Spec §16-§22)
      { module: 'ai', action: 'copilot', description: 'Interact with AI Copilot' },
      { module: 'ai', action: 'agents_run', description: 'Trigger autonomous AI agents' },

      // Reports & Audit Logs
      { module: 'reports', action: 'view', description: 'View analytical reports and dashboards' },
      { module: 'reports', action: 'create', description: 'Create custom query reports' },
      { module: 'audit_logs', action: 'view', description: 'View security audit trails' },
    ];

    for (const p of permissions) {
      await connection.query(
        `INSERT INTO permissions (module, action, description)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE description = VALUES(description);`,
        [p.module, p.action, p.description]
      );
    }

    // -------------------------------------------------------------------
    // 2. Seed Default Organization (Multi-Tenancy Root)
    // -------------------------------------------------------------------
    console.log('[Seed] Seeding default organization...');
    const [orgResult] = await connection.query(
      `INSERT INTO organizations (name, slug, currency, timezone, status)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE name = VALUES(name);`,
      ['Acme Corp Global', 'acme-corp', 'USD', 'America/New_York', 'active']
    );

    const [orgs] = await connection.query('SELECT id FROM organizations WHERE slug = ? LIMIT 1;', ['acme-corp']);
    const orgId = orgs[0].id;

    // -------------------------------------------------------------------
    // 3. Seed Default Workspace
    // -------------------------------------------------------------------
    console.log('[Seed] Seeding default workspace...');
    await connection.query(
      `INSERT INTO workspaces (organization_id, name, slug, is_default)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE name = VALUES(name);`,
      [orgId, 'Global Sales & Support', 'global-sales', true]
    );

    const [workspaces] = await connection.query(
      'SELECT id FROM workspaces WHERE organization_id = ? AND slug = ? LIMIT 1;',
      [orgId, 'global-sales']
    );
    const workspaceId = workspaces[0].id;

    // -------------------------------------------------------------------
    // 4. Seed Organization Settings
    // -------------------------------------------------------------------
    const defaultSettings = JSON.stringify({
      general: {
        dateFormat: 'YYYY-MM-DD',
        numberFormat: 'en-US',
      },
      aiVoice: {
        tone: 'professional',
        brandName: 'Acme Corp',
        guidelines: 'Clear, concise, customer-centric response style.',
      },
      security: {
        mfaRequired: false,
        sessionTimeoutMinutes: 1440,
      },
    });

    await connection.query(
      `INSERT INTO organization_settings (organization_id, settings_json)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE settings_json = VALUES(settings_json);`,
      [orgId, defaultSettings]
    );

    // -------------------------------------------------------------------
    // 5. Seed System Roles (Section 1.1)
    // -------------------------------------------------------------------
    console.log('[Seed] Seeding system roles...');
    const roles = [
      { name: 'Super Admin', description: 'Complete system and tenant control', isSystem: true },
      { name: 'Admin', description: 'Organization administrator', isSystem: true },
      { name: 'Sales Manager', description: 'Pipeline manager with team oversight', isSystem: true },
      { name: 'Sales Rep', description: 'Individual contributor for sales records', isSystem: true },
      { name: 'Support Agent', description: 'Customer support specialist', isSystem: true },
      { name: 'Read Only', description: 'Viewer access without mutation rights', isSystem: true },
    ];

    for (const r of roles) {
      await connection.query(
        `INSERT INTO roles (organization_id, name, description, is_system_role)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE description = VALUES(description);`,
        [orgId, r.name, r.description, r.isSystem]
      );
    }

    const [superAdminRole] = await connection.query(
      'SELECT id FROM roles WHERE organization_id = ? AND name = ? LIMIT 1;',
      [orgId, 'Super Admin']
    );
    const superAdminRoleId = superAdminRole[0].id;

    // -------------------------------------------------------------------
    // 6. Map All Permissions to Super Admin Role (Scope: 'all')
    // -------------------------------------------------------------------
    const [allPerms] = await connection.query('SELECT id FROM permissions;');
    for (const perm of allPerms) {
      await connection.query(
        `INSERT INTO role_permissions (role_id, permission_id, scope)
         VALUES (?, ?, 'all')
         ON DUPLICATE KEY UPDATE scope = 'all';`,
        [superAdminRoleId, perm.id]
      );
    }

    // -------------------------------------------------------------------
    // 7. Seed Default Super Admin User
    // -------------------------------------------------------------------
    console.log('[Seed] Seeding default administrator account...');
    const adminEmail = 'admin@crm.local';
    const defaultPassword = 'Admin@123456';
    const passwordHash = await bcrypt.hash(defaultPassword, 10);

    await connection.query(
      `INSERT INTO users (organization_id, workspace_id, email, password_hash, first_name, last_name, job_title, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'active')
       ON DUPLICATE KEY UPDATE first_name = VALUES(first_name), password_hash = VALUES(password_hash);`,
      [orgId, workspaceId, adminEmail, passwordHash, 'Alex', 'Vance', 'System Administrator']
    );

    const [userRows] = await connection.query(
      'SELECT id FROM users WHERE organization_id = ? AND email = ? LIMIT 1;',
      [orgId, adminEmail]
    );
    const adminUserId = userRows[0].id;

    // Map User to Super Admin Role
    await connection.query(
      `INSERT INTO user_roles (user_id, role_id)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE role_id = VALUES(role_id);`,
      [adminUserId, superAdminRoleId]
    );

    // -------------------------------------------------------------------
    // 8. Seed Sample Companies (§7)
    // -------------------------------------------------------------------
    console.log('[Seed] Seeding sample companies...');
    await connection.query(
      `INSERT INTO companies (organization_id, owner_id, name, domain, industry, phone, annual_revenue, employee_count, city, state, country, description)
       VALUES 
       (?, ?, 'Apex Technologies Inc.', 'apextech.io', 'Enterprise Software', '+1 (415) 555-0100', 25000000.00, 320, 'San Francisco', 'CA', 'United States', 'Leading AI developer tooling and cloud platforms.')
       ON DUPLICATE KEY UPDATE name = VALUES(name);`,
      [orgId, adminUserId]
    );

    const [apexCompany] = await connection.query(
      'SELECT id FROM companies WHERE organization_id = ? AND domain = ? LIMIT 1;',
      [orgId, 'apextech.io']
    );
    const apexId = apexCompany[0].id;

    await connection.query(
      `INSERT INTO companies (organization_id, owner_id, parent_company_id, name, domain, industry, phone, annual_revenue, employee_count, city, state, country, description)
       VALUES 
       (?, ?, ?, 'Apex Cloud Services', 'cloud.apextech.io', 'Cloud Infrastructure', '+1 (415) 555-0105', 8500000.00, 95, 'Austin', 'TX', 'United States', 'Subsidiary cloud infrastructure division of Apex Tech.')
       ON DUPLICATE KEY UPDATE name = VALUES(name);`,
      [orgId, adminUserId, apexId]
    );

    await connection.query(
      `INSERT INTO companies (organization_id, owner_id, name, domain, industry, phone, annual_revenue, employee_count, city, state, country, description)
       VALUES 
       (?, ?, 'Nexus Global Logistics', 'nexuslogistics.com', 'Supply Chain & Freight', '+1 (312) 555-0140', 48000000.00, 1100, 'Chicago', 'IL', 'United States', 'International multi-modal freight forwarding and distribution.')
       ON DUPLICATE KEY UPDATE name = VALUES(name);`,
      [orgId, adminUserId]
    );

    const [nexusCompany] = await connection.query(
      'SELECT id FROM companies WHERE organization_id = ? AND domain = ? LIMIT 1;',
      [orgId, 'nexuslogistics.com']
    );
    const nexusId = nexusCompany[0].id;

    // -------------------------------------------------------------------
    // 9. Seed Sample Contacts (§6)
    // -------------------------------------------------------------------
    console.log('[Seed] Seeding sample contacts...');
    const contactsData = [
      {
        companyId: apexId,
        firstName: 'Sarah',
        lastName: 'Connor',
        email: 'sarah.connor@apextech.io',
        phone: '+1 (415) 555-0199',
        jobTitle: 'Chief Technology Officer',
        stage: 'customer',
        status: 'connected',
        source: 'Organic Search',
      },
      {
        companyId: apexId,
        firstName: 'Elena',
        lastName: 'Rostova',
        email: 'elena.rostova@apextech.io',
        phone: '+1 (415) 555-0188',
        jobTitle: 'VP of Engineering',
        stage: 'opportunity',
        status: 'open_deal',
        source: 'Referral',
      },
      {
        companyId: nexusId,
        firstName: 'David',
        lastName: 'Miller',
        email: 'david.miller@nexuslogistics.com',
        phone: '+1 (312) 555-0142',
        jobTitle: 'VP of Global Operations',
        stage: 'sales_qualified_lead',
        status: 'in_progress',
        source: 'Outbound Campaign',
      },
      {
        companyId: null,
        firstName: 'Marcus',
        lastName: 'Brody',
        email: 'marcus.brody@consulting.org',
        phone: '+1 (646) 555-0122',
        jobTitle: 'Managing Partner',
        stage: 'lead',
        status: 'new',
        source: 'Inbound Webhook',
      },
    ];

    for (const c of contactsData) {
      await connection.query(
        `INSERT INTO contacts (organization_id, company_id, owner_id, first_name, last_name, email, phone, job_title, lifecycle_stage, lead_status, source)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE first_name = VALUES(first_name), job_title = VALUES(job_title);`,
        [orgId, c.companyId, adminUserId, c.firstName, c.lastName, c.email, c.phone, c.jobTitle, c.stage, c.status, c.source]
      );
    }

    // -------------------------------------------------------------------
    // 10. Seed Initial Activities for Sarah Connor (§10 Timeline)
    // -------------------------------------------------------------------
    console.log('[Seed] Seeding sample timeline activities...');
    const [sarahContact] = await connection.query(
      'SELECT id FROM contacts WHERE organization_id = ? AND email = ? LIMIT 1;',
      [orgId, 'sarah.connor@apextech.io']
    );

    if (sarahContact.length > 0) {
      const sarahId = sarahContact[0].id;
      await connection.query(
        `INSERT INTO activities (organization_id, record_type, record_id, activity_type, payload_json, actor_id)
         VALUES 
         (?, 'contact', ?, 'creation', JSON_OBJECT('message', 'Contact imported from website inquiry form.'), ?),
         (?, 'contact', ?, 'call', JSON_OBJECT('subject', 'Quarterly Solution Review', 'duration', '24 mins', 'outcome', 'Customer interested in adding 50 more seats next month.'), ?),
         (?, 'contact', ?, 'note', JSON_OBJECT('content', 'Sarah requested a demo of the custom tables builder for their operations team.'), ?)`,
        [orgId, sarahId, adminUserId, orgId, sarahId, adminUserId, orgId, sarahId, adminUserId]
      );
    }

    console.log('\n======================================================');
    console.log('✅ DATABASE SEEDING COMPLETED SUCCESSFULLY!');
    console.log('------------------------------------------------------');
    console.log(`Tenant Org: Acme Corp Global (ID: ${orgId})`);
    console.log(`Workspace:  Global Sales & Support (ID: ${workspaceId})`);
    console.log(`Admin User: ${adminEmail}`);
    console.log(`Password:   ${defaultPassword}`);
    console.log(`Companies:  3 Sample Enterprises Created`);
    console.log(`Contacts:   4 Real-world Sample Contacts Created`);
    console.log(`Timeline:   Initial Activities & Notes Attached`);
    console.log('======================================================\n');

    return {
      orgId,
      workspaceId,
      adminEmail,
      adminUserId,
    };
  } catch (error) {
    console.error('[Seed Error] Failed to seed database:', error);
    throw error;
  } finally {
    await connection.end();
  }
};

// Execute if run directly from CLI
if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
