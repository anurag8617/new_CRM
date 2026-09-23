import { getPool } from '../../config/db.js';
import { eventBus } from '../../services/eventBus.js';

export class ContactsService {
  /**
   * List contacts with multi-tenant filtering, stage/status filters, and search
   */
  static async list({
    orgId,
    search = '',
    stage = null,
    status = null,
    companyId = null,
    page = 1,
    limit = 20,
    sortBy = 'created_at',
    sortOrder = 'DESC',
  }) {
    const pool = getPool();
    const offset = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);
    const parsedLimit = parseInt(limit, 10);

    let whereClause = 'WHERE ct.organization_id = ?';
    const params = [orgId];

    if (search && search.trim() !== '') {
      whereClause += ' AND (ct.first_name LIKE ? OR ct.last_name LIKE ? OR ct.email LIKE ? OR ct.job_title LIKE ? OR comp.name LIKE ?)';
      const s = `%${search.trim()}%`;
      params.push(s, s, s, s, s);
    }

    if (stage) {
      whereClause += ' AND ct.lifecycle_stage = ?';
      params.push(stage);
    }

    if (status) {
      whereClause += ' AND ct.lead_status = ?';
      params.push(status);
    }

    if (companyId) {
      whereClause += ' AND ct.company_id = ?';
      params.push(companyId);
    }

    const allowedSort = ['first_name', 'last_name', 'email', 'created_at', 'lifecycle_stage', 'lead_status'];
    const safeSort = allowedSort.includes(sortBy) ? `ct.${sortBy}` : 'ct.created_at';
    const safeOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    // Count query
    const [countResult] = await pool.query(
      `SELECT COUNT(*) AS total 
       FROM contacts ct 
       LEFT JOIN companies comp ON ct.company_id = comp.id
       ${whereClause};`,
      params
    );
    const total = countResult[0].total;

    // Fetch contacts
    const [contacts] = await pool.query(
      `SELECT ct.id, ct.organization_id, ct.company_id, ct.owner_id,
              ct.first_name, ct.last_name, ct.email, ct.phone, ct.job_title,
              ct.lifecycle_stage, ct.lead_status, ct.source, ct.created_at, ct.updated_at,
              comp.name AS company_name, comp.domain AS company_domain,
              CONCAT(u.first_name, ' ', u.last_name) AS owner_name
       FROM contacts ct
       LEFT JOIN companies comp ON ct.company_id = comp.id
       LEFT JOIN users u ON ct.owner_id = u.id
       ${whereClause}
       ORDER BY ${safeSort} ${safeOrder}
       LIMIT ? OFFSET ?;`,
      [...params, parsedLimit, offset]
    );

    return {
      contacts,
      pagination: {
        page: parseInt(page, 10),
        limit: parsedLimit,
        total,
        totalPages: Math.ceil(total / parsedLimit),
      },
    };
  }

  /**
   * Get single contact by ID with recent timeline activities
   */
  static async getById({ orgId, id }) {
    const pool = getPool();

    const [rows] = await pool.query(
      `SELECT ct.*,
              comp.name AS company_name, comp.domain AS company_domain, comp.industry AS company_industry,
              CONCAT(u.first_name, ' ', u.last_name) AS owner_name
       FROM contacts ct
       LEFT JOIN companies comp ON ct.company_id = comp.id
       LEFT JOIN users u ON ct.owner_id = u.id
       WHERE ct.id = ? AND ct.organization_id = ?
       LIMIT 1;`,
      [id, orgId]
    );

    if (rows.length === 0) {
      throw new Error('Contact not found');
    }

    const contact = rows[0];

    // Fetch timeline activities (Spec §10)
    const [activities] = await pool.query(
      `SELECT a.id, a.activity_type, a.payload_json, a.created_at,
              CONCAT(u.first_name, ' ', u.last_name) AS actor_name
       FROM activities a
       LEFT JOIN users u ON a.actor_id = u.id
       WHERE a.organization_id = ? AND a.record_type = 'contact' AND a.record_id = ?
       ORDER BY a.created_at DESC
       LIMIT 50;`,
      [orgId, id]
    );

    return {
      ...contact,
      activities,
    };
  }

  /**
   * Create new contact record
   */
  static async create({ orgId, ownerId, data }) {
    const pool = getPool();
    const {
      firstName,
      lastName,
      email,
      phone = null,
      jobTitle = null,
      companyId = null,
      lifecycleStage = 'lead',
      leadStatus = 'new',
      source = 'Direct',
    } = data;

    if (!firstName || !lastName || !email) {
      throw new Error('First name, last name, and email are required');
    }

    const [result] = await pool.query(
      `INSERT INTO contacts 
       (organization_id, company_id, owner_id, first_name, last_name, email, phone, job_title, lifecycle_stage, lead_status, source)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        orgId,
        companyId || null,
        ownerId || null,
        firstName.trim(),
        lastName.trim(),
        email.trim().toLowerCase(),
        phone || null,
        jobTitle || null,
        lifecycleStage,
        leadStatus,
        source,
      ]
    );

    const contactId = result.insertId;

    // Automatically create creation activity in timeline (Spec §10)
    await pool.query(
      `INSERT INTO activities (organization_id, record_type, record_id, activity_type, payload_json, actor_id)
       VALUES (?, 'contact', ?, 'creation', JSON_OBJECT('message', 'Contact created in CRM.'), ?);`,
      [orgId, contactId, ownerId || null]
    );

    // Audit log
    await pool.query(
      `INSERT INTO audit_logs (organization_id, actor_id, action, object_type, record_id, after_json)
       VALUES (?, ?, 'contact.create', 'contacts', ?, ?);`,
      [orgId, ownerId || null, contactId, JSON.stringify(data)]
    );

    const createdContact = await this.getById({ orgId, id: contactId });

    // Dispatch domain event to Workflow Automation Engine (Spec §15)
    eventBus.emitEvent('contact.created', {
      orgId,
      recordType: 'contact',
      recordId: contactId,
      record: createdContact,
      actorId: ownerId,
    });

    return createdContact;
  }

  /**
   * Update contact record with stage transition tracking
   */
  static async update({ orgId, actorId, id, data }) {
    const pool = getPool();
    const existing = await this.getById({ orgId, id });

    const fieldsToUpdate = {};
    const fieldMapping = {
      firstName: 'first_name',
      lastName: 'last_name',
      email: 'email',
      phone: 'phone',
      jobTitle: 'job_title',
      companyId: 'company_id',
      lifecycleStage: 'lifecycle_stage',
      leadStatus: 'lead_status',
      source: 'source',
    };

    for (const [key, col] of Object.entries(fieldMapping)) {
      if (data[key] !== undefined) {
        fieldsToUpdate[col] = data[key];
      }
    }

    if (Object.keys(fieldsToUpdate).length === 0) {
      return existing;
    }

    const setClauses = Object.keys(fieldsToUpdate).map((col) => `${col} = ?`).join(', ');
    const values = [...Object.values(fieldsToUpdate), id, orgId];

    await pool.query(
      `UPDATE contacts SET ${setClauses} WHERE id = ? AND organization_id = ?;`,
      values
    );

    // If lifecycle_stage or lead_status changed, record status_change activity
    if (data.lifecycleStage && data.lifecycleStage !== existing.lifecycle_stage) {
      await pool.query(
        `INSERT INTO activities (organization_id, record_type, record_id, activity_type, payload_json, actor_id)
         VALUES (?, 'contact', ?, 'status_change', JSON_OBJECT('field', 'lifecycle_stage', 'from', ?, 'to', ?), ?);`,
        [orgId, id, existing.lifecycle_stage, data.lifecycleStage, actorId || null]
      );
    }

    if (data.leadStatus && data.leadStatus !== existing.lead_status) {
      await pool.query(
        `INSERT INTO activities (organization_id, record_type, record_id, activity_type, payload_json, actor_id)
         VALUES (?, 'contact', ?, 'status_change', JSON_OBJECT('field', 'lead_status', 'from', ?, 'to', ?), ?);`,
        [orgId, id, existing.lead_status, data.leadStatus, actorId || null]
      );
    }

    // Audit log
    await pool.query(
      `INSERT INTO audit_logs (organization_id, actor_id, action, object_type, record_id, before_json, after_json)
       VALUES (?, ?, 'contact.update', 'contacts', ?, ?, ?);`,
      [orgId, actorId || null, id, JSON.stringify(existing), JSON.stringify(data)]
    );

    const updatedContact = await this.getById({ orgId, id });

    // Dispatch domain event to Workflow Automation Engine (Spec §15)
    eventBus.emitEvent('contact.updated', {
      orgId,
      recordType: 'contact',
      recordId: id,
      record: updatedContact,
      changedFields: fieldsToUpdate,
      actorId,
    });

    return updatedContact;
  }

  /**
   * Delete contact record
   */
  static async delete({ orgId, actorId, id }) {
    const pool = getPool();
    const existing = await this.getById({ orgId, id });

    await pool.query('DELETE FROM contacts WHERE id = ? AND organization_id = ?;', [id, orgId]);

    // Audit log
    await pool.query(
      `INSERT INTO audit_logs (organization_id, actor_id, action, object_type, record_id, before_json)
       VALUES (?, ?, 'contact.delete', 'contacts', ?, ?);`,
      [orgId, actorId || null, id, JSON.stringify(existing)]
    );

    return { success: true, id };
  }
}
