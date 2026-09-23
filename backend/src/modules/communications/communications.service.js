import { getPool } from '../../config/db.js';
import { eventBus } from '../../services/eventBus.js';

export class CommunicationsService {
  // ===================================================================
  // EMAIL MESSAGES & TIMELINE NORMALIZATION (Spec §13, §23)
  // ===================================================================

  static async sendEmail(orgId, actorId, data) {
    const pool = getPool();
    const {
      recordType = null,
      recordId = null,
      toEmail,
      fromEmail = 'sales@crm.local',
      subject,
      bodyHtml,
      bodyText,
    } = data;

    if (!toEmail || !subject || !bodyHtml) {
      throw new Error('toEmail, subject, and bodyHtml are required');
    }

    const plainText = bodyText || bodyHtml.replace(/<[^>]+>/g, '').trim();

    const [res] = await pool.query(
      `INSERT INTO email_messages (organization_id, record_type, record_id, from_email, to_email, subject, body_html, body_text, status, sent_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'sent', CURRENT_TIMESTAMP);`,
      [orgId, recordType || null, recordId || null, fromEmail, toEmail.trim(), subject.trim(), bodyHtml, plainText]
    );

    const emailId = res.insertId;

    // Normalize into activities (§10 Timeline)
    if (recordType && recordId) {
      await pool.query(
        `INSERT INTO activities (organization_id, record_type, record_id, activity_type, payload_json, actor_id)
         VALUES (?, ?, ?, 'email', JSON_OBJECT('emailId', ?, 'to', ?, 'subject', ?, 'preview', ?), ?);`,
        [orgId, recordType, recordId, emailId, toEmail.trim(), subject.trim(), plainText.substring(0, 150), actorId || null]
      );
    }

    const [rows] = await pool.query('SELECT * FROM email_messages WHERE id = ?;', [emailId]);
    const sentEmail = rows[0];

    eventBus.emitEvent('email.sent', {
      orgId,
      recordType: recordType || 'email',
      recordId: emailId,
      record: sentEmail,
      actorId,
    });

    return sentEmail;
  }

  static async listEmails(orgId, { recordType, recordId, limit = 50 } = {}) {
    const pool = getPool();
    let query = 'SELECT * FROM email_messages WHERE organization_id = ?';
    const params = [orgId];

    if (recordType && recordId) {
      query += ' AND record_type = ? AND record_id = ?';
      params.push(recordType, recordId);
    }

    query += ' ORDER BY sent_at DESC LIMIT ?;';
    params.push(parseInt(limit, 10));

    const [rows] = await pool.query(query, params);
    return rows;
  }

  // ===================================================================
  // EMAIL TEMPLATES (Spec §13)
  // ===================================================================

  static async listTemplates(orgId, { category } = {}) {
    const pool = getPool();
    let query = `
      SELECT et.*, CONCAT(u.first_name, ' ', u.last_name) AS creator_name
      FROM email_templates et
      LEFT JOIN users u ON u.id = et.created_by
      WHERE et.organization_id = ?
    `;
    const params = [orgId];

    if (category && category !== 'all') {
      query += ' AND et.category = ?';
      params.push(category);
    }

    query += ' ORDER BY et.updated_at DESC;';
    const [rows] = await pool.query(query, params);
    return rows;
  }

  static async getTemplateById(orgId, id) {
    const pool = getPool();
    const [rows] = await pool.query(
      'SELECT * FROM email_templates WHERE id = ? AND organization_id = ?;',
      [id, orgId]
    );
    return rows[0] || null;
  }

  static async createTemplate(orgId, creatorId, data) {
    const pool = getPool();
    const { name, subject, bodyTemplate, category = 'sales' } = data;

    if (!name || !subject || !bodyTemplate) {
      throw new Error('name, subject, and bodyTemplate are required');
    }

    const [res] = await pool.query(
      `INSERT INTO email_templates (organization_id, name, subject, body_template, category, created_by)
       VALUES (?, ?, ?, ?, ?, ?);`,
      [orgId, name.trim(), subject.trim(), bodyTemplate, category, creatorId || null]
    );

    return this.getTemplateById(orgId, res.insertId);
  }

  static async updateTemplate(orgId, id, data) {
    const pool = getPool();
    const { name, subject, bodyTemplate, category } = data;

    const updates = [];
    const params = [];

    if (name) { updates.push('name = ?'); params.push(name.trim()); }
    if (subject) { updates.push('subject = ?'); params.push(subject.trim()); }
    if (bodyTemplate) { updates.push('body_template = ?'); params.push(bodyTemplate); }
    if (category) { updates.push('category = ?'); params.push(category); }

    if (updates.length === 0) return this.getTemplateById(orgId, id);

    params.push(id, orgId);
    await pool.query(
      `UPDATE email_templates SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND organization_id = ?;`,
      params
    );

    return this.getTemplateById(orgId, id);
  }

  static async deleteTemplate(orgId, id) {
    const pool = getPool();
    const [res] = await pool.query(
      'DELETE FROM email_templates WHERE id = ? AND organization_id = ?;',
      [id, orgId]
    );
    return res.affectedRows > 0;
  }

  // ===================================================================
  // CALLS & TELEPHONY LOG (Spec §23)
  // ===================================================================

  static async logCall(orgId, actorId, data) {
    const pool = getPool();
    const {
      recordType = null,
      recordId = null,
      fromNumber = '+1 (555) 010-0000',
      toNumber,
      direction = 'outbound',
      durationSeconds = 0,
      status = 'completed',
      recordingUrl = null,
      notes = '',
    } = data;

    if (!toNumber) {
      throw new Error('toNumber is required');
    }

    const [res] = await pool.query(
      `INSERT INTO calls_log (organization_id, record_type, record_id, from_number, to_number, direction, duration_seconds, status, recording_url, notes, user_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        orgId,
        recordType || null,
        recordId || null,
        fromNumber,
        toNumber.trim(),
        direction,
        parseInt(durationSeconds, 10) || 0,
        status,
        recordingUrl,
        notes.trim(),
        actorId || null,
      ]
    );

    const callId = res.insertId;

    // Normalize into activities (§10 Timeline)
    if (recordType && recordId) {
      await pool.query(
        `INSERT INTO activities (organization_id, record_type, record_id, activity_type, payload_json, actor_id)
         VALUES (?, ?, ?, 'call', JSON_OBJECT('callId', ?, 'toNumber', ?, 'direction', ?, 'duration', ?, 'notes', ?), ?);`,
        [orgId, recordType, recordId, callId, toNumber.trim(), direction, durationSeconds, notes.trim(), actorId || null]
      );
    }

    const [rows] = await pool.query('SELECT * FROM calls_log WHERE id = ?;', [callId]);
    const loggedCall = rows[0];

    eventBus.emitEvent('call.logged', {
      orgId,
      recordType: recordType || 'call',
      recordId: callId,
      record: loggedCall,
      actorId,
    });

    return loggedCall;
  }

  static async listCalls(orgId, { recordType, recordId, limit = 50 } = {}) {
    const pool = getPool();
    let query = `
      SELECT c.*, CONCAT(u.first_name, ' ', u.last_name) AS caller_name
      FROM calls_log c
      LEFT JOIN users u ON u.id = c.user_id
      WHERE c.organization_id = ?
    `;
    const params = [orgId];

    if (recordType && recordId) {
      query += ' AND c.record_type = ? AND c.record_id = ?';
      params.push(recordType, recordId);
    }

    query += ' ORDER BY c.created_at DESC LIMIT ?;';
    params.push(parseInt(limit, 10));

    const [rows] = await pool.query(query, params);
    return rows;
  }
}
