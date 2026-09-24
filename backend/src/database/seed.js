import bcrypt from 'bcryptjs';
import mysql from 'mysql2/promise';
import crypto from 'crypto';
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

      // Products, Pricebooks & CPQ (Spec §24, §25)
      { module: 'products', action: 'view', description: 'View product catalog and pricebooks' },
      { module: 'products', action: 'manage', description: 'Create and configure products and pricebooks' },
      { module: 'quotes', action: 'view', description: 'View quotes and line items' },
      { module: 'quotes', action: 'create', description: 'Draft and configure quotes' },
      { module: 'quotes', action: 'approve', description: 'Approve or reject sales quotes' },
      { module: 'quotes', action: 'sign', description: 'Process e-signatures on quotes' },

      // Support & Ticketing (Spec §23, §26)
      { module: 'tickets', action: 'view', description: 'View support tickets and SLAs' },
      { module: 'tickets', action: 'create', description: 'Create and open support tickets' },
      { module: 'tickets', action: 'edit', description: 'Update support tickets and status' },
      { module: 'tickets', action: 'delete', description: 'Delete support tickets' },
      { module: 'tickets', action: 'manage_sla', description: 'Configure SLA policies and escalation rules' },

      // Sequences & Campaigns (§14, §23)
      { module: 'sequences', action: 'view', description: 'View sales sequences and cadence progression' },
      { module: 'sequences', action: 'manage', description: 'Create and configure multi-step cadences and enrollments' },
      { module: 'campaigns', action: 'view', description: 'View broadcast email campaigns and delivery analytics' },
      { module: 'campaigns', action: 'manage', description: 'Create, schedule and dispatch email broadcast campaigns' },

      // Developer API Keys, Webhooks & Integrations (§31, §36, §37)
      { module: 'integrations', action: 'view', description: 'View developer API keys, webhooks and integrations' },
      { module: 'integrations', action: 'manage', description: 'Manage API keys, webhooks, and third-party sync connectors' },

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

    // -------------------------------------------------------------------
    // 11. Seed Sales Pipeline & Stages (Spec §9)
    // -------------------------------------------------------------------
    console.log('[Seed] Seeding sales pipeline and stages...');
    const [existingPipelines] = await connection.query(
      'SELECT id FROM pipelines WHERE organization_id = ? AND is_default = TRUE LIMIT 1;',
      [orgId]
    );

    let pipelineId;
    if (existingPipelines.length === 0) {
      const [pipeResult] = await connection.query(
        'INSERT INTO pipelines (organization_id, name, is_default) VALUES (?, ?, TRUE);',
        [orgId, 'Direct Sales Pipeline']
      );
      pipelineId = pipeResult.insertId;

      const stages = [
        { name: 'Discovery / Qualification', order: 1, probability: 10, color: '#94a3b8' },
        { name: 'Demo / Technical Fit', order: 2, probability: 30, color: '#60a5fa' },
        { name: 'Proposal / Pricing', order: 3, probability: 60, color: '#818cf8' },
        { name: 'Contract Negotiation', order: 4, probability: 80, color: '#f59e0b' },
        { name: 'Closed Won', order: 5, probability: 100, color: '#10b981' },
        { name: 'Closed Lost', order: 6, probability: 0, color: '#ef4444' },
      ];

      for (const st of stages) {
        await connection.query(
          'INSERT INTO pipeline_stages (pipeline_id, name, stage_order, probability, color) VALUES (?, ?, ?, ?, ?);',
          [pipelineId, st.name, st.order, st.probability, st.color]
        );
      }
    } else {
      pipelineId = existingPipelines[0].id;
    }

    // -------------------------------------------------------------------
    // 12. Seed Deals (§9)
    // -------------------------------------------------------------------
    console.log('[Seed] Seeding sample enterprise deals...');
    const [stagesList] = await connection.query(
      'SELECT id, name, stage_order FROM pipeline_stages WHERE pipeline_id = ? ORDER BY stage_order ASC;',
      [pipelineId]
    );

    const stageMap = {};
    stagesList.forEach((s) => {
      stageMap[s.stage_order] = s.id;
    });

    const [compRows] = await connection.query('SELECT id, name FROM companies WHERE organization_id = ?;', [orgId]);
    const compMap = {};
    compRows.forEach((c) => {
      compMap[c.name] = c.id;
    });

    const [contRows] = await connection.query('SELECT id, email FROM contacts WHERE organization_id = ?;', [orgId]);
    const contMap = {};
    contRows.forEach((c) => {
      contMap[c.email] = c.id;
    });

    const sampleDeals = [
      {
        title: 'Apex Global Platform Expansion (250 Seats)',
        companyId: compMap['Apex Technologies Inc.'] || null,
        contactId: contMap['sarah.connor@apextech.io'] || null,
        stageId: stageMap[4] || stagesList[0].id, // Negotiation
        value: 125000.00,
        expectedCloseDate: '2026-10-31',
        status: 'open',
      },
      {
        title: 'Nexus Logistics AI Dispatch Integration',
        companyId: compMap['Nexus Global Logistics'] || null,
        contactId: contMap['david.miller@nexuslogistics.com'] || null,
        stageId: stageMap[3] || stagesList[0].id, // Proposal
        value: 84000.00,
        expectedCloseDate: '2026-11-15',
        status: 'open',
      },
      {
        title: 'Apex Cloud Security & Audit Suite',
        companyId: compMap['Apex Cloud Services'] || null,
        contactId: contMap['elena.rostova@apextech.io'] || null,
        stageId: stageMap[2] || stagesList[0].id, // Demo / Fit
        value: 48000.00,
        expectedCloseDate: '2026-12-05',
        status: 'open',
      },
      {
        title: 'Brody Capital Operations CRM Pilot',
        companyId: null,
        contactId: contMap['marcus.brody@brodycapital.com'] || null,
        stageId: stageMap[1] || stagesList[0].id, // Discovery
        value: 22500.00,
        expectedCloseDate: '2026-12-20',
        status: 'open',
      },
    ];

    const [existingDeals] = await connection.query('SELECT COUNT(*) as count FROM deals WHERE organization_id = ?;', [orgId]);
    if (existingDeals[0].count === 0) {
      for (const d of sampleDeals) {
        const [dealRes] = await connection.query(
          `INSERT INTO deals (organization_id, pipeline_id, stage_id, company_id, contact_id, owner_id, title, value, currency, expected_close_date, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'USD', ?, ?);`,
          [orgId, pipelineId, d.stageId, d.companyId, d.contactId, adminUserId, d.title, d.value, d.expectedCloseDate, d.status]
        );

        // Activity log on deal creation
        await connection.query(
          `INSERT INTO activities (organization_id, record_type, record_id, activity_type, payload_json, actor_id)
           VALUES (?, 'deal', ?, 'creation', JSON_OBJECT('message', CONCAT('Opportunity created: ', ?)), ?);`,
          [orgId, dealRes.insertId, d.title, adminUserId]
        );
      }
    }

    // -------------------------------------------------------------------
    // 13. Seed Custom Objects Engine (Spec §2 Core Differentiator)
    // -------------------------------------------------------------------
    console.log('[Seed] Seeding Custom Objects and Dynamic Tables (§2)...');
    const [existingCustomObj] = await connection.query(
      'SELECT id FROM custom_objects WHERE organization_id = ? AND slug = ? LIMIT 1;',
      [orgId, 'commercial-properties']
    );

    let propertyObjId;
    if (existingCustomObj.length === 0) {
      const [customObjRes] = await connection.query(
        `INSERT INTO custom_objects (organization_id, name, singular_name, slug, description, icon, color)
         VALUES (?, 'Commercial Properties', 'Property', 'commercial-properties', 'Corporate real estate facilities, offices, and distribution centers portfolio.', 'Building', '#0ea5e9');`,
        [orgId]
      );
      propertyObjId = customObjRes.insertId;

      // Seed Custom Fields for Properties
      const fields = [
        { key: 'property_type', label: 'Property Type', type: 'select', options: JSON.stringify(['Office Space', 'Distribution Warehouse', 'Data Center', 'R&D Lab']), required: true, order: 1 },
        { key: 'square_footage', label: 'Square Footage (sq ft)', type: 'number', options: null, required: true, order: 2 },
        { key: 'monthly_lease_usd', label: 'Monthly Lease (USD)', type: 'currency', options: null, required: true, order: 3 },
        { key: 'occupancy_status', label: 'Occupancy Status', type: 'select', options: JSON.stringify(['Fully Leased', 'Partially Vacant', 'Under Renovation', 'Available']), required: false, order: 4 },
        { key: 'lease_expiration', label: 'Lease Expiration Date', type: 'date', options: null, required: false, order: 5 },
      ];

      for (const f of fields) {
        await connection.query(
          `INSERT INTO custom_fields (organization_id, custom_object_id, field_key, label, field_type, options_json, is_required, is_filterable, sort_order)
           VALUES (?, ?, ?, ?, ?, ?, ?, TRUE, ?);`,
          [orgId, propertyObjId, f.key, f.label, f.type, f.options, f.required, f.order]
        );
      }

      // Seed Custom Records
      const records = [
        {
          name: 'Apex Horizon Tower - Suite 800',
          data: {
            property_type: 'Office Space',
            square_footage: 16500,
            monthly_lease_usd: 48000,
            occupancy_status: 'Fully Leased',
            lease_expiration: '2028-06-30',
          },
        },
        {
          name: 'Nexus Central Logistic Terminal',
          data: {
            property_type: 'Distribution Warehouse',
            square_footage: 92000,
            monthly_lease_usd: 115000,
            occupancy_status: 'Fully Leased',
            lease_expiration: '2029-12-31',
          },
        },
        {
          name: 'Apex Silicon Hyperscale Facility',
          data: {
            property_type: 'Data Center',
            square_footage: 35000,
            monthly_lease_usd: 98000,
            occupancy_status: 'Under Renovation',
            lease_expiration: '2027-09-15',
          },
        },
      ];

      const insertedRecordIds = [];
      for (const rec of records) {
        const [recRes] = await connection.query(
          `INSERT INTO custom_records (organization_id, custom_object_id, record_name, data_json, created_by)
           VALUES (?, ?, ?, ?, ?);`,
          [orgId, propertyObjId, rec.name, JSON.stringify(rec.data), adminUserId]
        );
        insertedRecordIds.push(recRes.insertId);

        // Append initial timeline activity
        await connection.query(
          `INSERT INTO activities (organization_id, record_type, record_id, activity_type, payload_json, actor_id)
           VALUES (?, 'custom_record', ?, 'creation', JSON_OBJECT('message', CONCAT('Custom record created: ', ?)), ?);`,
          [orgId, recRes.insertId, rec.name, adminUserId]
        );
      }

      // Seed Relationship: Companies -> Commercial Properties (One-to-Many)
      const [relRes] = await connection.query(
        `INSERT INTO object_relationships (organization_id, name, from_object, to_object, relationship_type)
         VALUES (?, 'Company Real Estate Assets', 'companies', CONCAT('custom_', ?), 'one_to_many');`,
        [orgId, propertyObjId]
      );

      const relId = relRes.insertId;
      if (compMap['Apex Technologies Inc.'] && insertedRecordIds[0]) {
        await connection.query(
          `INSERT INTO relationship_links (relationship_id, from_record_id, to_record_id)
           VALUES (?, ?, ?), (?, ?, ?);`,
          [relId, compMap['Apex Technologies Inc.'], insertedRecordIds[0], relId, compMap['Apex Technologies Inc.'], insertedRecordIds[2]]
        );
      }
      if (compMap['Nexus Global Logistics'] && insertedRecordIds[1]) {
        await connection.query(
          `INSERT INTO relationship_links (relationship_id, from_record_id, to_record_id)
           VALUES (?, ?, ?);`,
          [relId, compMap['Nexus Global Logistics'], insertedRecordIds[1]]
        );
      }
    }

    // -------------------------------------------------------------------
    // 12. Seed Default Workflow Automations (Spec §15)
    // -------------------------------------------------------------------
    console.log('[Seed] Seeding sample workflow automations...');
    const [existingWf] = await connection.query('SELECT id FROM workflows WHERE organization_id = ?;', [orgId]);
    if (existingWf.length === 0) {
      // 1. High-Value Deal Desk Alert
      const [wf1Res] = await connection.query(
        `INSERT INTO workflows (organization_id, name, description, object_type, trigger_type, status, created_by)
         VALUES (?, ?, ?, 'deal', 'stage_changed', 'published', ?);`,
        [
          orgId,
          'High-Value Deal Desk Alert',
          'Automatically flags enterprise deals above $50k advancing through the pipeline and logs an executive notification note.',
          adminUserId,
        ]
      );
      const wf1Id = wf1Res.insertId;

      await connection.query(
        `INSERT INTO workflow_conditions (workflow_id, condition_group, field, operator, value, logic, sort_order)
         VALUES (?, 1, 'value', 'greater_than', '50000', 'AND', 1);`,
        [wf1Id]
      );

      await connection.query(
        `INSERT INTO workflow_actions (workflow_id, sort_order, action_type, config_json)
         VALUES (?, 1, 'create_note', ?);`,
        [
          wf1Id,
          JSON.stringify({
            note: '⚡ [Automated Deal Desk] High-Value Opportunity "{{title}}" ($"{{value}}") advanced to stage "{{stage_name}}". Priority executive review assigned.',
          }),
        ]
      );

      // 2. New Customer Onboarding Protocol
      const [wf2Res] = await connection.query(
        `INSERT INTO workflows (organization_id, name, description, object_type, trigger_type, status, created_by)
         VALUES (?, ?, ?, 'contact', 'record_created', 'published', ?);`,
        [
          orgId,
          'New Customer Onboarding Protocol',
          'Automatically schedules welcome and kickoff materials when a new contact is onboarded as a Customer.',
          adminUserId,
        ]
      );
      const wf2Id = wf2Res.insertId;

      await connection.query(
        `INSERT INTO workflow_conditions (workflow_id, condition_group, field, operator, value, logic, sort_order)
         VALUES (?, 1, 'lifecycle_stage', 'equals', 'customer', 'AND', 1);`,
        [wf2Id]
      );

      await connection.query(
        `INSERT INTO workflow_actions (workflow_id, sort_order, action_type, config_json)
         VALUES (?, 1, 'create_note', ?);`,
        [
          wf2Id,
          JSON.stringify({
            note: '⚡ [Automated Onboarding] Customer account activated for {{first_name}} {{last_name}}. Welcome email packet dispatched and CSM assigned.',
          }),
        ]
      );
    }

    // -------------------------------------------------------------------
    // 13. Seed Tasks & Activities (Spec §12)
    // -------------------------------------------------------------------
    console.log('[Seed] Seeding sample tasks and reminders...');
    const [existingTasks] = await connection.query('SELECT id FROM tasks WHERE organization_id = ?;', [orgId]);
    if (existingTasks.length === 0) {
      await connection.query(
        `INSERT INTO tasks (organization_id, title, description, record_type, record_id, assigned_to, due_date, priority, status, created_by)
         VALUES 
         (?, 'Finalize Master Services Agreement (MSA)', 'Review legal and compliance redlines for 250-seat expansion.', 'deal', 1, ?, DATE_ADD(CURRENT_DATE, INTERVAL 3 DAY), 'urgent', 'in_progress', ?),
         (?, 'Deliver Architecture Blueprint to Sarah Connor', 'Send technical documentation on multi-tenant MySQL partitioning.', 'contact', 1, ?, DATE_ADD(CURRENT_DATE, INTERVAL 1 DAY), 'high', 'pending', ?),
         (?, 'Follow up on Dispatch AI Evaluation Pilot', 'Check in with David Miller regarding Chicago terminal metrics.', 'deal', 2, ?, DATE_ADD(CURRENT_DATE, INTERVAL 5 DAY), 'medium', 'pending', ?),
         (?, 'Conduct Discovery Kickoff Meeting', 'Review initial operational requirements with Marcus Brody.', 'contact', 4, ?, DATE_SUB(CURRENT_DATE, INTERVAL 1 DAY), 'low', 'completed', ?);`,
        [
          orgId, adminUserId, adminUserId,
          orgId, adminUserId, adminUserId,
          orgId, adminUserId, adminUserId,
          orgId, adminUserId, adminUserId,
        ]
      );
    }

    // -------------------------------------------------------------------
    // 14. Seed In-App Notifications (Spec §23)
    // -------------------------------------------------------------------
    console.log('[Seed] Seeding sample in-app notifications...');
    const [existingNotifs] = await connection.query('SELECT id FROM notifications WHERE organization_id = ?;', [orgId]);
    if (existingNotifs.length === 0) {
      await connection.query(
        `INSERT INTO notifications (organization_id, user_id, title, message, type, link_url, is_read)
         VALUES
         (?, ?, 'Enterprise Opportunity Alert', 'Apex Global Platform Expansion ($125,000) reached 70% win probability.', 'deal', '/deals/1', FALSE),
         (?, ?, 'Urgent Task Assigned', 'Finalize Master Services Agreement (MSA) due in 3 days.', 'task', '/tasks/1', FALSE),
         (?, ?, 'Welcome to Nexus CRM Platform', 'Multi-tenant architecture and event-driven automation engine initialized.', 'system', '/dashboard', TRUE);`,
        [orgId, adminUserId, orgId, adminUserId, orgId, adminUserId]
      );
    }

    // -------------------------------------------------------------------
    // 15. Seed Email Templates (Spec §13)
    // -------------------------------------------------------------------
    console.log('[Seed] Seeding sample email templates...');
    const [existingTpls] = await connection.query('SELECT id FROM email_templates WHERE organization_id = ?;', [orgId]);
    if (existingTpls.length === 0) {
      await connection.query(
        `INSERT INTO email_templates (organization_id, name, subject, body_template, category, created_by)
         VALUES
         (?, 'Enterprise Platform Overview', 'Introduction: AI-Native CRM Architecture for {{company_name}}', '<p>Hi {{first_name}},</p><p>Thank you for connecting. Attached is our enterprise architecture overview detailing multi-tenancy, custom entities, and automated sales workflows.</p><p>Best regards,<br>Nexus Team</p>', 'sales', ?),
         (?, 'Customer Welcome & Onboarding', 'Welcome to Nexus CRM, {{first_name}}!', '<p>Hi {{first_name}},</p><p>We are thrilled to welcome {{company_name}} to our platform! Your dedicated customer success manager has scheduled your setup kickoff.</p><p>Cheers,<br>Customer Success Team</p>', 'onboarding', ?),
         (?, 'Opportunity Follow-up', 'Next steps on {{deal_title}}', '<p>Hi {{first_name}},</p><p>Following up on our recent conversation regarding the {{deal_title}}. Let us know if you need any additional compliance certifications.</p>', 'follow_up', ?);`,
        [orgId, adminUserId, orgId, adminUserId, orgId, adminUserId]
      );
    }

    // -------------------------------------------------------------------
    // 16. Seed Default Reports, Dashboards & Widgets (Spec §29, §30)
    // -------------------------------------------------------------------
    console.log('[Seed] Seeding sample reports and operational dashboards...');
    const [existingReports] = await connection.query('SELECT id FROM reports WHERE organization_id = ?;', [orgId]);
    if (existingReports.length === 0) {
      // 1. Reports
      const [r1] = await connection.query(
        `INSERT INTO reports (organization_id, name, description, entity_type, chart_type, metric_type, metric_field, date_range, group_by, is_system, created_by)
         VALUES (?, 'Pipeline Stage Value Distribution', 'Total deal pipeline value aggregated across active stages.', 'deals', 'bar', 'sum', 'value', 'all', 'stage_name', TRUE, ?);`,
        [orgId, adminUserId]
      );
      const [r2] = await connection.query(
        `INSERT INTO reports (organization_id, name, description, entity_type, chart_type, metric_type, metric_field, date_range, group_by, is_system, created_by)
         VALUES (?, 'Pipeline Stage Conversion Funnel', 'Stage-by-stage deal volume and drop-off conversion rate.', 'deals', 'funnel', 'count', 'id', 'all', 'stage_name', TRUE, ?);`,
        [orgId, adminUserId]
      );
      const [r3] = await connection.query(
        `INSERT INTO reports (organization_id, name, description, entity_type, chart_type, metric_type, metric_field, date_range, group_by, is_system, created_by)
         VALUES (?, 'Weighted Revenue Forecast', 'Probability-weighted pipeline forecast for current quarter.', 'deals', 'metric', 'sum', 'weighted_value', '90d', 'none', TRUE, ?);`,
        [orgId, adminUserId]
      );
      const [r4] = await connection.query(
        `INSERT INTO reports (organization_id, name, description, entity_type, chart_type, metric_type, metric_field, date_range, group_by, is_system, created_by)
         VALUES (?, 'Deals by Owner & Rep', 'Deal distribution and opportunity ownership across sales reps.', 'deals', 'pie', 'count', 'id', 'all', 'owner_name', TRUE, ?);`,
        [orgId, adminUserId]
      );
      const [r5] = await connection.query(
        `INSERT INTO reports (organization_id, name, description, entity_type, chart_type, metric_type, metric_field, date_range, group_by, is_system, created_by)
         VALUES (?, 'Task Completion & Priority', 'Action item distribution broken down by priority level.', 'tasks', 'bar', 'count', 'id', '30d', 'priority', TRUE, ?);`,
        [orgId, adminUserId]
      );
      const [r6] = await connection.query(
        `INSERT INTO reports (organization_id, name, description, entity_type, chart_type, metric_type, metric_field, date_range, group_by, is_system, created_by)
         VALUES (?, 'Communication & Outreach Volume', 'Total outreach actions (calls, emails, notes) over the last 30 days.', 'activities', 'line', 'count', 'id', '30d', 'activity_type', TRUE, ?);`,
        [orgId, adminUserId]
      );
      const [r7] = await connection.query(
        `INSERT INTO reports (organization_id, name, description, entity_type, chart_type, metric_type, metric_field, date_range, group_by, is_system, created_by)
         VALUES (?, 'Contact Lifecycle Breakdown', 'Customer journey stages from Lead to Opportunity and Customer.', 'contacts', 'pie', 'count', 'id', 'all', 'lifecycle_stage', TRUE, ?);`,
        [orgId, adminUserId]
      );

      // 2. Dashboards
      const [d1] = await connection.query(
        `INSERT INTO dashboards (organization_id, name, description, is_default, is_system, created_by)
         VALUES (?, 'Executive Sales & Revenue Command Center', 'Primary executive operational overview of pipeline health, conversion velocity, and forecasted revenue.', TRUE, TRUE, ?);`,
        [orgId, adminUserId]
      );
      const [d2] = await connection.query(
        `INSERT INTO dashboards (organization_id, name, description, is_default, is_system, created_by)
         VALUES (?, 'Team Activity & Outreach Performance', 'Rep activity velocity, customer touchpoints, and task execution progress.', FALSE, TRUE, ?);`,
        [orgId, adminUserId]
      );

      // 3. Widgets for Dashboard 1 (Executive Sales)
      await connection.query(
        `INSERT INTO dashboard_widgets (organization_id, dashboard_id, report_id, title, widget_type, width, height, position_x, position_y, config_json)
         VALUES
         (?, ?, ?, 'Pipeline Conversion Funnel', 'funnel', 6, 4, 0, 0, '{"showPercentages": true}'),
         (?, ?, ?, 'Pipeline Stage Value Distribution', 'chart', 6, 4, 6, 0, '{"chartType": "bar"}'),
         (?, ?, ?, 'Deals by Sales Rep', 'chart', 6, 4, 0, 4, '{"chartType": "pie"}'),
         (?, ?, ?, 'Contact Lifecycle Breakdown', 'chart', 6, 4, 6, 4, '{"chartType": "pie"}');`,
        [
          orgId, d1.insertId, r2.insertId,
          orgId, d1.insertId, r1.insertId,
          orgId, d1.insertId, r4.insertId,
          orgId, d1.insertId, r7.insertId,
        ]
      );

      // 4. Widgets for Dashboard 2 (Team Activity)
      await connection.query(
        `INSERT INTO dashboard_widgets (organization_id, dashboard_id, report_id, title, widget_type, width, height, position_x, position_y, config_json)
         VALUES
         (?, ?, ?, '30-Day Outreach Volume by Channel', 'chart', 6, 4, 0, 0, '{"chartType": "line"}'),
         (?, ?, ?, 'Task Execution by Priority', 'chart', 6, 4, 6, 0, '{"chartType": "bar"}');`,
        [
          orgId, d2.insertId, r6.insertId,
          orgId, d2.insertId, r5.insertId,
        ]
      );
    }

    // -------------------------------------------------------------------
    // 17. Seed Default Autonomous AI Agents & Evaluations (Spec §20)
    // -------------------------------------------------------------------
    console.log('[Seed] Seeding sample AI agents and autonomous evaluations...');
    const [existingAgents] = await connection.query('SELECT id FROM agents WHERE organization_id = ?;', [orgId]);
    if (existingAgents.length === 0) {
      // 1. Deal Health Sentinel Agent
      const [ag1] = await connection.query(
        `INSERT INTO agents (organization_id, name, type, role, model, system_prompt, config_json, status, created_by)
         VALUES (?, 'Pipeline Deal Sentinel', 'deal_sentinel', 'Autonomous Pipeline Velocity & Risk Monitor', 'gemini-1.5-pro',
         'You are an autonomous AI deal risk sentinel. Analyze pipeline deals for stalling indicators, missing decision makers, and inactive communications.',
         '{"staleThresholdDays": 14, "alertOnDrop": true, "autoScoreHealth": true}', 'active', ?);`,
        [orgId, adminUserId]
      );

      // 2. Lead Qualification & Triage Agent
      const [ag2] = await connection.query(
        `INSERT INTO agents (organization_id, name, type, role, model, system_prompt, config_json, status, created_by)
         VALUES (?, 'Lead Qualification & Triage Agent', 'lead_qualifier', 'Inbound Prospect Scorer & Enrichment Evaluator', 'gemini-1.5-pro',
         'You evaluate new inbound leads against target ICP criteria, firmographic data, and engagement signals.',
         '{"minSeniorityLevel": "Director", "autoAssignReps": true}', 'active', ?);`,
        [orgId, adminUserId]
      );

      // 3. Customer Renewal Guardian
      const [ag3] = await connection.query(
        `INSERT INTO agents (organization_id, name, type, role, model, system_prompt, config_json, status, created_by)
         VALUES (?, 'Enterprise Renewal Guardian', 'renewal_guardian', 'Customer Health & Churn Risk Predictor', 'gemini-1.5-pro',
         'Proactively monitors enterprise accounts approaching contract renewal for touchpoint frequency and satisfaction indicators.',
         '{"renewalWindowDays": 90, "churnRiskThreshold": 40}', 'active', ?);`,
        [orgId, adminUserId]
      );

      // Seed sample agent runs
      await connection.query(
        `INSERT INTO agent_runs (organization_id, agent_id, trigger_event, status, record_type, record_id, health_score, evaluation_summary, recommended_action, steps_json)
         VALUES
         (?, ?, 'deal_health_audit', 'completed', 'deal', 1, 88,
          'Opportunity demonstrates strong momentum. VP of Operations and CTO engaged. Recent MSA exchange completed.',
          'Schedule final executive legal sign-off call with Apex Technologies by Friday.',
          '["1. Extracted 4 timeline activities", "2. Checked stakeholder seniority (CTO, VP)", "3. Evaluated pricing discount (0%)", "4. Calculated Deal Health: 88/100"]'),
         (?, ?, 'lead_enrichment_eval', 'completed', 'contact', 1, 95,
          'Verified C-level executive at Tier 1 Enterprise ($45M ARR). High buying authority and active expansion requirement.',
          'Propose custom tailored multi-tenant architecture pilot session.',
          '["1. Verified domain apextech.io", "2. Analyzed job title: CTO", "3. Cross-referenced parent company revenue", "4. Qualified as Tier-1 Enterprise Buyer"]');`,
        [
          orgId, ag1.insertId,
          orgId, ag2.insertId,
        ]
      );
    }

    // -------------------------------------------------------------------
    // 18. Seed CPQ: Products, Pricebooks, Entries & Quotes (Spec §24, §25)
    // -------------------------------------------------------------------
    console.log('[Seed] Seeding Products, Pricebooks & CPQ Quotes...');
    const [existingProducts] = await connection.query('SELECT id FROM products WHERE organization_id = ?;', [orgId]);
    if (existingProducts.length === 0) {
      // 1. Products Catalog
      const [prod1] = await connection.query(
        `INSERT INTO products (organization_id, name, sku, description, category, pricing_type, billing_frequency, unit_price, cost_price, currency, tax_rate, is_active, created_by)
         VALUES (?, 'Enterprise CRM Platform License (Tier 1)', 'SKU-CRM-ENT', 'Full-suite multi-tenant CRM with custom objects, dynamic views, and RBAC.', 'Software', 'recurring', 'annual', 18000.00, 3000.00, 'USD', 8.00, true, ?);`,
        [orgId, adminUserId]
      );
      const [prod2] = await connection.query(
        `INSERT INTO products (organization_id, name, sku, description, category, pricing_type, billing_frequency, unit_price, cost_price, currency, tax_rate, is_active, created_by)
         VALUES (?, 'AI Copilot & Autonomous Agents Add-on', 'SKU-AI-AGENTS', 'Natural language copilot, proactive pipeline sentinel, and deal health scoring.', 'Software', 'recurring', 'annual', 6000.00, 1000.00, 'USD', 8.00, true, ?);`,
        [orgId, adminUserId]
      );
      const [prod3] = await connection.query(
        `INSERT INTO products (organization_id, name, sku, description, category, pricing_type, billing_frequency, unit_price, cost_price, currency, tax_rate, is_active, created_by)
         VALUES (?, 'Custom Workflows & High-Throughput Webhook Engine', 'SKU-API-INTEG', 'Advanced event-driven automation rules, webhook dispatchers, and execution audit logging.', 'Software', 'recurring', 'annual', 4500.00, 500.00, 'USD', 8.00, true, ?);`,
        [orgId, adminUserId]
      );
      const [prod4] = await connection.query(
        `INSERT INTO products (organization_id, name, sku, description, category, pricing_type, billing_frequency, unit_price, cost_price, currency, tax_rate, is_active, created_by)
         VALUES (?, 'White-Glove Implementation & Architecture Consulting', 'SKU-SRV-ONBOARD', 'Dedicated solutions architect onboarding, migration, and custom field setup.', 'Professional Services', 'one_time', 'one_time', 12500.00, 6000.00, 'USD', 0.00, true, ?);`,
        [orgId, adminUserId]
      );

      // 2. Price Books
      const [pb1] = await connection.query(
        `INSERT INTO price_books (organization_id, name, description, currency, is_standard, is_active)
         VALUES (?, 'Standard Global Corporate Price Book', 'Standard list prices for all enterprise accounts.', 'USD', true, true);`,
        [orgId]
      );
      const [pb2] = await connection.query(
        `INSERT INTO price_books (organization_id, name, description, currency, is_standard, is_active)
         VALUES (?, 'Strategic Enterprise Partner Price Book', 'Tier-1 discounted price book for volume commitments (>100 seats).', 'USD', false, true);`,
        [orgId]
      );

      // 3. Price Book Entries
      await connection.query(
        `INSERT INTO price_book_entries (organization_id, price_book_id, product_id, unit_price, currency, min_quantity, discount_percent, is_active)
         VALUES
         (?, ?, ?, 18000.00, 'USD', 1, 0.00, true),
         (?, ?, ?, 6000.00, 'USD', 1, 0.00, true),
         (?, ?, ?, 4500.00, 'USD', 1, 0.00, true),
         (?, ?, ?, 12500.00, 'USD', 1, 0.00, true),
         (?, ?, ?, 15000.00, 'USD', 1, 16.67, true),
         (?, ?, ?, 5000.00, 'USD', 1, 16.67, true),
         (?, ?, ?, 3800.00, 'USD', 1, 15.56, true),
         (?, ?, ?, 10000.00, 'USD', 1, 20.00, true);`,
        [
          orgId, pb1.insertId, prod1.insertId,
          orgId, pb1.insertId, prod2.insertId,
          orgId, pb1.insertId, prod3.insertId,
          orgId, pb1.insertId, prod4.insertId,
          orgId, pb2.insertId, prod1.insertId,
          orgId, pb2.insertId, prod2.insertId,
          orgId, pb2.insertId, prod3.insertId,
          orgId, pb2.insertId, prod4.insertId,
        ]
      );

      // 4. Quotes & Quote Line Items (§25)
      const [dealsList] = await connection.query('SELECT id, company_id, contact_id FROM deals WHERE organization_id = ? ORDER BY id ASC LIMIT 2;', [orgId]);
      const d1 = dealsList[0];
      const d2 = dealsList[1];

      // Quote 1: Approved & Signed Quote for Deal 1 ($125,000)
      const [q1] = await connection.query(
        `INSERT INTO quotes (organization_id, quote_number, deal_id, company_id, contact_id, price_book_id, title, status, version, subtotal, discount_type, discount_value, discount_amount, tax_rate, tax_amount, total_amount, currency, valid_until, terms_conditions, notes, approved_by, approved_at, signature_status, signature_url, signed_at, created_by)
         VALUES (?, 'QT-2026-001', ?, ?, ?, ?, 'Apex Global 250-Seat Platform Expansion Proposal', 'approved', 1, 131500.00, 'fixed', 6500.00, 6500.00, 0.00, 0.00, 125000.00, 'USD', DATE_ADD(CURDATE(), INTERVAL 30 DAY), 'Net-30 payment terms. 99.95% multi-region uptime SLA with enterprise support included.', 'Pre-approved 5% bundle discount by VP Sales.', ?, NOW(), 'signed', 'https://docusign.com/verify/qt-2026-001-signed', NOW(), ?);`,
        [orgId, d1?.id || 1, d1?.company_id || 1, d1?.contact_id || 1, pb2.insertId, adminUserId, adminUserId]
      );

      // Quote Line items for Quote 1
      await connection.query(
        `INSERT INTO quote_line_items (organization_id, quote_id, product_id, item_order, description, quantity, unit_price, discount_percent, discount_amount, line_total, billing_frequency)
         VALUES
         (?, ?, ?, 1, 'Enterprise CRM Platform License (Tier 1)', 5.00, 18000.00, 0.00, 0.00, 90000.00, 'annual'),
         (?, ?, ?, 2, 'AI Copilot & Autonomous Agents Add-on', 4.00, 6000.00, 0.00, 0.00, 24000.00, 'annual'),
         (?, ?, ?, 3, 'Custom Workflows & High-Throughput Webhook Engine', 1.00, 4500.00, 0.00, 0.00, 4500.00, 'annual'),
         (?, ?, ?, 4, 'White-Glove Implementation & Architecture Consulting', 1.00, 13000.00, 0.00, 0.00, 13000.00, 'one_time');`,
        [
          orgId, q1.insertId, prod1.insertId,
          orgId, q1.insertId, prod2.insertId,
          orgId, q1.insertId, prod3.insertId,
          orgId, q1.insertId, prod4.insertId,
        ]
      );

      // Quote 2: Presented Quote for Deal 2 ($84,000)
      const [q2] = await connection.query(
        `INSERT INTO quotes (organization_id, quote_number, deal_id, company_id, contact_id, price_book_id, title, status, version, subtotal, discount_type, discount_value, discount_amount, tax_rate, tax_amount, total_amount, currency, valid_until, terms_conditions, notes, signature_status, created_by)
         VALUES (?, 'QT-2026-002', ?, ?, ?, ?, 'Nexus Logistics AI Dispatch Integration Proposal', 'presented', 1, 88500.00, 'fixed', 4500.00, 4500.00, 0.00, 0.00, 84000.00, 'USD', DATE_ADD(CURDATE(), INTERVAL 45 DAY), 'Net-45 payment terms. Standard SLA included.', 'Awaiting legal sign-off from Nexus procurement.', 'pending_signature', ?);`,
        [orgId, d2?.id || 2, d2?.company_id || 3, d2?.contact_id || 3, pb1.insertId, adminUserId]
      );

      await connection.query(
        `INSERT INTO quote_line_items (organization_id, quote_id, product_id, item_order, description, quantity, unit_price, discount_percent, discount_amount, line_total, billing_frequency)
         VALUES
         (?, ?, ?, 1, 'Enterprise CRM Platform License (Tier 1)', 3.00, 18000.00, 0.00, 0.00, 54000.00, 'annual'),
         (?, ?, ?, 2, 'AI Copilot & Autonomous Agents Add-on', 3.00, 6000.00, 0.00, 0.00, 18000.00, 'annual'),
         (?, ?, ?, 3, 'White-Glove Implementation & Architecture Consulting', 1.00, 12000.00, 0.00, 0.00, 12000.00, 'one_time');`,
        [
          orgId, q2.insertId, prod1.insertId,
          orgId, q2.insertId, prod2.insertId,
          orgId, q2.insertId, prod4.insertId,
        ]
      );
    }

    // -------------------------------------------------------------------
    // 19. Seed Support, Ticketing, SLAs & Knowledge Base (Spec §23, §26)
    // -------------------------------------------------------------------
    console.log('[Seed] Seeding support tickets, SLA policies, and knowledge base...');
    const [existingTickets] = await connection.query('SELECT id FROM tickets WHERE organization_id = ? LIMIT 1;', [orgId]);
    if (existingTickets.length === 0) {
      // 1. SLA Policies
      const [slaUrgent] = await connection.query(
        `INSERT INTO sla_policies (organization_id, name, description, priority, first_response_time_minutes, resolution_time_minutes, business_hours_only, is_default)
         VALUES (?, 'Critical 15m / 2h Urgent SLA', '24/7 mission critical production outages', 'urgent', 15, 120, FALSE, FALSE);`,
        [orgId]
      );
      const [slaHigh] = await connection.query(
        `INSERT INTO sla_policies (organization_id, name, description, priority, first_response_time_minutes, resolution_time_minutes, business_hours_only, is_default)
         VALUES (?, 'High Priority 1h / 8h SLA', 'Urgent workflow degradation impacting key teams', 'high', 60, 480, TRUE, FALSE);`,
        [orgId]
      );
      const [slaMed] = await connection.query(
        `INSERT INTO sla_policies (organization_id, name, description, priority, first_response_time_minutes, resolution_time_minutes, business_hours_only, is_default)
         VALUES (?, 'Standard Enterprise 4h / 24h SLA', 'Standard requests, billing, and operational queries', 'medium', 240, 1440, TRUE, TRUE);`,
        [orgId]
      );
      const [slaLow] = await connection.query(
        `INSERT INTO sla_policies (organization_id, name, description, priority, first_response_time_minutes, resolution_time_minutes, business_hours_only, is_default)
         VALUES (?, 'Low Urgency 12h / 72h SLA', 'General advisory, documentation, and non-blocking tasks', 'low', 720, 4320, TRUE, FALSE);`,
        [orgId]
      );

      // 2. Canned Responses
      await connection.query(
        `INSERT INTO canned_responses (organization_id, title, shortcut, category, body_text, created_by, is_shared)
         VALUES
         (?, 'Greeting & Initial Verification', '!greeting', 'General', 'Hello! Thank you for reaching out to Acme Support. My name is Alex and I will be assisting you today. Could you please provide your workspace tenant ID and any relevant error logs or screenshots?', ?, TRUE),
         (?, 'Escalated to Systems Engineering', '!investigating', 'Technical', 'We have replicated the issue and escalated this ticket directly to our tier-2 systems engineering team. We are actively investigating and will provide a status update within our SLA response window.', ?, TRUE),
         (?, 'Billing Statement Adjustment Clarification', '!billing', 'Billing', 'Thank you for contacting our billing department. I have verified your account activity and applied the prorated credit adjustment. An amended PDF invoice is now available in your customer portal.', ?, TRUE),
         (?, 'Resolution & CSAT Survey Prompt', '!resolved', 'Closing', 'We are pleased to inform you that the reported issue has been fully resolved. We are closing this ticket now. Please take a quick moment to rate your support experience below!', ?, TRUE);`,
        [orgId, adminUserId, orgId, adminUserId, orgId, adminUserId, orgId, adminUserId]
      );

      // 3. Knowledge Base Articles
      await connection.query(
        `INSERT INTO kb_articles (organization_id, title, slug, category, content, status, view_count, helpful_count, created_by)
         VALUES
         (?, 'Configuring SAML 2.0 Single Sign-On (Okta, Azure AD, Google Workspace)', 'saml-sso-configuration', 'Security & Identity', 'Enterprise accounts support SAML 2.0 Identity Federation with major IdP providers including Okta, Microsoft Entra ID (Azure AD), and Google Workspace.\\n\\n### Step-by-Step Setup:\\n1. Navigate to Settings -> Security -> SSO & Identity Federation.\\n2. Copy the Assertion Consumer Service (ACS) URL and Entity ID into your IdP application settings.\\n3. Upload your IdP X.509 Signing Certificate (PEM format).\\n4. Enable JIT (Just-In-Time) user provisioning to automatically assign new team members to default roles.', 'published', 245, 18, ?),
         (?, 'REST API Authentication, Rate Limits & Webhook Verification', 'api-authentication-webhooks', 'Developer Guides', 'The CRM API platform provides comprehensive REST endpoints with JSON payloads.\\n\\n### Authentication:\\nPass Bearer Tokens in the Authorization header: \\'Authorization: Bearer <your_jwt_token>\\'.\\n\\n### Rate Limits:\\nStandard tenant accounts have a burst limit of 100 requests per minute with Redis token-bucket throttling.\\n\\n### Webhooks:\\nOutgoing webhooks include an HMAC SHA-256 signature in the X-CRM-Signature header computed using your tenant webhook signing secret.', 'published', 189, 14, ?),
         (?, 'Custom Object Hybrid Storage & Dynamic JSON Schema Extension', 'custom-objects-architecture', 'Architecture', 'The CRM platform implements a hybrid relational-JSON datastore (§2) providing zero-migration custom table builder capabilities.\\n\\nAttributes marked as filterable are materialized via virtual generated columns for instant indexing, while custom records are persisted as canonical JSON documents.', 'published', 132, 9, ?);`,
        [orgId, adminUserId, orgId, adminUserId, orgId, adminUserId]
      );

      // 4. Sample Support Tickets
      const [cRows] = await connection.query('SELECT id, email, first_name, last_name, company_id FROM contacts WHERE organization_id = ?;', [orgId]);
      const sarah = cRows.find(c => c.email.includes('sarah')) || cRows[0];
      const david = cRows.find(c => c.email.includes('david')) || cRows[1] || cRows[0];
      const elena = cRows.find(c => c.email.includes('elena')) || cRows[2] || cRows[0];

      // Ticket 1: Urgent Open Ticket (Apex Technologies)
      const [t1] = await connection.query(
        `INSERT INTO tickets (organization_id, ticket_number, subject, description, status, priority, channel, category, company_id, contact_id, assigned_to, sla_policy_id, first_response_due_at, resolution_due_at, first_responded_at, sla_status, tags_json, created_by)
         VALUES (?, 'TCK-1001', 'SSO Okta SAML 2.0 Identity Federation Failing with Error 401', 'After our Okta tenant certificate renewal this morning, users from our European subsidiary are receiving 401 Unauthorized during SAML assertion handshakes.', 'open', 'urgent', 'email', 'Security & Identity', ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 15 MINUTE), DATE_ADD(NOW(), INTERVAL 2 HOUR), NOW(), 'within_sla', '["okta", "saml", "sso-failure", "escalated"]', ?);`,
        [orgId, sarah.company_id, sarah.id, adminUserId, slaUrgent.insertId, adminUserId]
      );

      await connection.query(
        `INSERT INTO ticket_messages (organization_id, ticket_id, sender_type, sender_contact_id, sender_name, sender_email, message_type, body_text, channel)
         VALUES (?, ?, 'customer', ?, ?, ?, 'public_reply', 'We are getting 401 Unauthorized errors after our Okta X.509 cert renewal. Over 30 engineers in our Berlin and Dublin offices are blocked from accessing CRM deals.', 'email');`,
        [orgId, t1.insertId, sarah.id, `${sarah.first_name} ${sarah.last_name}`, sarah.email]
      );

      await connection.query(
        `INSERT INTO ticket_messages (organization_id, ticket_id, sender_type, sender_user_id, sender_name, sender_email, message_type, body_text, channel)
         VALUES (?, ?, 'agent', ?, 'Alex Vance', 'admin@crm.local', 'public_reply', 'Hello Sarah, thank you for alerting us. I am inspecting your tenant SSO metadata now. We see the cert hash mismatch and are updating the cached IdP certificate fingerprint.', 'email');`,
        [orgId, t1.insertId, adminUserId]
      );

      await connection.query(
        `INSERT INTO ticket_messages (organization_id, ticket_id, sender_type, sender_user_id, sender_name, sender_email, message_type, body_text, channel)
         VALUES (?, ?, 'agent', ?, 'Alex Vance', 'admin@crm.local', 'internal_note', 'INTERNAL NOTE: Re-synced IdP XML metadata manually. Staging auth test passed with Okta test harness. Waiting 10 mins for European CDN edge propagate.', 'system');`,
        [orgId, t1.insertId, adminUserId]
      );

      // Ticket 2: High Priority Pending Customer Ticket (Nexus Logistics)
      const [t2] = await connection.query(
        `INSERT INTO tickets (organization_id, ticket_number, subject, description, status, priority, channel, category, company_id, contact_id, assigned_to, sla_policy_id, first_response_due_at, resolution_due_at, first_responded_at, sla_status, tags_json, created_by)
         VALUES (?, 'TCK-1002', 'Discrepancy in Q3 Cloud Infrastructure Volume Invoicing', 'Our quarterly invoice reflects 25 extra seats that were de-provisioned in July. Please adjust the billing statement before end of month.', 'pending_customer', 'high', 'web_portal', 'Billing & Invoicing', ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 60 MINUTE), DATE_ADD(NOW(), INTERVAL 8 HOUR), NOW(), 'within_sla', '["billing", "invoice-credit", "seat-count"]', ?);`,
        [orgId, david.company_id, david.id, adminUserId, slaHigh.insertId, adminUserId]
      );

      await connection.query(
        `INSERT INTO ticket_messages (organization_id, ticket_id, sender_type, sender_contact_id, sender_name, sender_email, message_type, body_text, channel)
         VALUES (?, ?, 'customer', ?, ?, ?, 'public_reply', 'Our Q3 invoice statement indicates 125 active seats, but 25 warehouse dispatch operators were de-provisioned on July 14th. Can we receive an updated statement?', 'web_portal');`,
        [orgId, t2.insertId, david.id, `${david.first_name} ${david.last_name}`, david.email]
      );

      await connection.query(
        `INSERT INTO ticket_messages (organization_id, ticket_id, sender_type, sender_user_id, sender_name, sender_email, message_type, body_text, channel)
         VALUES (?, ?, 'agent', ?, 'Alex Vance', 'admin@crm.local', 'public_reply', 'Hi David, thank you for reaching out. I cross-referenced the de-provisioning audit log and confirmed the adjustment. We have applied a $1,875.00 credit memo to your balance. Please check your billing dashboard and let us know if the updated total looks good!', 'web_portal');`,
        [orgId, t2.insertId, adminUserId]
      );

      // Ticket 3: Resolved Medium Ticket with 5-star CSAT (Apex Technologies)
      const [t3] = await connection.query(
        `INSERT INTO tickets (organization_id, ticket_number, subject, description, status, priority, channel, category, company_id, contact_id, assigned_to, sla_policy_id, first_response_due_at, resolution_due_at, first_responded_at, resolved_at, sla_status, csat_score, csat_comment, tags_json, created_by)
         VALUES (?, 'TCK-1003', 'Request for Custom Webhook Payload on Deal Stage Progression', 'We want to trigger our internal Slack notification bot whenever an Enterprise deal reaches the Proposal Sent stage.', 'resolved', 'medium', 'chat', 'Integrations & APIs', ?, ?, ?, ?, DATE_SUB(NOW(), INTERVAL 4 HOUR), DATE_ADD(NOW(), INTERVAL 20 HOUR), DATE_SUB(NOW(), INTERVAL 3 HOUR), NOW(), 'within_sla', 5, 'Alex Vance gave us the exact JSON webhook payload schema and test script! Brilliant support.', '["webhook", "automation", "slack"]', ?);`,
        [orgId, elena.company_id, elena.id, adminUserId, slaMed.insertId, adminUserId]
      );

      await connection.query(
        `INSERT INTO ticket_messages (organization_id, ticket_id, sender_type, sender_contact_id, sender_name, sender_email, message_type, body_text, channel)
         VALUES (?, ?, 'customer', ?, ?, ?, 'public_reply', 'Hi team! Can we send an automatic webhook to our internal engineering Slack channel whenever a deal crosses $50,000?', 'chat');`,
        [orgId, t3.insertId, elena.id, `${elena.first_name} ${elena.last_name}`, elena.email]
      );

      await connection.query(
        `INSERT INTO ticket_messages (organization_id, ticket_id, sender_type, sender_user_id, sender_name, sender_email, message_type, body_text, channel)
         VALUES (?, ?, 'agent', ?, 'Alex Vance', 'admin@crm.local', 'public_reply', 'Hello Elena! Absolutely. In the Workflow Automation studio (§15), configure trigger "deal.stage_changed", add a condition for value >= 50000, and add the Webhook action pointing to your Slack webhook URL.', 'chat');`,
        [orgId, t3.insertId, adminUserId]
      );

      // Ticket 4: New Unassigned Low Ticket (Nexus Logistics)
      await connection.query(
        `INSERT INTO tickets (organization_id, ticket_number, subject, description, status, priority, channel, category, company_id, contact_id, sla_policy_id, first_response_due_at, resolution_due_at, sla_status, tags_json, created_by)
         VALUES (?, 'TCK-1004', 'Bulk Contact CSV Importer Field Mapping Assistance', 'We are migrating 2,400 legacy customer records from our previous CRM. Do custom fields need to be created prior to CSV upload?', 'new', 'low', 'web_portal', 'Data Management', ?, ?, ?, DATE_ADD(NOW(), INTERVAL 12 HOUR), DATE_ADD(NOW(), INTERVAL 72 HOUR), 'within_sla', '["csv", "import", "data-migration"]', ?);`,
        [orgId, david.company_id, david.id, slaLow.insertId, adminUserId]
      );
    }

    // -------------------------------------------------------------------
    // 20. Seed Sales Sequences & Email Campaigns (Spec §14, §23)
    // -------------------------------------------------------------------
    console.log('[Seed] Seeding sales sequences, cadence steps, contact enrollments, and campaigns...');
    const [existingSeqs] = await connection.query('SELECT id FROM sequences WHERE organization_id = ? LIMIT 1;', [orgId]);
    if (existingSeqs.length === 0) {
      // 1. Sequence 1: Enterprise Cold Outbound Cadence
      const [seq1] = await connection.query(
        `INSERT INTO sequences (organization_id, name, description, status, pause_on_reply, total_enrolled, total_completed, total_replied, created_by)
         VALUES (?, 'Enterprise Cold Outbound Cadence', '4-touchpoint executive multi-channel cadence combining email, LinkedIn outreach, and phone discovery.', 'active', TRUE, 3, 0, 1, ?);`,
        [orgId, adminUserId]
      );
      const seq1Id = seq1.insertId;

      await connection.query(
        `INSERT INTO sequence_steps (organization_id, sequence_id, step_order, step_type, delay_days, delay_hours, subject, body_template, config_json)
         VALUES
         (?, ?, 1, 'email', 0, 0, 'Revolutionizing enterprise CRM workflows for {{company_name}}', 'Hi {{first_name}},\\n\\nI noticed the impressive work {{company_name}} is doing in your market. We have built an AI-native CRM platform that unifies multi-channel outreach, ticket SLAs, and hybrid JSON schema custom entities with sub-10ms response times.\\n\\nWould you be open to a 10-minute introductory sync this Thursday?\\n\\nBest,\\nAlex Vance', '{"track_opens": true, "track_clicks": true}'),
         (?, ?, 2, 'delay', 2, 0, 'Follow-up delay (48 hours)', 'Wait 48 hours for prospect response before next touchpoint.', '{}'),
         (?, ?, 3, 'linkedin_touch', 1, 0, 'Connect on LinkedIn & verify executive team updates', 'Send connection request to {{first_name}} with note referencing platform architecture benchmark.', '{"action": "connect_and_message"}'),
         (?, ?, 4, 'call_reminder', 2, 0, 'Outbound discovery telephone touchpoint with {{first_name}}', 'Call {{first_name}} at {{company_name}} to discuss current pipeline bottlenecks and CRM consolidation goals.', '{"priority": "high"}');`,
        [orgId, seq1Id, orgId, seq1Id, orgId, seq1Id, orgId, seq1Id]
      );

      // 2. Sequence 2: New Customer Onboarding Journey
      const [seq2] = await connection.query(
        `INSERT INTO sequences (organization_id, name, description, status, pause_on_reply, total_enrolled, total_completed, total_replied, created_by)
         VALUES (?, 'New Customer Onboarding Journey', 'Automated 3-phase customer success onboarding sequence ensuring rapid tenant time-to-value.', 'active', FALSE, 1, 1, 0, ?);`,
        [orgId, adminUserId]
      );
      const seq2Id = seq2.insertId;

      await connection.query(
        `INSERT INTO sequence_steps (organization_id, sequence_id, step_order, step_type, delay_days, delay_hours, subject, body_template, config_json)
         VALUES
         (?, ?, 1, 'email', 0, 0, 'Welcome to Nexus CRM Platform, {{first_name}}!', 'Hi {{first_name}},\\n\\nWe are thrilled to welcome {{company_name}} to Nexus CRM. Your tenant workspace is live with pre-configured sales pipelines, enterprise SLA policies, and automated workflows.\\n\\nClick below to access your onboarding checklist and invite your team members.\\n\\nCheers,\\nAcme Customer Success', '{"track_opens": true, "track_clicks": true}'),
         (?, ?, 2, 'task', 3, 0, 'Schedule 30-day technical architecture review with {{first_name}}', 'Verify tenant webhook integration and single sign-on SAML federation status.', '{"task_type": "review"}'),
         (?, ?, 3, 'email', 7, 0, 'How is {{company_name}} progressing with Nexus CRM?', 'Hi {{first_name}},\\n\\nChecking in on your first week with Nexus CRM. Have you had a chance to explore our custom objects builder and AI Copilot?\\n\\nLet us know if you need any tailored guidance.', '{"track_opens": true}');`,
        [orgId, seq2Id, orgId, seq2Id, orgId, seq2Id]
      );

      // 3. Contact Enrollments
      const [allContacts] = await connection.query('SELECT id, email, first_name, last_name FROM contacts WHERE organization_id = ?;', [orgId]);
      const sarah = allContacts.find(c => c.email.includes('sarah')) || allContacts[0];
      const elena = allContacts.find(c => c.email.includes('elena')) || allContacts[1];
      const david = allContacts.find(c => c.email.includes('david')) || allContacts[2];
      const marcus = allContacts.find(c => c.email.includes('marcus')) || allContacts[3];

      if (elena) {
        await connection.query(
          `INSERT INTO sequence_enrollments (organization_id, sequence_id, contact_id, enrolled_by, current_step_order, status, next_step_due_at, last_executed_at)
           VALUES (?, ?, ?, ?, 2, 'active', DATE_ADD(NOW(), INTERVAL 1 DAY), DATE_SUB(NOW(), INTERVAL 1 DAY));`,
          [orgId, seq1Id, elena.id, adminUserId]
        );
      }
      if (david) {
        await connection.query(
          `INSERT INTO sequence_enrollments (organization_id, sequence_id, contact_id, enrolled_by, current_step_order, status, last_executed_at, completed_at)
           VALUES (?, ?, ?, ?, 1, 'replied_unenrolled', DATE_SUB(NOW(), INTERVAL 2 DAY), DATE_SUB(NOW(), INTERVAL 1 DAY));`,
          [orgId, seq1Id, david.id, adminUserId]
        );
      }
      if (marcus) {
        await connection.query(
          `INSERT INTO sequence_enrollments (organization_id, sequence_id, contact_id, enrolled_by, current_step_order, status, next_step_due_at, last_executed_at)
           VALUES (?, ?, ?, ?, 1, 'active', DATE_ADD(NOW(), INTERVAL 2 HOUR), NOW());`,
          [orgId, seq1Id, marcus.id, adminUserId]
        );
      }
      if (sarah) {
        await connection.query(
          `INSERT INTO sequence_enrollments (organization_id, sequence_id, contact_id, enrolled_by, current_step_order, status, last_executed_at, completed_at)
           VALUES (?, ?, ?, ?, 3, 'completed', DATE_SUB(NOW(), INTERVAL 5 DAY), DATE_SUB(NOW(), INTERVAL 2 DAY));`,
          [orgId, seq2Id, sarah.id, adminUserId]
        );
      }

      // 4. Broadcast Email Campaign
      const [camp1] = await connection.query(
        `INSERT INTO email_campaigns (organization_id, name, subject, preview_text, from_name, from_email, target_segment, status, html_content, plain_content, sent_at, total_recipients, delivered_count, open_count, click_count, bounce_count, created_by)
         VALUES (?, 'Q4 Platform V2 Feature Showcase & Executive Webinar', 'Live Webinar: Next-Gen CRM Architecture & Autonomous AI Agents', 'Discover how multi-tenant partitioning and real-time SLAs transform sales velocity.', 'Alex Vance', 'alex@acme.global', 'all_contacts', 'sent',
         '<h2>Exclusive Product Preview & Executive Deep Dive</h2><p>Join our CTO Alex Vance for an exclusive 45-minute live walkthrough of the Nexus CRM 2.0 release, covering automated sequences, real-time SLA monitors, and custom object schemas.</p><p><a href="https://crm.local/webinar-register">Click here to reserve your VIP seat &rarr;</a></p>',
         'Join our CTO Alex Vance for an exclusive 45-minute live walkthrough of Nexus CRM 2.0 release: https://crm.local/webinar-register',
         DATE_SUB(NOW(), INTERVAL 3 DAY), 4, 4, 3, 2, 0, ?);`,
        [orgId, adminUserId]
      );
      const camp1Id = camp1.insertId;

      // 5. Campaign Recipients
      const recipientStatusMap = [
        { c: sarah, status: 'clicked' },
        { c: elena, status: 'opened' },
        { c: david, status: 'clicked' },
        { c: marcus, status: 'sent' }
      ];

      for (const item of recipientStatusMap) {
        if (item.c) {
          const openedAtSql = (item.status === 'opened' || item.status === 'clicked') ? 'DATE_SUB(NOW(), INTERVAL 2 DAY)' : 'NULL';
          const clickedAtSql = item.status === 'clicked' ? 'DATE_SUB(NOW(), INTERVAL 1 DAY)' : 'NULL';
          await connection.query(
            `INSERT INTO campaign_recipients (organization_id, campaign_id, contact_id, email, status, opened_at, clicked_at, sent_at)
             VALUES (?, ?, ?, ?, ?, ${openedAtSql}, ${clickedAtSql}, DATE_SUB(NOW(), INTERVAL 3 DAY));`,
            [
              orgId,
              camp1Id,
              item.c.id,
              item.c.email,
              item.status,
            ]
          );
        }
      }
    }

    // -------------------------------------------------------------------
    // 21. Seed Developer API Keys & Webhook Endpoints (§31, §36, §37)
    // -------------------------------------------------------------------
    console.log('[Seed] Seeding developer API keys, webhooks and native integrations...');
    const [existingKeys] = await connection.query('SELECT id FROM api_keys WHERE organization_id = ? LIMIT 1;', [orgId]);
    if (existingKeys.length === 0) {
      
      // 1. API Keys
      const key1Raw = 'crm_live_9b4a7810ec7612f019a823cd';
      const key1Hash = crypto.createHash('sha256').update(key1Raw).digest('hex');
      const key2Raw = 'crm_live_7f21004ab12e987c551203aa';
      const key2Hash = crypto.createHash('sha256').update(key2Raw).digest('hex');
      const key3Raw = 'crm_live_3e88fa109b8214de883391bb';
      const key3Hash = crypto.createHash('sha256').update(key3Raw).digest('hex');

      await connection.query(
        `INSERT INTO api_keys (organization_id, user_id, name, key_prefix, key_hash, scopes_json, rate_limit_per_minute, status, last_used_at)
         VALUES 
          (?, ?, 'Zapier Lead & Contact Ingestion', 'crm_live_9b4a', ?, ?, 120, 'active', DATE_SUB(NOW(), INTERVAL 2 HOUR)),
          (?, ?, 'Stripe Billing & Payment Sync', 'crm_live_7f21', ?, ?, 60, 'active', DATE_SUB(NOW(), INTERVAL 1 DAY)),
          (?, ?, 'Data Warehouse & ETL Pipeline', 'crm_live_3e88', ?, ?, 300, 'active', DATE_SUB(NOW(), INTERVAL 4 HOUR))
         ON DUPLICATE KEY UPDATE name = VALUES(name);`,
        [
          orgId, adminUserId, key1Hash, JSON.stringify(['contacts:read', 'contacts:write', 'deals:read']),
          orgId, adminUserId, key2Hash, JSON.stringify(['quotes:read', 'quotes:sign', 'deals:write']),
          orgId, adminUserId, key3Hash, JSON.stringify(['*']),
        ]
      );

      // 2. Webhook Endpoints
      const [wh1] = await connection.query(
        `INSERT INTO webhook_endpoints (organization_id, name, target_url, secret_token, subscribed_events_json, status, last_status_code, last_delivery_at, created_by)
         VALUES (?, 'Zapier Production Deal Webhook', 'https://hooks.zapier.com/hooks/catch/91823/deal-won/', 'whsec_9b4a7810ec7612f019', ?, 'active', 200, DATE_SUB(NOW(), INTERVAL 1 HOUR), ?);`,
        [orgId, JSON.stringify(['deal.created', 'deal.stage_changed']), adminUserId]
      );
      const wh1Id = wh1.insertId;

      const [wh2] = await connection.query(
        `INSERT INTO webhook_endpoints (organization_id, name, target_url, secret_token, subscribed_events_json, status, last_status_code, last_delivery_at, created_by)
         VALUES (?, 'Slack Deal Announcements Channel', 'https://hooks.slack.com/services/T001/B002/X9941', 'whsec_3389a9c0429f01ab78', ?, 'active', 200, DATE_SUB(NOW(), INTERVAL 3 HOUR), ?);`,
        [orgId, JSON.stringify(['deal.stage_changed', 'ticket.created']), adminUserId]
      );
      const wh2Id = wh2.insertId;

      await connection.query(
        `INSERT INTO webhook_endpoints (organization_id, name, target_url, secret_token, subscribed_events_json, status, created_by)
         VALUES (?, 'Enterprise ERP Data Warehouse', 'https://erp.acme.global/api/v1/crm-listener', 'whsec_ee44129984bc019234', ?, 'active', ?);`,
        [orgId, JSON.stringify(['quote.accepted', 'contact.created']), adminUserId]
      );

      // 3. Webhook Deliveries
      await connection.query(
        `INSERT INTO webhook_deliveries (organization_id, webhook_endpoint_id, event_type, idempotency_key, payload_json, request_headers_json, response_status, response_body, duration_ms, status)
         VALUES 
          (?, ?, 'deal.stage_changed', UUID(), ?, ?, 200, '{"received":true,"status":"queued"}', 48, 'success'),
          (?, ?, 'deal.created', UUID(), ?, ?, 200, '{"ok":true,"channel":"#sales-wins"}', 52, 'success');`,
        [
          orgId, wh1Id,
          JSON.stringify({ event: 'deal.stage_changed', dealId: 101, title: 'Enterprise Cloud Migration', stage: 'negotiation', value: 125000 }),
          JSON.stringify({ 'Content-Type': 'application/json', 'X-CRM-Signature': 'sha256=9f823...', 'X-CRM-Event': 'deal.stage_changed' }),
          orgId, wh2Id,
          JSON.stringify({ event: 'deal.created', dealId: 104, title: 'Global Defense Telemetry License', value: 85000 }),
          JSON.stringify({ 'Content-Type': 'application/json', 'X-CRM-Signature': 'sha256=31ac4...', 'X-CRM-Event': 'deal.created' }),
        ]
      );

      // 4. Pre-Built Third-Party Integrations
      await connection.query(
        `INSERT INTO integrations (organization_id, provider, name, status, config_json, last_sync_at, sync_count, created_by)
         VALUES 
          (?, 'slack', 'Slack Deal & Support Bot', 'connected', ?, DATE_SUB(NOW(), INTERVAL 30 MINUTE), 24, ?),
          (?, 'stripe', 'Stripe Billing & Invoicing Bridge', 'connected', ?, DATE_SUB(NOW(), INTERVAL 1 HOUR), 12, ?),
          (?, 'google_calendar', 'Google Calendar Meeting Sync', 'connected', ?, DATE_SUB(NOW(), INTERVAL 2 HOUR), 38, ?),
          (?, 'zapier', 'Zapier Multi-App Lead Ingestion', 'connected', ?, DATE_SUB(NOW(), INTERVAL 4 HOUR), 56, ?),
          (?, 'hubspot', 'HubSpot Bi-directional Migration Sync', 'disconnected', ?, NULL, 0, ?)
         ON DUPLICATE KEY UPDATE name = VALUES(name), status = VALUES(status), config_json = VALUES(config_json);`,
        [
          orgId, JSON.stringify({ channel: '#sales-announcements', notifyOnWon: true, notifyOnSlaBreach: true }), adminUserId,
          orgId, JSON.stringify({ autoInvoiceOnAccept: true, syncPayments: true, webhookMode: 'live' }), adminUserId,
          orgId, JSON.stringify({ calendarId: 'primary', syncSalesCalls: true, createTasks: true }), adminUserId,
          orgId, JSON.stringify({ activeZaps: 3, ingestAsLead: true }), adminUserId,
          orgId, JSON.stringify({ syncDirection: 'bidirectional', autoMergeDuplicates: true }), adminUserId,
        ]
      );

      // 5. Integration Sync Logs
      const [slackInteg] = await connection.query(`SELECT id FROM integrations WHERE organization_id = ? AND provider = 'slack'`, [orgId]);
      const [stripeInteg] = await connection.query(`SELECT id FROM integrations WHERE organization_id = ? AND provider = 'stripe'`, [orgId]);

      if (slackInteg.length > 0) {
        await connection.query(
          `INSERT INTO integration_sync_logs (organization_id, integration_id, direction, action, status, details_json)
           VALUES 
            (?, ?, 'outbound', 'deal.won_broadcast', 'success', ?),
            (?, ?, 'outbound', 'sla.warning_alert', 'success', ?);`,
          [
            orgId, slackInteg[0].id,
            JSON.stringify({ channel: '#sales-announcements', deal: 'Global Defense Telemetry ($85,000)', notifiedRep: 'Alex Vance' }),
            orgId, slackInteg[0].id,
            JSON.stringify({ channel: '#support-leads', ticket: 'API 504 Gateway Timeout during batch sync', minutesRemaining: 15 }),
          ]
        );
      }

      if (stripeInteg.length > 0) {
        await connection.query(
          `INSERT INTO integration_sync_logs (organization_id, integration_id, direction, action, status, details_json)
           VALUES 
            (?, ?, 'inbound', 'invoice.paid', 'success', ?);`,
          [
            orgId, stripeInteg[0].id,
            JSON.stringify({ stripeInvoiceId: 'in_1M2x4K', customer: 'Acme Corp Global', amount: '$24,500.00', quoteId: 'Q-2026-0042' }),
          ]
        );
      }
    }

    // =====================================================================
    // STEP 15: FORMS, LANDING PAGES & LEAD ROUTING ENGINE (Spec §23, §38)
    // =====================================================================
    console.log('[Seed] Seeding Step 15: Forms, Landing Pages & Lead Routing Rules...');
    const [existingForms] = await connection.query('SELECT id FROM forms WHERE organization_id = ? LIMIT 1', [orgId]);

    if (existingForms.length === 0) {
      // Fetch default pipeline and stage for automated deal creation
      const [pipelines] = await connection.query('SELECT id FROM pipelines WHERE organization_id = ? LIMIT 1', [orgId]);
      const defaultPipelineId = pipelines.length > 0 ? pipelines[0].id : null;
      let defaultStageId = null;
      if (defaultPipelineId) {
        const [stages] = await connection.query('SELECT id FROM pipeline_stages WHERE pipeline_id = ? ORDER BY stage_order ASC LIMIT 1', [defaultPipelineId]);
        defaultStageId = stages.length > 0 ? stages[0].id : null;
      }

      // 1. Enterprise Demo Request Form
      const [form1Res] = await connection.query(
        `INSERT INTO forms (organization_id, workspace_id, name, slug, description, submit_button_text, success_message, redirect_url, status, theme_config_json, captcha_enabled, create_deal_on_submit, deal_pipeline_id, deal_stage_id, default_deal_value, notification_emails_json, total_views, total_submissions, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'published', ?, 0, 1, ?, ?, 35000.00, ?, 342, 48, ?);`,
        [
          orgId, workspaceId,
          'Enterprise Demo Request & Qualification',
          'enterprise-demo',
          'Request a dedicated 1-on-1 architecture walkthrough of the CRM Platform and custom integration capabilities.',
          'Schedule Executive Demo',
          'Thank you! Your demo request has been received. Our solutions engineering team will reach out within 15 minutes.',
          '/thank-you?source=demo',
          JSON.stringify({ primaryColor: '#4f46e5', borderRadius: '0.75rem', darkModeSupport: true }),
          defaultPipelineId, defaultStageId,
          JSON.stringify(['sales-leads@acmecorp.local', 'alex.vance@acmecorp.local']),
          adminUserId,
        ]
      );
      const form1Id = form1Res.insertId;

      // Form 1 Fields
      await connection.query(
        `INSERT INTO form_fields (form_id, label, name, field_type, placeholder, help_text, is_required, default_value, options_json, sort_order, map_to_entity, map_to_field, validation_rules_json)
         VALUES 
          (?, 'First Name', 'first_name', 'text', 'Alex', 'Enter your given name', 1, NULL, NULL, 1, 'contact', 'first_name', NULL),
          (?, 'Last Name', 'last_name', 'text', 'Morgan', 'Enter your family name', 1, NULL, NULL, 2, 'contact', 'last_name', NULL),
          (?, 'Work Email', 'email', 'email', 'alex@company.com', 'We use this to verify business eligibility', 1, NULL, NULL, 3, 'contact', 'email', ?),
          (?, 'Phone Number', 'phone', 'phone', '+1 (555) 234-5678', 'Direct mobile or office line', 0, NULL, NULL, 4, 'contact', 'phone', NULL),
          (?, 'Company Name', 'company_name', 'text', 'Acme Systems Inc.', 'Official legal or trading name', 1, NULL, NULL, 5, 'company', 'name', NULL),
          (?, 'Sales Team Size', 'team_size', 'select', 'Select team size', 'Helps us tailor your demonstration', 0, NULL, ?, 6, 'contact', 'custom_field', NULL),
          (?, 'Estimated Deal Value ($)', 'deal_value', 'number', '50000', 'Approximate budget or deal opportunity size', 0, '25000', NULL, 7, 'deal', 'value', NULL),
          (?, 'Key Business Objectives', 'objectives', 'textarea', 'Tell us about your sales workflows and requirements...', NULL, 0, NULL, NULL, 8, 'deal', 'description', NULL);`,
        [
          form1Id,
          form1Id,
          form1Id, JSON.stringify({ blockFreeEmails: false }),
          form1Id,
          form1Id,
          form1Id, JSON.stringify(['1-10 Reps', '11-50 Reps', '51-200 Reps', '200+ Enterprise Reps']),
          form1Id,
          form1Id,
        ]
      );

      // 2. Whitepaper & Architecture Blueprint Form
      const [form2Res] = await connection.query(
        `INSERT INTO forms (organization_id, workspace_id, name, slug, description, submit_button_text, success_message, redirect_url, status, theme_config_json, captcha_enabled, create_deal_on_submit, deal_pipeline_id, deal_stage_id, default_deal_value, notification_emails_json, total_views, total_submissions, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, NULL, 'published', ?, 0, 0, NULL, NULL, NULL, ?, 180, 24, ?);`,
        [
          orgId, workspaceId,
          '2026 High-Scale Architecture Blueprint',
          'architecture-blueprint',
          'Download the full architectural specification and multi-tenant scaling benchmark report.',
          'Download Whitepaper (PDF)',
          'Success! Check your email inbox for your direct download link.',
          JSON.stringify({ primaryColor: '#059669', borderRadius: '0.5rem', darkModeSupport: true }),
          JSON.stringify(['growth-team@acmecorp.local']),
          adminUserId,
        ]
      );
      const form2Id = form2Res.insertId;

      // Form 2 Fields
      await connection.query(
        `INSERT INTO form_fields (form_id, label, name, field_type, placeholder, help_text, is_required, default_value, options_json, sort_order, map_to_entity, map_to_field, validation_rules_json)
         VALUES 
          (?, 'Full Name', 'first_name', 'text', 'Dr. Evelyn Reed', NULL, 1, NULL, NULL, 1, 'contact', 'first_name', NULL),
          (?, 'Corporate Email', 'email', 'email', 'evelyn@bioresearch.org', 'Download link will be dispatched here', 1, NULL, NULL, 2, 'contact', 'email', NULL),
          (?, 'Job Title', 'job_title', 'text', 'VP of Engineering', NULL, 0, NULL, NULL, 3, 'contact', 'job_title', NULL);`,
        [form2Id, form2Id, form2Id]
      );

      // 3. Multi-Tenant Lead Routing Rules (Spec §38)
      await connection.query(
        `INSERT INTO lead_routing_rules (organization_id, workspace_id, name, description, routing_type, priority, conditions_json, assignee_user_ids_json, current_index, is_active)
         VALUES 
          (?, ?, 'North America Enterprise Deal Desk', 'Routes enterprise opportunities with budget >= $50k to senior sales executive.', 'deal_size', 1, ?, ?, 0, 1),
          (?, ?, 'General Inbound Round-Robin Reps', 'Evenly distributes all incoming qualified website leads across available account reps.', 'round_robin', 10, ?, ?, 0, 1),
          (?, ?, 'Global Fallback Lead Handler', 'Fallback assignment for unconverted or uncategorized leads.', 'fallback', 99, ?, ?, 0, 1);`,
        [
          orgId, workspaceId,
          JSON.stringify([{ field: 'deal_value', operator: 'greater_than_or_equal', value: 50000 }]),
          JSON.stringify([adminUserId]),
          orgId, workspaceId,
          JSON.stringify([]),
          JSON.stringify([adminUserId]),
          orgId, workspaceId,
          JSON.stringify([]),
          JSON.stringify([adminUserId]),
        ]
      );

      // 4. Hosted Landing Pages (Spec §23)
      await connection.query(
        `INSERT INTO landing_pages (organization_id, workspace_id, title, slug, headline, subheadline, hero_cta_text, body_content, form_id, seo_meta_json, theme_config_json, status, total_views, total_conversions, created_by)
         VALUES 
          (?, ?, 'Enterprise CRM Platform 2026 - Accelerated Revenue Engine', 'enterprise-suite-2026', 'Accelerate High-Velocity Sales With AI-Powered CRM', 'Unify sales pipelines, CPQ quote workflows, omnichannel support desk, and developer webhooks in one zero-friction platform.', 'Book Your Live Platform Demo', ?, ?, ?, ?, 'published', 420, 68, ?),
          (?, ?, 'High-Scale Multi-Tenant System Blueprint', 'whitepaper-crm-2026', 'Read the High-Concurrency CRM Engineering Whitepaper', 'How we architected a 68-table multi-tenant CRM with sub-millisecond query execution and zero data leakage.', 'Get Free Architecture Whitepaper', ?, ?, ?, ?, 'published', 250, 42, ?);`,
        [
          orgId, workspaceId,
          '### Why Modern Revenue Teams Choose Our CRM\n\n- **Unified Data Fabric:** Real-time synchronization across leads, accounts, CPQ, and ticket escalations.\n- **Developer-First Extensibility:** Webhooks, scoped HMAC API keys, and event bus integrations.\n- **Built-in Dark & Light Mode:** Optimized for round-the-clock sales and support operations.',
          form1Id,
          JSON.stringify({ title: 'Enterprise CRM Platform 2026', description: 'Next-gen enterprise CRM platform with native CPQ and developer APIs' }),
          JSON.stringify({ theme: 'modern-indigo', containerWidth: 'max-w-4xl' }),
          adminUserId,
          orgId, workspaceId,
          '### Engineering Whitepaper Highlights\n\n- Multi-tenant partitioning strategies with foreign key integrity.\n- HMAC-SHA256 authenticated webhook dispatches.\n- Automated round-robin lead allocation algorithms.',
          form2Id,
          JSON.stringify({ title: 'CRM Architecture Whitepaper', description: 'Deep-dive architectural paper for enterprise engineering teams' }),
          JSON.stringify({ theme: 'emerald-focus', containerWidth: 'max-w-3xl' }),
          adminUserId,
        ]
      );

      // 5. Sample Form Submissions
      const [sampleContact] = await connection.query('SELECT id, company_id FROM contacts WHERE organization_id = ? LIMIT 1', [orgId]);
      const contactId = sampleContact.length > 0 ? sampleContact[0].id : null;
      const companyId = sampleContact.length > 0 ? sampleContact[0].company_id : null;

      await connection.query(
        `INSERT INTO form_submissions (form_id, organization_id, workspace_id, submitted_data_json, contact_id, company_id, deal_id, ip_address, user_agent, referrer_url, utm_source, utm_medium, utm_campaign, status, routing_result_json)
         VALUES 
          (?, ?, ?, ?, ?, ?, NULL, '198.51.100.42', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 'https://google.com/search?q=enterprise+crm', 'google', 'cpc', 'q1_demo_campaign', 'processed', ?),
          (?, ?, ?, ?, ?, ?, NULL, '203.0.113.19', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 'https://linkedin.com/feed', 'linkedin', 'social', 'cxo_thought_leadership', 'processed', ?);`,
        [
          form1Id, orgId, workspaceId,
          JSON.stringify({
            first_name: 'Sophia',
            last_name: 'Kowalski',
            email: 'sophia.kowalski@quantumdynamics.org',
            phone: '+1 (555) 890-1234',
            company_name: 'Quantum Dynamics',
            team_size: '51-200 Reps',
            deal_value: '60000',
            objectives: 'Migrating 85 reps off legacy CRM to unify pipeline tracking and support SLAs.',
          }),
          contactId, companyId,
          JSON.stringify({ assignedUserId: adminUserId, matchedRule: 'North America Enterprise Deal Desk', ruleType: 'deal_size' }),
          form2Id, orgId, workspaceId,
          JSON.stringify({
            first_name: 'David',
            email: 'david.chen@horizoncloud.net',
            job_title: 'Chief Technology Officer',
          }),
          contactId, companyId,
          JSON.stringify({ assignedUserId: adminUserId, matchedRule: 'General Inbound Round-Robin Reps', ruleType: 'round_robin' }),
        ]
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
