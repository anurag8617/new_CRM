import { getPool } from '../../config/db.js';

/**
 * Marketing Service (Spec §14, §23)
 * Implements:
 * - Sales Cadence Sequences CRUD, Steps Builder & Reordering
 * - Contact Enrollment & State Machine Progression (active, paused, replied_unenrolled, completed)
 * - Cadence Step Execution Simulator with Merge Tags ({{first_name}}, {{company_name}}, etc.)
 * - Broadcast Email Campaigns CRUD, Audience Segments Preview & Dispatch Simulator
 * - Recipient Engagement Tracking (Opens, Clicks, Bounces) & Operational Analytics
 */
export class MarketingService {
  /**
   * Helper: Replace template merge tags
   */
  static interpolateTemplate(text, data = {}) {
    if (!text) return '';
    return text
      .replace(/\{\{\s*first_name\s*\}\}/gi, data.first_name || 'Valued Contact')
      .replace(/\{\{\s*last_name\s*\}\}/gi, data.last_name || '')
      .replace(/\{\{\s*company_name\s*\}\}/gi, data.company_name || 'your company')
      .replace(/\{\{\s*sender_name\s*\}\}/gi, data.sender_name || 'Alex Vance')
      .replace(/\{\{\s*sender_email\s*\}\}/gi, data.sender_email || 'alex@acme.global')
      .replace(/\{\{\s*job_title\s*\}\}/gi, data.job_title || 'Leader');
  }

  // ===================================================================
  // 1. MARKETING METRICS & OVERVIEW KPI RIBBON (§14, §23)
  // ===================================================================
  static async getMarketingMetrics(orgId) {
    const pool = getPool();

    // Sequence metrics
    const [[seqMetrics]] = await pool.query(
      `SELECT 
        COUNT(*) AS total_sequences,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) AS active_sequences,
        COALESCE(SUM(total_enrolled), 0) AS total_enrolled,
        COALESCE(SUM(total_completed), 0) AS total_completed,
        COALESCE(SUM(total_replied), 0) AS total_replied
       FROM sequences 
       WHERE organization_id = ?`,
      [orgId]
    );

    // Active enrollments count
    const [[enrollMetrics]] = await pool.query(
      `SELECT 
        COUNT(*) AS active_enrollments,
        SUM(CASE WHEN status = 'replied_unenrolled' THEN 1 ELSE 0 END) AS replied_enrollments,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed_enrollments
       FROM sequence_enrollments 
       WHERE organization_id = ? AND status = 'active'`,
      [orgId]
    );

    // Campaign metrics
    const [[campMetrics]] = await pool.query(
      `SELECT 
        COUNT(*) AS total_campaigns,
        SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) AS sent_campaigns,
        COALESCE(SUM(total_recipients), 0) AS total_broadcast_recipients,
        COALESCE(SUM(delivered_count), 0) AS total_delivered,
        COALESCE(SUM(open_count), 0) AS total_opens,
        COALESCE(SUM(click_count), 0) AS total_clicks,
        COALESCE(SUM(bounce_count), 0) AS total_bounces
       FROM email_campaigns 
       WHERE organization_id = ?`,
      [orgId]
    );

    const delivered = Number(campMetrics.total_delivered) || 0;
    const opens = Number(campMetrics.total_opens) || 0;
    const clicks = Number(campMetrics.total_clicks) || 0;
    const enrolled = Number(seqMetrics.total_enrolled) || 0;
    const replied = Number(seqMetrics.total_replied) || 0;

    const openRate = delivered > 0 ? ((opens / delivered) * 100).toFixed(1) : '0.0';
    const clickRate = delivered > 0 ? ((clicks / delivered) * 100).toFixed(1) : '0.0';
    const replyRate = enrolled > 0 ? ((replied / enrolled) * 100).toFixed(1) : '0.0';

    return {
      sequences: {
        total: Number(seqMetrics.total_sequences) || 0,
        active: Number(seqMetrics.active_sequences) || 0,
        totalEnrolled: enrolled,
        totalCompleted: Number(seqMetrics.total_completed) || 0,
        totalReplied: replied,
        replyRatePct: Number(replyRate),
        activeEnrollments: Number(enrollMetrics.active_enrollments) || 0,
      },
      campaigns: {
        total: Number(campMetrics.total_campaigns) || 0,
        sent: Number(campMetrics.sent_campaigns) || 0,
        recipients: Number(campMetrics.total_broadcast_recipients) || 0,
        delivered,
        opens,
        clicks,
        bounces: Number(campMetrics.total_bounces) || 0,
        openRatePct: Number(openRate),
        clickRatePct: Number(clickRate),
      },
    };
  }

  // ===================================================================
  // 2. SALES SEQUENCES MANAGEMENT (§14)
  // ===================================================================
  static async getSequences(orgId) {
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT s.*, 
              u.first_name AS creator_first_name, u.last_name AS creator_last_name,
              (SELECT COUNT(*) FROM sequence_steps WHERE sequence_id = s.id) AS steps_count,
              (SELECT COUNT(*) FROM sequence_enrollments WHERE sequence_id = s.id AND status = 'active') AS active_enrolled_count
       FROM sequences s
       LEFT JOIN users u ON s.created_by = u.id
       WHERE s.organization_id = ?
       ORDER BY s.created_at DESC`,
      [orgId]
    );

    return rows.map((r) => ({
      ...r,
      pause_on_reply: Boolean(r.pause_on_reply),
      steps_count: Number(r.steps_count),
      active_enrolled_count: Number(r.active_enrolled_count),
    }));
  }

  static async getSequenceById(orgId, sequenceId) {
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT s.*, 
              u.first_name AS creator_first_name, u.last_name AS creator_last_name
       FROM sequences s
       LEFT JOIN users u ON s.created_by = u.id
       WHERE s.organization_id = ? AND s.id = ?`,
      [orgId, sequenceId]
    );

    if (rows.length === 0) return null;
    const sequence = rows[0];

    // Fetch steps
    const [steps] = await pool.query(
      `SELECT * FROM sequence_steps 
       WHERE sequence_id = ? AND organization_id = ? 
       ORDER BY step_order ASC`,
      [sequenceId, orgId]
    );

    // Fetch active enrollments summary
    const [enrollments] = await pool.query(
      `SELECT se.*, 
              c.first_name, c.last_name, c.email, c.job_title,
              co.name AS company_name
       FROM sequence_enrollments se
       JOIN contacts c ON se.contact_id = c.id
       LEFT JOIN companies co ON c.company_id = co.id
       WHERE se.sequence_id = ? AND se.organization_id = ?
       ORDER BY se.enrolled_at DESC
       LIMIT 50`,
      [sequenceId, orgId]
    );

    return {
      ...sequence,
      pause_on_reply: Boolean(sequence.pause_on_reply),
      steps: steps.map((s) => ({
        ...s,
        config_json: typeof s.config_json === 'string' ? JSON.parse(s.config_json) : s.config_json || {},
      })),
      enrollments,
    };
  }

  static async createSequence(orgId, userId, data) {
    const pool = getPool();
    const { name, description = null, status = 'active', pause_on_reply = true, steps = [] } = data;

    const [result] = await pool.query(
      `INSERT INTO sequences (organization_id, name, description, status, pause_on_reply, created_by)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [orgId, name, description, status, pause_on_reply ? 1 : 0, userId]
    );

    const sequenceId = result.insertId;

    // Insert steps if provided
    if (Array.isArray(steps) && steps.length > 0) {
      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        await pool.query(
          `INSERT INTO sequence_steps (organization_id, sequence_id, step_order, step_type, delay_days, delay_hours, subject, body_template, config_json)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            orgId,
            sequenceId,
            step.step_order || i + 1,
            step.step_type || 'email',
            step.delay_days !== undefined ? step.delay_days : 1,
            step.delay_hours || 0,
            step.subject || null,
            step.body_template || null,
            JSON.stringify(step.config_json || {}),
          ]
        );
      }
    }

    return await this.getSequenceById(orgId, sequenceId);
  }

  static async updateSequence(orgId, sequenceId, data) {
    const pool = getPool();
    const updates = [];
    const values = [];

    if (data.name !== undefined) {
      updates.push('name = ?');
      values.push(data.name);
    }
    if (data.description !== undefined) {
      updates.push('description = ?');
      values.push(data.description);
    }
    if (data.status !== undefined) {
      updates.push('status = ?');
      values.push(data.status);
    }
    if (data.pause_on_reply !== undefined) {
      updates.push('pause_on_reply = ?');
      values.push(data.pause_on_reply ? 1 : 0);
    }

    if (updates.length > 0) {
      values.push(orgId, sequenceId);
      await pool.query(
        `UPDATE sequences SET ${updates.join(', ')} WHERE organization_id = ? AND id = ?`,
        values
      );
    }

    return await this.getSequenceById(orgId, sequenceId);
  }

  static async deleteSequence(orgId, sequenceId) {
    const pool = getPool();
    const [result] = await pool.query(
      `DELETE FROM sequences WHERE organization_id = ? AND id = ?`,
      [orgId, sequenceId]
    );
    return result.affectedRows > 0;
  }

  // ===================================================================
  // 3. SEQUENCE STEPS MANAGEMENT (§14)
  // ===================================================================
  static async addSequenceStep(orgId, sequenceId, stepData) {
    const pool = getPool();

    // Determine next step order if omitted
    let stepOrder = stepData.step_order;
    if (!stepOrder) {
      const [[maxOrderRow]] = await pool.query(
        `SELECT COALESCE(MAX(step_order), 0) + 1 AS next_order 
         FROM sequence_steps 
         WHERE organization_id = ? AND sequence_id = ?`,
        [orgId, sequenceId]
      );
      stepOrder = maxOrderRow.next_order;
    }

    const [res] = await pool.query(
      `INSERT INTO sequence_steps (organization_id, sequence_id, step_order, step_type, delay_days, delay_hours, subject, body_template, config_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        orgId,
        sequenceId,
        stepOrder,
        stepData.step_type || 'email',
        stepData.delay_days !== undefined ? stepData.delay_days : 1,
        stepData.delay_hours || 0,
        stepData.subject || null,
        stepData.body_template || null,
        JSON.stringify(stepData.config_json || {}),
      ]
    );

    return await this.getSequenceById(orgId, sequenceId);
  }

  static async updateSequenceStep(orgId, sequenceId, stepId, stepData) {
    const pool = getPool();
    const updates = [];
    const values = [];

    if (stepData.step_order !== undefined) {
      updates.push('step_order = ?');
      values.push(stepData.step_order);
    }
    if (stepData.step_type !== undefined) {
      updates.push('step_type = ?');
      values.push(stepData.step_type);
    }
    if (stepData.delay_days !== undefined) {
      updates.push('delay_days = ?');
      values.push(stepData.delay_days);
    }
    if (stepData.delay_hours !== undefined) {
      updates.push('delay_hours = ?');
      values.push(stepData.delay_hours);
    }
    if (stepData.subject !== undefined) {
      updates.push('subject = ?');
      values.push(stepData.subject);
    }
    if (stepData.body_template !== undefined) {
      updates.push('body_template = ?');
      values.push(stepData.body_template);
    }
    if (stepData.config_json !== undefined) {
      updates.push('config_json = ?');
      values.push(JSON.stringify(stepData.config_json));
    }

    if (updates.length > 0) {
      values.push(orgId, sequenceId, stepId);
      await pool.query(
        `UPDATE sequence_steps SET ${updates.join(', ')} 
         WHERE organization_id = ? AND sequence_id = ? AND id = ?`,
        values
      );
    }

    return await this.getSequenceById(orgId, sequenceId);
  }

  static async deleteSequenceStep(orgId, sequenceId, stepId) {
    const pool = getPool();
    await pool.query(
      `DELETE FROM sequence_steps WHERE organization_id = ? AND sequence_id = ? AND id = ?`,
      [orgId, sequenceId, stepId]
    );

    // Reorder remaining steps cleanly
    const [remaining] = await pool.query(
      `SELECT id FROM sequence_steps WHERE sequence_id = ? ORDER BY step_order ASC`,
      [sequenceId]
    );

    for (let i = 0; i < remaining.length; i++) {
      await pool.query(
        `UPDATE sequence_steps SET step_order = ? WHERE id = ?`,
        [i + 1, remaining[i].id]
      );
    }

    return await this.getSequenceById(orgId, sequenceId);
  }

  // ===================================================================
  // 4. CONTACT ENROLLMENTS & STEP SIMULATOR (§14)
  // ===================================================================
  static async getEnrollments(orgId, query = {}) {
    const pool = getPool();
    const { sequence_id, status, contact_id } = query;

    let sql = `
      SELECT se.*, 
             s.name AS sequence_name, s.pause_on_reply,
             c.first_name, c.last_name, c.email, c.job_title,
             co.name AS company_name,
             u.first_name AS enrolled_by_first_name, u.last_name AS enrolled_by_last_name
      FROM sequence_enrollments se
      JOIN sequences s ON se.sequence_id = s.id
      JOIN contacts c ON se.contact_id = c.id
      LEFT JOIN companies co ON c.company_id = co.id
      LEFT JOIN users u ON se.enrolled_by = u.id
      WHERE se.organization_id = ?
    `;
    const params = [orgId];

    if (sequence_id) {
      sql += ` AND se.sequence_id = ?`;
      params.push(sequence_id);
    }
    if (status) {
      sql += ` AND se.status = ?`;
      params.push(status);
    }
    if (contact_id) {
      sql += ` AND se.contact_id = ?`;
      params.push(contact_id);
    }

    sql += ` ORDER BY se.enrolled_at DESC LIMIT 100`;

    const [rows] = await pool.query(sql, params);
    return rows;
  }

  static async enrollContacts(orgId, userId, sequenceId, contactIds) {
    const pool = getPool();
    const ids = Array.isArray(contactIds) ? contactIds : [contactIds];
    const enrolled = [];
    const errors = [];

    // Verify sequence exists
    const [seqRows] = await pool.query(
      `SELECT * FROM sequences WHERE organization_id = ? AND id = ?`,
      [orgId, sequenceId]
    );
    if (seqRows.length === 0) throw new Error('Sequence not found');

    // Get first step delay if available
    const [firstStep] = await pool.query(
      `SELECT * FROM sequence_steps WHERE sequence_id = ? ORDER BY step_order ASC LIMIT 1`,
      [sequenceId]
    );

    const delayDays = firstStep.length > 0 ? firstStep[0].delay_days : 0;
    const delayHours = firstStep.length > 0 ? firstStep[0].delay_hours : 0;

    for (const cid of ids) {
      try {
        // Compute next_step_due_at
        await pool.query(
          `INSERT INTO sequence_enrollments (organization_id, sequence_id, contact_id, enrolled_by, current_step_order, status, next_step_due_at)
           VALUES (?, ?, ?, ?, 1, 'active', DATE_ADD(DATE_ADD(NOW(), INTERVAL ? DAY), INTERVAL ? HOUR))
           ON DUPLICATE KEY UPDATE status = 'active', current_step_order = 1, next_step_due_at = DATE_ADD(DATE_ADD(NOW(), INTERVAL ? DAY), INTERVAL ? HOUR)`,
          [orgId, sequenceId, cid, userId, delayDays, delayHours, delayDays, delayHours]
        );

        // Update sequence total_enrolled
        await pool.query(
          `UPDATE sequences 
           SET total_enrolled = (SELECT COUNT(*) FROM sequence_enrollments WHERE sequence_id = ?)
           WHERE id = ?`,
          [sequenceId, sequenceId]
        );

        enrolled.push(cid);
      } catch (err) {
        errors.push({ contact_id: cid, error: err.message });
      }
    }

    return { enrolled, errors, count: enrolled.length };
  }

  static async updateEnrollmentStatus(orgId, enrollmentId, status) {
    const pool = getPool();
    const validStatuses = ['active', 'paused', 'completed', 'replied_unenrolled', 'bounced', 'failed'];
    if (!validStatuses.includes(status)) {
      throw new Error(`Invalid enrollment status: ${status}`);
    }

    const completedAtSql = (status === 'completed' || status === 'replied_unenrolled') ? 'NOW()' : 'NULL';

    await pool.query(
      `UPDATE sequence_enrollments 
       SET status = ?, completed_at = ${completedAtSql}
       WHERE organization_id = ? AND id = ?`,
      [status, orgId, enrollmentId]
    );

    const [rows] = await pool.query(
      `SELECT * FROM sequence_enrollments WHERE organization_id = ? AND id = ?`,
      [orgId, enrollmentId]
    );
    return rows[0] || null;
  }

  /**
   * Execute Cadence Step / Step Progression Simulator (§14)
   * Advances the current cadence step for an enrolled contact:
   * - Evaluates merge tags against contact and company
   * - Creates corresponding task, activity, or email message
   * - Advances current_step_order or marks completed if finished
   */
  static async executeStep(orgId, userId, enrollmentId) {
    const pool = getPool();

    // Fetch enrollment with contact, company, and sequence details
    const [enrollRows] = await pool.query(
      `SELECT se.*, 
              s.name AS sequence_name, s.pause_on_reply,
              c.first_name, c.last_name, c.email, c.job_title,
              co.name AS company_name
       FROM sequence_enrollments se
       JOIN sequences s ON se.sequence_id = s.id
       JOIN contacts c ON se.contact_id = c.id
       LEFT JOIN companies co ON c.company_id = co.id
       WHERE se.organization_id = ? AND se.id = ?`,
      [orgId, enrollmentId]
    );

    if (enrollRows.length === 0) throw new Error('Enrollment not found');
    const enrollment = enrollRows[0];

    if (enrollment.status !== 'active') {
      throw new Error(`Cannot execute step on enrollment with status "${enrollment.status}"`);
    }

    // Fetch current step
    const [stepRows] = await pool.query(
      `SELECT * FROM sequence_steps 
       WHERE sequence_id = ? AND step_order = ? 
       LIMIT 1`,
      [enrollment.sequence_id, enrollment.current_step_order]
    );

    if (stepRows.length === 0) {
      // No step found at this order, complete sequence
      await pool.query(
        `UPDATE sequence_enrollments 
         SET status = 'completed', completed_at = NOW(), last_executed_at = NOW() 
         WHERE id = ?`,
        [enrollmentId]
      );
      await pool.query(
        `UPDATE sequences SET total_completed = total_completed + 1 WHERE id = ?`,
        [enrollment.sequence_id]
      );
      return { completed: true, message: 'Cadence completed' };
    }

    const currentStep = stepRows[0];

    // Merge template data
    const mergeData = {
      first_name: enrollment.first_name,
      last_name: enrollment.last_name,
      company_name: enrollment.company_name,
      job_title: enrollment.job_title,
      sender_name: 'Alex Vance',
      sender_email: 'alex@acme.global',
    };

    const evaluatedSubject = this.interpolateTemplate(currentStep.subject, mergeData);
    const evaluatedBody = this.interpolateTemplate(currentStep.body_template, mergeData);

    // Perform step specific dispatch/logging
    let executedAction = currentStep.step_type;
    let detailMessage = '';

    if (currentStep.step_type === 'email') {
      // 1. Insert into email_messages
      await pool.query(
        `INSERT INTO email_messages (organization_id, record_type, record_id, from_email, to_email, subject, body_html, body_text, status, sent_at)
         VALUES (?, 'contact', ?, 'alex@acme.global', ?, ?, ?, ?, 'sent', NOW())`,
        [orgId, enrollment.contact_id, enrollment.email, evaluatedSubject, `<p>${evaluatedBody.replace(/\n/g, '<br/>')}</p>`, evaluatedBody]
      );
      // 2. Timeline activity
      await pool.query(
        `INSERT INTO activities (organization_id, record_type, record_id, activity_type, payload_json, actor_id)
         VALUES (?, 'contact', ?, 'email', ?, ?)`,
        [
          orgId,
          enrollment.contact_id,
          JSON.stringify({
            title: `[Sequence: ${enrollment.sequence_name}] ${evaluatedSubject}`,
            subject: evaluatedSubject,
            body: evaluatedBody,
            recipient: enrollment.email,
          }),
          userId,
        ]
      );
      detailMessage = `Cadence Email dispatched to ${enrollment.email}`;
    } else if (currentStep.step_type === 'task') {
      // Insert into tasks table
      await pool.query(
        `INSERT INTO tasks (organization_id, title, description, record_type, record_id, assigned_to, due_date, priority, status, created_by)
         VALUES (?, ?, ?, 'contact', ?, ?, DATE_ADD(CURRENT_DATE, INTERVAL 2 DAY), 'high', 'pending', ?)`,
        [orgId, `[Sequence Task] ${evaluatedSubject || 'Cadence Follow-up'}`, evaluatedBody, enrollment.contact_id, userId, userId]
      );
      await pool.query(
        `INSERT INTO activities (organization_id, record_type, record_id, activity_type, payload_json, actor_id)
         VALUES (?, 'contact', ?, 'task', ?, ?)`,
        [
          orgId,
          enrollment.contact_id,
          JSON.stringify({
            title: `[Sequence Task] ${evaluatedSubject || 'Cadence Follow-up'}`,
            description: evaluatedBody,
          }),
          userId,
        ]
      );
      detailMessage = `Action task scheduled: "${evaluatedSubject}"`;
    } else if (currentStep.step_type === 'call_reminder') {
      // Insert call reminder task & activity
      await pool.query(
        `INSERT INTO tasks (organization_id, title, description, record_type, record_id, assigned_to, due_date, priority, status, created_by)
         VALUES (?, ?, ?, 'contact', ?, ?, DATE_ADD(CURRENT_DATE, INTERVAL 1 DAY), 'urgent', 'pending', ?)`,
        [orgId, `[Call Reminder] ${evaluatedSubject || 'Outbound Call Touchpoint'}`, evaluatedBody, enrollment.contact_id, userId, userId]
      );
      await pool.query(
        `INSERT INTO activities (organization_id, record_type, record_id, activity_type, payload_json, actor_id)
         VALUES (?, 'contact', ?, 'call', ?, ?)`,
        [
          orgId,
          enrollment.contact_id,
          JSON.stringify({
            title: `[Call Reminder] ${evaluatedSubject || 'Outbound Call Touchpoint'}`,
            description: evaluatedBody,
          }),
          userId,
        ]
      );
      detailMessage = `Call touchpoint reminder logged for ${enrollment.first_name} ${enrollment.last_name}`;
    } else if (currentStep.step_type === 'linkedin_touch') {
      await pool.query(
        `INSERT INTO activities (organization_id, record_type, record_id, activity_type, payload_json, actor_id)
         VALUES (?, 'contact', ?, 'note', ?, ?)`,
        [
          orgId,
          enrollment.contact_id,
          JSON.stringify({
            title: `[LinkedIn Touchpoint] ${evaluatedSubject}`,
            note: evaluatedBody,
          }),
          userId,
        ]
      );
      detailMessage = `LinkedIn touchpoint action logged`;
    } else if (currentStep.step_type === 'delay') {
      detailMessage = `Cadence delay step processed (${currentStep.delay_days} days)`;
    }

    // Check if next step exists
    const nextStepOrder = enrollment.current_step_order + 1;
    const [nextStepRows] = await pool.query(
      `SELECT * FROM sequence_steps WHERE sequence_id = ? AND step_order = ? LIMIT 1`,
      [enrollment.sequence_id, nextStepOrder]
    );

    let nextStepDueAt = null;
    let newStatus = 'active';
    let isCompleted = false;

    if (nextStepRows.length > 0) {
      const nextStep = nextStepRows[0];
      const nextDelayDays = nextStep.delay_days || 0;
      const nextDelayHours = nextStep.delay_hours || 0;

      await pool.query(
        `UPDATE sequence_enrollments 
         SET current_step_order = ?,
             last_executed_at = NOW(),
             next_step_due_at = DATE_ADD(DATE_ADD(NOW(), INTERVAL ? DAY), INTERVAL ? HOUR)
         WHERE id = ?`,
        [nextStepOrder, nextDelayDays, nextDelayHours, enrollmentId]
      );
    } else {
      // Completed!
      isCompleted = true;
      newStatus = 'completed';
      await pool.query(
        `UPDATE sequence_enrollments 
         SET current_step_order = ?,
             status = 'completed',
             last_executed_at = NOW(),
             completed_at = NOW(),
             next_step_due_at = NULL
         WHERE id = ?`,
        [enrollment.current_step_order, enrollmentId]
      );

      // Increment sequence total_completed
      await pool.query(
        `UPDATE sequences SET total_completed = total_completed + 1 WHERE id = ?`,
        [enrollment.sequence_id]
      );
    }

    return {
      success: true,
      step_order: enrollment.current_step_order,
      step_type: currentStep.step_type,
      subject: evaluatedSubject,
      action: executedAction,
      detail: detailMessage,
      isCompleted,
      next_step_order: isCompleted ? null : nextStepOrder,
      enrollment_status: newStatus,
    };
  }

  /**
   * Simulate Prospect Reply (§14)
   * Auto-pauses / unenrolls contact if pause_on_reply is enabled
   */
  static async simulateReply(orgId, userId, enrollmentId, replyText = 'Thanks for reaching out! Let us schedule a demo call.') {
    const pool = getPool();

    const [enrollRows] = await pool.query(
      `SELECT se.*, s.name AS sequence_name, s.pause_on_reply, c.first_name, c.last_name, c.email
       FROM sequence_enrollments se
       JOIN sequences s ON se.sequence_id = s.id
       JOIN contacts c ON se.contact_id = c.id
       WHERE se.organization_id = ? AND se.id = ?`,
      [orgId, enrollmentId]
    );

    if (enrollRows.length === 0) throw new Error('Enrollment not found');
    const enrollment = enrollRows[0];

    const pauseOnReply = Boolean(enrollment.pause_on_reply);
    const newStatus = pauseOnReply ? 'replied_unenrolled' : enrollment.status;

    // Log reply activity
    await pool.query(
      `INSERT INTO activities (organization_id, record_type, record_id, activity_type, payload_json, actor_id)
       VALUES (?, 'contact', ?, 'email', ?, ?)`,
      [
        orgId,
        enrollment.contact_id,
        JSON.stringify({
          title: `[Prospect Reply] Re: ${enrollment.sequence_name}`,
          reply: replyText,
          sender: `${enrollment.first_name} ${enrollment.last_name}`,
          cadence_status: newStatus,
        }),
        userId,
      ]
    );

    // Update enrollment status
    await pool.query(
      `UPDATE sequence_enrollments 
       SET status = ?, completed_at = ${pauseOnReply ? 'NOW()' : 'completed_at'}
       WHERE id = ?`,
      [newStatus, enrollmentId]
    );

    // Update sequence total_replied
    await pool.query(
      `UPDATE sequences SET total_replied = total_replied + 1 WHERE id = ?`,
      [enrollment.sequence_id]
    );

    return {
      success: true,
      enrollmentId,
      status: newStatus,
      autoPaused: pauseOnReply,
      message: pauseOnReply
        ? `Prospect replied! Sequence auto-paused & contact unenrolled to prevent automated collision.`
        : `Reply logged! Contact remains enrolled.`,
    };
  }

  // ===================================================================
  // 5. BROADCAST EMAIL CAMPAIGNS & AUDIENCE SEGMENTS (§23)
  // ===================================================================
  static async getCampaigns(orgId) {
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT c.*, 
              u.first_name AS creator_first_name, u.last_name AS creator_last_name,
              (SELECT COUNT(*) FROM campaign_recipients WHERE campaign_id = c.id) AS calculated_recipients
       FROM email_campaigns c
       LEFT JOIN users u ON c.created_by = u.id
       WHERE c.organization_id = ?
       ORDER BY c.created_at DESC`,
      [orgId]
    );

    return rows.map((camp) => {
      const delivered = Number(camp.delivered_count) || 0;
      const opens = Number(camp.open_count) || 0;
      const clicks = Number(camp.click_count) || 0;
      return {
        ...camp,
        open_rate: delivered > 0 ? ((opens / delivered) * 100).toFixed(1) : '0.0',
        click_rate: delivered > 0 ? ((clicks / delivered) * 100).toFixed(1) : '0.0',
      };
    });
  }

  static async getCampaignById(orgId, campaignId) {
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT c.*, 
              u.first_name AS creator_first_name, u.last_name AS creator_last_name
       FROM email_campaigns c
       LEFT JOIN users u ON c.created_by = u.id
       WHERE c.organization_id = ? AND c.id = ?`,
      [orgId, campaignId]
    );

    if (rows.length === 0) return null;
    const campaign = rows[0];

    // Fetch recipients
    const [recipients] = await pool.query(
      `SELECT cr.*, 
              ct.first_name, ct.last_name, ct.job_title,
              co.name AS company_name
       FROM campaign_recipients cr
       JOIN contacts ct ON cr.contact_id = ct.id
       LEFT JOIN companies co ON ct.company_id = co.id
       WHERE cr.campaign_id = ? AND cr.organization_id = ?
       ORDER BY cr.id ASC`,
      [campaignId, orgId]
    );

    const delivered = Number(campaign.delivered_count) || 0;
    const opens = Number(campaign.open_count) || 0;
    const clicks = Number(campaign.click_count) || 0;

    return {
      ...campaign,
      open_rate: delivered > 0 ? ((opens / delivered) * 100).toFixed(1) : '0.0',
      click_rate: delivered > 0 ? ((clicks / delivered) * 100).toFixed(1) : '0.0',
      recipients,
    };
  }

  static async getAudiencePreview(orgId, segment) {
    const pool = getPool();
    let whereClause = `organization_id = ?`;
    const params = [orgId];

    if (segment === 'leads_only') {
      whereClause += ` AND lifecycle_stage = 'lead'`;
    } else if (segment === 'customers_only') {
      whereClause += ` AND lifecycle_stage = 'customer'`;
    } else if (segment === 'enterprise_mql') {
      whereClause += ` AND lifecycle_stage IN ('sales_qualified_lead', 'opportunity', 'customer')`;
    } else if (segment === 'deal_contacts') {
      whereClause += ` AND company_id IS NOT NULL`;
    }

    const [rows] = await pool.query(
      `SELECT id, first_name, last_name, email, job_title, lifecycle_stage 
       FROM contacts 
       WHERE ${whereClause}
       ORDER BY id ASC`,
      params
    );

    return {
      segment,
      count: rows.length,
      sample: rows.slice(0, 10),
    };
  }

  static async createCampaign(orgId, userId, data) {
    const pool = getPool();
    const {
      name,
      subject,
      preview_text = null,
      from_name = 'Alex Vance',
      from_email = 'alex@acme.global',
      target_segment = 'all_contacts',
      status = 'draft',
      html_content,
      plain_content = null,
      scheduled_at = null,
    } = data;

    const [result] = await pool.query(
      `INSERT INTO email_campaigns 
        (organization_id, name, subject, preview_text, from_name, from_email, target_segment, status, html_content, plain_content, scheduled_at, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        orgId,
        name,
        subject,
        preview_text,
        from_name,
        from_email,
        target_segment,
        status,
        html_content,
        plain_content,
        scheduled_at,
        userId,
      ]
    );

    return await this.getCampaignById(orgId, result.insertId);
  }

  static async updateCampaign(orgId, campaignId, data) {
    const pool = getPool();
    const fields = [
      'name',
      'subject',
      'preview_text',
      'from_name',
      'from_email',
      'target_segment',
      'status',
      'html_content',
      'plain_content',
      'scheduled_at',
    ];
    const updates = [];
    const values = [];

    for (const f of fields) {
      if (data[f] !== undefined) {
        updates.push(`${f} = ?`);
        values.push(data[f]);
      }
    }

    if (updates.length > 0) {
      values.push(orgId, campaignId);
      await pool.query(
        `UPDATE email_campaigns SET ${updates.join(', ')} WHERE organization_id = ? AND id = ?`,
        values
      );
    }

    return await this.getCampaignById(orgId, campaignId);
  }

  static async deleteCampaign(orgId, campaignId) {
    const pool = getPool();
    const [result] = await pool.query(
      `DELETE FROM email_campaigns WHERE organization_id = ? AND id = ?`,
      [orgId, campaignId]
    );
    return result.affectedRows > 0;
  }

  /**
   * Dispatch Campaign Simulator (§23)
   * Resolves target segment audience, queues and sends to recipients, simulates opens
   */
  static async sendCampaign(orgId, userId, campaignId) {
    const pool = getPool();

    const [campRows] = await pool.query(
      `SELECT * FROM email_campaigns WHERE organization_id = ? AND id = ?`,
      [orgId, campaignId]
    );
    if (campRows.length === 0) throw new Error('Campaign not found');
    const camp = campRows[0];

    // Find target audience
    const audience = await this.getAudiencePreview(orgId, camp.target_segment);
    const audienceContacts = audience.sample; // Or full query

    let whereClause = `organization_id = ?`;
    const params = [orgId];
    if (camp.target_segment === 'leads_only') {
      whereClause += ` AND lifecycle_stage = 'lead'`;
    } else if (camp.target_segment === 'customers_only') {
      whereClause += ` AND lifecycle_stage = 'customer'`;
    } else if (camp.target_segment === 'enterprise_mql') {
      whereClause += ` AND lifecycle_stage IN ('sales_qualified_lead', 'opportunity', 'customer')`;
    } else if (camp.target_segment === 'deal_contacts') {
      whereClause += ` AND company_id IS NOT NULL`;
    }

    const [targetContacts] = await pool.query(
      `SELECT id, first_name, last_name, email, company_id FROM contacts WHERE ${whereClause}`,
      params
    );

    if (targetContacts.length === 0) {
      throw new Error(`Target segment "${camp.target_segment}" yielded 0 eligible contacts.`);
    }

    let deliveredCount = 0;
    let openCount = 0;

    for (const c of targetContacts) {
      // Insert recipient row
      await pool.query(
        `INSERT INTO campaign_recipients (organization_id, campaign_id, contact_id, email, status, sent_at)
         VALUES (?, ?, ?, ?, 'sent', NOW())
         ON DUPLICATE KEY UPDATE status = 'sent', sent_at = NOW()`,
        [orgId, campaignId, c.id, c.email]
      );
      deliveredCount++;
    }

    // Update campaign record
    await pool.query(
      `UPDATE email_campaigns 
       SET status = 'sent', 
           sent_at = NOW(),
           total_recipients = ?,
           delivered_count = ?
       WHERE id = ?`,
      [targetContacts.length, deliveredCount, campaignId]
    );

    return await this.getCampaignById(orgId, campaignId);
  }

  /**
   * Recipient Engagement Event Tracking (§23)
   * Tracks 'open', 'click', 'bounce'
   */
  static async trackRecipientEvent(orgId, recipientId, eventType) {
    const pool = getPool();

    const [recRows] = await pool.query(
      `SELECT * FROM campaign_recipients WHERE organization_id = ? AND id = ?`,
      [orgId, recipientId]
    );
    if (recRows.length === 0) throw new Error('Recipient not found');
    const rec = recRows[0];

    if (eventType === 'open') {
      await pool.query(
        `UPDATE campaign_recipients 
         SET status = 'opened', opened_at = NOW() 
         WHERE id = ? AND opened_at IS NULL`,
        [recipientId]
      );
      await pool.query(
        `UPDATE email_campaigns 
         SET open_count = (SELECT COUNT(*) FROM campaign_recipients WHERE campaign_id = ? AND status IN ('opened', 'clicked'))
         WHERE id = ?`,
        [rec.campaign_id, rec.campaign_id]
      );
    } else if (eventType === 'click') {
      await pool.query(
        `UPDATE campaign_recipients 
         SET status = 'clicked', 
             opened_at = COALESCE(opened_at, NOW()),
             clicked_at = NOW() 
         WHERE id = ?`,
        [recipientId]
      );
      await pool.query(
        `UPDATE email_campaigns 
         SET click_count = (SELECT COUNT(*) FROM campaign_recipients WHERE campaign_id = ? AND status = 'clicked'),
             open_count = (SELECT COUNT(*) FROM campaign_recipients WHERE campaign_id = ? AND status IN ('opened', 'clicked'))
         WHERE id = ?`,
        [rec.campaign_id, rec.campaign_id, rec.campaign_id]
      );
    } else if (eventType === 'bounce') {
      await pool.query(
        `UPDATE campaign_recipients SET status = 'bounced' WHERE id = ?`,
        [recipientId]
      );
      await pool.query(
        `UPDATE email_campaigns 
         SET bounce_count = (SELECT COUNT(*) FROM campaign_recipients WHERE campaign_id = ? AND status = 'bounced')
         WHERE id = ?`,
        [rec.campaign_id, rec.campaign_id]
      );
    }

    return await this.getCampaignById(orgId, rec.campaign_id);
  }
}
