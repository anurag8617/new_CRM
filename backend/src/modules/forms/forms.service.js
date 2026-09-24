import { getPool } from '../../config/db.js';
import { eventBus } from '../../services/eventBus.js';

/**
 * -------------------------------------------------------------------------
 * HELPER: Slugify a string
 * -------------------------------------------------------------------------
 */
const slugify = (text) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-');
};

/**
 * -------------------------------------------------------------------------
 * 1. FORMS CRUD (§23 Visual Form Designer)
 * -------------------------------------------------------------------------
 */

export const listForms = async (orgId) => {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT f.id, f.organization_id, f.workspace_id, f.name, f.slug, f.description,
            f.submit_button_text, f.success_message, f.redirect_url, f.status,
            f.theme_config_json, f.captcha_enabled, f.create_deal_on_submit,
            f.deal_pipeline_id, f.deal_stage_id, f.default_deal_value,
            f.notification_emails_json, f.total_views, f.total_submissions,
            f.created_by, f.created_at, f.updated_at,
            COUNT(ff.id) as field_count,
            p.name as pipeline_name,
            ps.name as stage_name
     FROM forms f
     LEFT JOIN form_fields ff ON f.id = ff.form_id
     LEFT JOIN pipelines p ON f.deal_pipeline_id = p.id
     LEFT JOIN pipeline_stages ps ON f.deal_stage_id = ps.id
     WHERE f.organization_id = ?
     GROUP BY f.id
     ORDER BY f.created_at DESC`,
    [orgId]
  );

  return rows.map((row) => ({
    ...row,
    conversion_rate:
      row.total_views > 0
        ? parseFloat(((row.total_submissions / row.total_views) * 100).toFixed(1))
        : 0.0,
  }));
};

export const getFormById = async (orgId, formId) => {
  const pool = getPool();
  const [forms] = await pool.query(
    `SELECT f.*, p.name as pipeline_name, ps.name as stage_name
     FROM forms f
     LEFT JOIN pipelines p ON f.deal_pipeline_id = p.id
     LEFT JOIN pipeline_stages ps ON f.deal_stage_id = ps.id
     WHERE f.id = ? AND f.organization_id = ?`,
    [formId, orgId]
  );

  if (forms.length === 0) return null;
  const form = forms[0];

  const [fields] = await pool.query(
    `SELECT * FROM form_fields WHERE form_id = ? ORDER BY sort_order ASC, id ASC`,
    [formId]
  );

  return {
    ...form,
    fields,
  };
};

export const getPublicFormBySlug = async (slug) => {
  const pool = getPool();
  const [forms] = await pool.query(
    `SELECT id, organization_id, workspace_id, name, slug, description,
            submit_button_text, success_message, redirect_url, status,
            theme_config_json, captcha_enabled, create_deal_on_submit
     FROM forms
     WHERE slug = ? AND status = 'published'`,
    [slug]
  );

  if (forms.length === 0) return null;
  const form = forms[0];

  // Atomically increment views counter
  await pool.query('UPDATE forms SET total_views = total_views + 1 WHERE id = ?', [form.id]);

  const [fields] = await pool.query(
    `SELECT id, label, name, field_type, placeholder, help_text, is_required,
            default_value, options_json, sort_order, validation_rules_json
     FROM form_fields
     WHERE form_id = ?
     ORDER BY sort_order ASC, id ASC`,
    [form.id]
  );

  return {
    ...form,
    fields,
  };
};

export const createForm = async (orgId, workspaceId, userId, data) => {
  const pool = getPool();
  const slug = data.slug ? slugify(data.slug) : `${slugify(data.name)}-${Date.now().toString(36)}`;

  const [result] = await pool.query(
    `INSERT INTO forms (
       organization_id, workspace_id, name, slug, description,
       submit_button_text, success_message, redirect_url, status,
       theme_config_json, captcha_enabled, create_deal_on_submit,
       deal_pipeline_id, deal_stage_id, default_deal_value,
       notification_emails_json, created_by
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      orgId,
      workspaceId,
      data.name.trim(),
      slug,
      data.description || null,
      data.submit_button_text || 'Submit',
      data.success_message || 'Thank you! Your submission has been received.',
      data.redirect_url || null,
      data.status || 'published',
      data.theme_config ? JSON.stringify(data.theme_config) : JSON.stringify({ primaryColor: '#4f46e5', borderRadius: '0.5rem' }),
      data.captcha_enabled ? 1 : 0,
      data.create_deal_on_submit ? 1 : 0,
      data.deal_pipeline_id || null,
      data.deal_stage_id || null,
      data.default_deal_value || null,
      data.notification_emails ? JSON.stringify(data.notification_emails) : null,
      userId,
    ]
  );

  const formId = result.insertId;

  // Insert form fields
  if (Array.isArray(data.fields) && data.fields.length > 0) {
    for (let i = 0; i < data.fields.length; i++) {
      const field = data.fields[i];
      await pool.query(
        `INSERT INTO form_fields (
           form_id, label, name, field_type, placeholder, help_text,
           is_required, default_value, options_json, sort_order,
           map_to_entity, map_to_field, validation_rules_json
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          formId,
          field.label || 'Field',
          field.name || `field_${i + 1}`,
          field.field_type || 'text',
          field.placeholder || null,
          field.help_text || null,
          field.is_required ? 1 : 0,
          field.default_value || null,
          field.options ? JSON.stringify(field.options) : null,
          field.sort_order || i + 1,
          field.map_to_entity || 'contact',
          field.map_to_field || 'first_name',
          field.validation_rules ? JSON.stringify(field.validation_rules) : null,
        ]
      );
    }
  }

  return getFormById(orgId, formId);
};

export const updateForm = async (orgId, formId, data) => {
  const pool = getPool();
  const existing = await getFormById(orgId, formId);
  if (!existing) return null;

  const slug = data.slug ? slugify(data.slug) : existing.slug;

  await pool.query(
    `UPDATE forms SET
       name = ?,
       slug = ?,
       description = ?,
       submit_button_text = ?,
       success_message = ?,
       redirect_url = ?,
       status = ?,
       theme_config_json = ?,
       captcha_enabled = ?,
       create_deal_on_submit = ?,
       deal_pipeline_id = ?,
       deal_stage_id = ?,
       default_deal_value = ?,
       notification_emails_json = ?
     WHERE id = ? AND organization_id = ?`,
    [
      data.name !== undefined ? data.name.trim() : existing.name,
      slug,
      data.description !== undefined ? data.description : existing.description,
      data.submit_button_text !== undefined ? data.submit_button_text : existing.submit_button_text,
      data.success_message !== undefined ? data.success_message : existing.success_message,
      data.redirect_url !== undefined ? data.redirect_url : existing.redirect_url,
      data.status !== undefined ? data.status : existing.status,
      data.theme_config ? JSON.stringify(data.theme_config) : JSON.stringify(existing.theme_config_json || {}),
      data.captcha_enabled !== undefined ? (data.captcha_enabled ? 1 : 0) : existing.captcha_enabled,
      data.create_deal_on_submit !== undefined ? (data.create_deal_on_submit ? 1 : 0) : existing.create_deal_on_submit,
      data.deal_pipeline_id !== undefined ? data.deal_pipeline_id : existing.deal_pipeline_id,
      data.deal_stage_id !== undefined ? data.deal_stage_id : existing.deal_stage_id,
      data.default_deal_value !== undefined ? data.default_deal_value : existing.default_deal_value,
      data.notification_emails ? JSON.stringify(data.notification_emails) : JSON.stringify(existing.notification_emails_json || []),
      formId,
      orgId,
    ]
  );

  // Synchronize fields if supplied
  if (Array.isArray(data.fields)) {
    await pool.query('DELETE FROM form_fields WHERE form_id = ?', [formId]);
    for (let i = 0; i < data.fields.length; i++) {
      const field = data.fields[i];
      await pool.query(
        `INSERT INTO form_fields (
           form_id, label, name, field_type, placeholder, help_text,
           is_required, default_value, options_json, sort_order,
           map_to_entity, map_to_field, validation_rules_json
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          formId,
          field.label || 'Field',
          field.name || `field_${i + 1}`,
          field.field_type || 'text',
          field.placeholder || null,
          field.help_text || null,
          field.is_required ? 1 : 0,
          field.default_value || null,
          field.options ? JSON.stringify(field.options) : null,
          field.sort_order || i + 1,
          field.map_to_entity || 'contact',
          field.map_to_field || 'first_name',
          field.validation_rules ? JSON.stringify(field.validation_rules) : null,
        ]
      );
    }
  }

  return getFormById(orgId, formId);
};

export const deleteForm = async (orgId, formId) => {
  const pool = getPool();
  const [result] = await pool.query('DELETE FROM forms WHERE id = ? AND organization_id = ?', [formId, orgId]);
  return result.affectedRows > 0;
};

/**
 * -------------------------------------------------------------------------
 * 2. AUTOMATED LEAD ROUTING ENGINE (§38 Multi-Tenant Round-Robin)
 * -------------------------------------------------------------------------
 */

export const listRoutingRules = async (orgId) => {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT * FROM lead_routing_rules
     WHERE organization_id = ?
     ORDER BY priority ASC, id ASC`,
    [orgId]
  );
  return rows;
};

export const createRoutingRule = async (orgId, workspaceId, data) => {
  const pool = getPool();
  const [result] = await pool.query(
    `INSERT INTO lead_routing_rules (
       organization_id, workspace_id, name, description, routing_type,
       priority, conditions_json, assignee_user_ids_json, current_index, is_active
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
    [
      orgId,
      workspaceId,
      data.name.trim(),
      data.description || null,
      data.routing_type || 'round_robin',
      data.priority !== undefined ? data.priority : 10,
      data.conditions ? JSON.stringify(data.conditions) : JSON.stringify([]),
      JSON.stringify(data.assignee_user_ids || []),
      data.is_active !== undefined ? (data.is_active ? 1 : 0) : 1,
    ]
  );
  return { id: result.insertId, ...data };
};

export const updateRoutingRule = async (orgId, ruleId, data) => {
  const pool = getPool();
  await pool.query(
    `UPDATE lead_routing_rules SET
       name = COALESCE(?, name),
       description = COALESCE(?, description),
       routing_type = COALESCE(?, routing_type),
       priority = COALESCE(?, priority),
       conditions_json = COALESCE(?, conditions_json),
       assignee_user_ids_json = COALESCE(?, assignee_user_ids_json),
       is_active = COALESCE(?, is_active)
     WHERE id = ? AND organization_id = ?`,
    [
      data.name,
      data.description,
      data.routing_type,
      data.priority,
      data.conditions ? JSON.stringify(data.conditions) : null,
      data.assignee_user_ids ? JSON.stringify(data.assignee_user_ids) : null,
      data.is_active !== undefined ? (data.is_active ? 1 : 0) : null,
      ruleId,
      orgId,
    ]
  );
  const [rows] = await pool.query('SELECT * FROM lead_routing_rules WHERE id = ?', [ruleId]);
  return rows[0] || null;
};

export const deleteRoutingRule = async (orgId, ruleId) => {
  const pool = getPool();
  const [result] = await pool.query('DELETE FROM lead_routing_rules WHERE id = ? AND organization_id = ?', [ruleId, orgId]);
  return result.affectedRows > 0;
};

/**
 * Evaluate routing rules to select an assignee user for an incoming lead
 */
export const routeLead = async (orgId, leadData, commitAdvance = true) => {
  const pool = getPool();
  const [rules] = await pool.query(
    `SELECT * FROM lead_routing_rules
     WHERE organization_id = ? AND is_active = 1
     ORDER BY priority ASC, id ASC`,
    [orgId]
  );

  for (const rule of rules) {
    let conditions = [];
    try {
      conditions = typeof rule.conditions_json === 'string' ? JSON.parse(rule.conditions_json) : (rule.conditions_json || []);
    } catch {
      conditions = [];
    }

    let assignees = [];
    try {
      assignees = typeof rule.assignee_user_ids_json === 'string' ? JSON.parse(rule.assignee_user_ids_json) : (rule.assignee_user_ids_json || []);
    } catch {
      assignees = [];
    }

    if (assignees.length === 0) continue;

    // Check conditions
    let matched = true;
    for (const cond of conditions) {
      const val = leadData[cond.field];
      if (cond.operator === 'equals' && String(val).toLowerCase() !== String(cond.value).toLowerCase()) {
        matched = false;
        break;
      }
      if (cond.operator === 'greater_than_or_equal' && (parseFloat(val) || 0) < parseFloat(cond.value)) {
        matched = false;
        break;
      }
      if (cond.operator === 'contains' && !String(val || '').toLowerCase().includes(String(cond.value).toLowerCase())) {
        matched = false;
        break;
      }
    }

    if (matched) {
      const curIdx = rule.current_index % assignees.length;
      const assignedUserId = assignees[curIdx];

      if (commitAdvance) {
        const nextIdx = (curIdx + 1) % assignees.length;
        await pool.query('UPDATE lead_routing_rules SET current_index = ? WHERE id = ?', [nextIdx, rule.id]);
      }

      return {
        matched: true,
        ruleId: rule.id,
        ruleName: rule.name,
        routingType: rule.routing_type,
        assignedUserId,
      };
    }
  }

  // Fallback to org default admin
  const [defaultUser] = await pool.query('SELECT id FROM users WHERE organization_id = ? ORDER BY id ASC LIMIT 1', [orgId]);
  return {
    matched: false,
    ruleId: null,
    ruleName: 'Default Fallback',
    routingType: 'fallback',
    assignedUserId: defaultUser.length > 0 ? defaultUser[0].id : null,
  };
};

/**
 * -------------------------------------------------------------------------
 * 3. PUBLIC FORM SUBMISSION INGESTION (§23, §38, §39 Lead Engine)
 * -------------------------------------------------------------------------
 */

export const submitPublicForm = async (slug, submittedData, metadata = {}) => {
  const pool = getPool();

  // 1. Fetch form
  const [forms] = await pool.query('SELECT * FROM forms WHERE slug = ? AND status = "published"', [slug]);
  if (forms.length === 0) {
    throw new Error('Form not found or is currently unavailable.');
  }
  const form = forms[0];
  const orgId = form.organization_id;
  const workspaceId = form.workspace_id;

  // 2. Fetch form fields
  const [fields] = await pool.query('SELECT * FROM form_fields WHERE form_id = ? ORDER BY sort_order ASC', [form.id]);

  // 3. Validate required fields
  for (const field of fields) {
    if (field.is_required && (!submittedData[field.name] || String(submittedData[field.name]).trim() === '')) {
      throw new Error(`Field "${field.label}" is required.`);
    }
  }

  // 4. Extract mapped entity properties
  let email = null;
  let firstName = null;
  let lastName = null;
  let phone = null;
  let companyName = null;
  let dealValue = form.default_deal_value ? parseFloat(form.default_deal_value) : null;
  let dealDescription = null;

  for (const field of fields) {
    const val = submittedData[field.name];
    if (val === undefined || val === null) continue;

    if (field.map_to_entity === 'contact') {
      if (field.map_to_field === 'email') email = String(val).trim().toLowerCase();
      else if (field.map_to_field === 'first_name') firstName = String(val).trim();
      else if (field.map_to_field === 'last_name') lastName = String(val).trim();
      else if (field.map_to_field === 'phone') phone = String(val).trim();
    } else if (field.map_to_entity === 'company') {
      if (field.map_to_field === 'name') companyName = String(val).trim();
    } else if (field.map_to_entity === 'deal') {
      if (field.map_to_field === 'value') dealValue = parseFloat(val) || dealValue;
      else if (field.map_to_field === 'description') dealDescription = String(val).trim();
    }
  }

  // Fallbacks if not explicitly mapped
  if (!email && submittedData.email) email = String(submittedData.email).trim().toLowerCase();
  if (!firstName && submittedData.first_name) firstName = String(submittedData.first_name).trim();
  if (!lastName && submittedData.last_name) lastName = String(submittedData.last_name).trim();
  if (!phone && submittedData.phone) phone = String(submittedData.phone).trim();
  if (!companyName && submittedData.company_name) companyName = String(submittedData.company_name).trim();
  if (!companyName && submittedData.company) companyName = String(submittedData.company).trim();
  if (!firstName && !lastName && submittedData.name) {
    const parts = String(submittedData.name).trim().split(' ');
    firstName = parts[0];
    lastName = parts.slice(1).join(' ') || 'Lead';
  }

  // 5. Automated Lead Routing (§38)
  const routing = await routeLead(orgId, {
    ...submittedData,
    deal_value: dealValue,
    company_name: companyName,
  });

  const assignedUserId = routing.assignedUserId || form.created_by;

  // 6. Contact Deduplication & Creation (§39)
  let contactId = null;
  let companyId = null;

  // Company Match / Create
  if (companyName) {
    const [existingCo] = await pool.query(
      'SELECT id FROM companies WHERE organization_id = ? AND LOWER(name) = ? LIMIT 1',
      [orgId, companyName.toLowerCase()]
    );
    if (existingCo.length > 0) {
      companyId = existingCo[0].id;
    } else {
      const [newCo] = await pool.query(
        `INSERT INTO companies (organization_id, name, domain, owner_id)
         VALUES (?, ?, ?, ?)`,
        [orgId, companyName, email ? email.split('@')[1] : null, assignedUserId]
      );
      companyId = newCo.insertId;
    }
  }

  // Contact Match / Create
  if (email) {
    const [existingContact] = await pool.query(
      'SELECT id, company_id, owner_id FROM contacts WHERE organization_id = ? AND LOWER(email) = ? LIMIT 1',
      [orgId, email]
    );

    if (existingContact.length > 0) {
      contactId = existingContact[0].id;
      // Update contact details
      await pool.query(
        `UPDATE contacts SET
           phone = COALESCE(?, phone),
           company_id = COALESCE(?, company_id),
           lifecycle_stage = 'lead'
         WHERE id = ?`,
        [phone, companyId, contactId]
      );
    } else {
      const [newContact] = await pool.query(
        `INSERT INTO contacts (
           organization_id, first_name, last_name, email, phone, company_id,
           owner_id, lifecycle_stage, lead_status, source
         ) VALUES (?, ?, ?, ?, ?, ?, ?, 'lead', 'new', 'Form Submission')`,
        [
          orgId,
          firstName || 'Inbound',
          lastName || 'Lead',
          email,
          phone,
          companyId,
          assignedUserId,
        ]
      );
      contactId = newContact.insertId;
    }
  }

  // 7. Automated Deal Generation (if enabled)
  let dealId = null;
  if (form.create_deal_on_submit) {
    let pipelineId = form.deal_pipeline_id;
    let stageId = form.deal_stage_id;

    if (!pipelineId) {
      const [dPipe] = await pool.query('SELECT id FROM pipelines WHERE organization_id = ? LIMIT 1', [orgId]);
      if (dPipe.length > 0) pipelineId = dPipe[0].id;
    }
    if (pipelineId && !stageId) {
      const [dStage] = await pool.query('SELECT id FROM pipeline_stages WHERE pipeline_id = ? ORDER BY stage_order ASC LIMIT 1', [pipelineId]);
      if (dStage.length > 0) stageId = dStage[0].id;
    }

    if (pipelineId && stageId) {
      const dealTitle = `${companyName || (firstName ? `${firstName} ${lastName}` : 'Inbound Lead')} - ${form.name}`;
      const [newDeal] = await pool.query(
        `INSERT INTO deals (
           organization_id, pipeline_id, stage_id, title, value,
           currency, expected_close_date, company_id,
           contact_id, owner_id, status
         ) VALUES (?, ?, ?, ?, ?, 'USD', DATE_ADD(CURRENT_DATE, INTERVAL 30 DAY), ?, ?, ?, 'open')`,
        [
          orgId,
          pipelineId,
          stageId,
          dealTitle,
          dealValue || 15000.0,
          companyId,
          contactId,
          assignedUserId,
        ]
      );
      dealId = newDeal.insertId;
    }
  }

  // 8. Record Form Submission
  const [subRes] = await pool.query(
    `INSERT INTO form_submissions (
       form_id, organization_id, workspace_id, submitted_data_json,
       contact_id, company_id, deal_id, ip_address, user_agent,
       referrer_url, utm_source, utm_medium, utm_campaign, status, routing_result_json
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'processed', ?)`,
    [
      form.id,
      orgId,
      workspaceId,
      JSON.stringify(submittedData),
      contactId,
      companyId,
      dealId,
      metadata.ipAddress || null,
      metadata.userAgent || null,
      metadata.referrer || null,
      metadata.utmSource || null,
      metadata.utmMedium || null,
      metadata.utmCampaign || null,
      JSON.stringify(routing),
    ]
  );
  const submissionId = subRes.insertId;

  // 9. Increment form submission counter
  await pool.query('UPDATE forms SET total_submissions = total_submissions + 1 WHERE id = ?', [form.id]);

  // 10. Record Timeline Activity
  if (contactId) {
    await pool.query(
      `INSERT INTO activities (
         organization_id, record_type, record_id, activity_type, payload_json, actor_id
       ) VALUES (?, 'contact', ?, 'task', ?, ?)`,
      [
        orgId,
        contactId,
        JSON.stringify({
          subject: `Form Submission: ${form.name}`,
          body: `Lead submitted form "${form.name}". Routed to sales rep via rule: ${routing.ruleName || 'Default'}.`,
          dealId,
          formId: form.id,
        }),
        assignedUserId,
      ]
    );
  }

  // 11. Dispatch Event Bus for Webhook Broadcast & Zapier
  eventBus.emit('form.submitted', {
    formId: form.id,
    formName: form.name,
    submissionId,
    contactId,
    companyId,
    dealId,
    assignedUserId,
    routing,
    submittedData,
  });

  return {
    success: true,
    message: form.success_message || 'Thank you! Your submission has been processed.',
    redirectUrl: form.redirect_url || null,
    submissionId,
    contactId,
    dealId,
    assignedUserId,
    routing,
  };
};

/**
 * -------------------------------------------------------------------------
 * 4. SUBMISSIONS LISTING & INSPECTION (§23 Submission History)
 * -------------------------------------------------------------------------
 */

export const listSubmissions = async (orgId, { formId = null, limit = 50, offset = 0 } = {}) => {
  const pool = getPool();
  let query = `
    SELECT fs.id, fs.form_id, fs.organization_id, fs.workspace_id,
           fs.submitted_data_json, fs.contact_id, fs.company_id, fs.deal_id,
           fs.ip_address, fs.user_agent, fs.referrer_url, fs.utm_source,
           fs.utm_medium, fs.utm_campaign, fs.status, fs.routing_result_json,
           fs.created_at,
           f.name as form_name, f.slug as form_slug,
           c.first_name as contact_first_name, c.last_name as contact_last_name, c.email as contact_email,
           co.name as company_name,
           d.title as deal_title, d.value as deal_value,
           u.first_name as assigned_rep_first_name, u.last_name as assigned_rep_last_name, u.email as assigned_rep_email
    FROM form_submissions fs
    JOIN forms f ON fs.form_id = f.id
    LEFT JOIN contacts c ON fs.contact_id = c.id
    LEFT JOIN companies co ON fs.company_id = co.id
    LEFT JOIN deals d ON fs.deal_id = d.id
    LEFT JOIN users u ON d.owner_id = u.id OR c.owner_id = u.id
    WHERE fs.organization_id = ?
  `;
  const params = [orgId];

  if (formId) {
    query += ' AND fs.form_id = ?';
    params.push(formId);
  }

  query += ' ORDER BY fs.created_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit, 10), parseInt(offset, 10));

  const [rows] = await pool.query(query, params);
  return rows;
};

export const getSubmissionById = async (orgId, submissionId) => {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT fs.*, f.name as form_name, f.slug as form_slug,
            c.first_name as contact_first_name, c.last_name as contact_last_name, c.email as contact_email,
            co.name as company_name,
            d.title as deal_title, d.value as deal_value
     FROM form_submissions fs
     JOIN forms f ON fs.form_id = f.id
     LEFT JOIN contacts c ON fs.contact_id = c.id
     LEFT JOIN companies co ON fs.company_id = co.id
     LEFT JOIN deals d ON fs.deal_id = d.id
     WHERE fs.id = ? AND fs.organization_id = ?`,
    [submissionId, orgId]
  );
  return rows[0] || null;
};

/**
 * -------------------------------------------------------------------------
 * 5. LANDING PAGES ENGINE (§23 Hosted Pages)
 * -------------------------------------------------------------------------
 */

export const listLandingPages = async (orgId) => {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT lp.*, f.name as form_name, f.slug as form_slug,
            u.first_name as creator_first_name, u.last_name as creator_last_name
     FROM landing_pages lp
     LEFT JOIN forms f ON lp.form_id = f.id
     LEFT JOIN users u ON lp.created_by = u.id
     WHERE lp.organization_id = ?
     ORDER BY lp.created_at DESC`,
    [orgId]
  );

  return rows.map((page) => ({
    ...page,
    conversion_rate:
      page.total_views > 0
        ? parseFloat(((page.total_conversions / page.total_views) * 100).toFixed(1))
        : 0.0,
  }));
};

export const getLandingPageById = async (orgId, pageId) => {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT lp.*, f.name as form_name, f.slug as form_slug
     FROM landing_pages lp
     LEFT JOIN forms f ON lp.form_id = f.id
     WHERE lp.id = ? AND lp.organization_id = ?`,
    [pageId, orgId]
  );
  return rows[0] || null;
};

export const getPublicLandingPage = async (slug) => {
  const pool = getPool();
  const [pages] = await pool.query(
    `SELECT lp.id, lp.organization_id, lp.workspace_id, lp.title, lp.slug,
            lp.headline, lp.subheadline, lp.hero_cta_text, lp.body_content,
            lp.form_id, lp.seo_meta_json, lp.theme_config_json, lp.status,
            f.name as form_name, f.slug as form_slug, f.submit_button_text, f.success_message, f.theme_config_json as form_theme_config
     FROM landing_pages lp
     LEFT JOIN forms f ON lp.form_id = f.id
     WHERE lp.slug = ? AND lp.status = 'published'`,
    [slug]
  );

  if (pages.length === 0) return null;
  const page = pages[0];

  // Increment landing page views
  await pool.query('UPDATE landing_pages SET total_views = total_views + 1 WHERE id = ?', [page.id]);

  let formFields = [];
  if (page.form_id) {
    const [fields] = await pool.query(
      `SELECT id, label, name, field_type, placeholder, help_text, is_required, default_value, options_json, sort_order
       FROM form_fields
       WHERE form_id = ?
       ORDER BY sort_order ASC, id ASC`,
      [page.form_id]
    );
    formFields = fields;
  }

  return {
    ...page,
    form: page.form_id
      ? {
          id: page.form_id,
          name: page.form_name,
          slug: page.form_slug,
          submit_button_text: page.submit_button_text,
          success_message: page.success_message,
          theme_config: page.form_theme_config,
          fields: formFields,
        }
      : null,
  };
};

export const createLandingPage = async (orgId, workspaceId, userId, data) => {
  const pool = getPool();
  const slug = data.slug ? slugify(data.slug) : `${slugify(data.title)}-${Date.now().toString(36)}`;

  const [result] = await pool.query(
    `INSERT INTO landing_pages (
       organization_id, workspace_id, title, slug, headline, subheadline,
       hero_cta_text, body_content, form_id, seo_meta_json, theme_config_json,
       status, created_by
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      orgId,
      workspaceId,
      data.title.trim(),
      slug,
      data.headline || data.title.trim(),
      data.subheadline || null,
      data.hero_cta_text || 'Get Started Free',
      data.body_content || null,
      data.form_id || null,
      data.seo_meta ? JSON.stringify(data.seo_meta) : null,
      data.theme_config ? JSON.stringify(data.theme_config) : JSON.stringify({ theme: 'modern-indigo' }),
      data.status || 'published',
      userId,
    ]
  );

  return getLandingPageById(orgId, result.insertId);
};

export const updateLandingPage = async (orgId, pageId, data) => {
  const pool = getPool();
  const existing = await getLandingPageById(orgId, pageId);
  if (!existing) return null;

  const slug = data.slug ? slugify(data.slug) : existing.slug;

  await pool.query(
    `UPDATE landing_pages SET
       title = COALESCE(?, title),
       slug = ?,
       headline = COALESCE(?, headline),
       subheadline = COALESCE(?, subheadline),
       hero_cta_text = COALESCE(?, hero_cta_text),
       body_content = COALESCE(?, body_content),
       form_id = COALESCE(?, form_id),
       seo_meta_json = COALESCE(?, seo_meta_json),
       theme_config_json = COALESCE(?, theme_config_json),
       status = COALESCE(?, status)
     WHERE id = ? AND organization_id = ?`,
    [
      data.title,
      slug,
      data.headline,
      data.subheadline,
      data.hero_cta_text,
      data.body_content,
      data.form_id,
      data.seo_meta ? JSON.stringify(data.seo_meta) : null,
      data.theme_config ? JSON.stringify(data.theme_config) : null,
      data.status,
      pageId,
      orgId,
    ]
  );

  return getLandingPageById(orgId, pageId);
};

export const deleteLandingPage = async (orgId, pageId) => {
  const pool = getPool();
  const [result] = await pool.query('DELETE FROM landing_pages WHERE id = ? AND organization_id = ?', [pageId, orgId]);
  return result.affectedRows > 0;
};
