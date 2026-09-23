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
