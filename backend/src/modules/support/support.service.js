import { getPool } from '../../config/db.js';

export class SupportService {
  /**
   * Helper to format MySQL datetime string to ISO
   */
  static formatDates(row) {
    if (!row) return row;
    const formatted = { ...row };
    ['created_at', 'updated_at', 'first_response_due_at', 'resolution_due_at', 'first_responded_at', 'resolved_at', 'closed_at'].forEach(field => {
      if (formatted[field] && formatted[field] instanceof Date) {
        formatted[field] = formatted[field].toISOString();
      }
    });
    return formatted;
  }

  /**
   * List tickets with filters and enriched company/contact/agent data
   */
  static async getTickets(orgId, filters = {}) {
    const pool = getPool();
    let query = `
      SELECT 
        t.*,
        c.name AS company_name,
        CONCAT(ct.first_name, ' ', ct.last_name) AS contact_name,
        ct.email AS contact_email,
        CONCAT(u.first_name, ' ', u.last_name) AS assignee_name,
        u.email AS assignee_email,
        sp.name AS sla_policy_name,
        sp.first_response_time_minutes,
        sp.resolution_time_minutes,
        (SELECT COUNT(*) FROM ticket_messages tm WHERE tm.ticket_id = t.id) AS message_count
      FROM tickets t
      LEFT JOIN companies c ON t.company_id = c.id
      LEFT JOIN contacts ct ON t.contact_id = ct.id
      LEFT JOIN users u ON t.assigned_to = u.id
      LEFT JOIN sla_policies sp ON t.sla_policy_id = sp.id
      WHERE t.organization_id = ?
    `;
    const params = [orgId];

    if (filters.search) {
      query += ` AND (t.ticket_number LIKE ? OR t.subject LIKE ? OR t.description LIKE ? OR c.name LIKE ? OR ct.email LIKE ?)`;
      const term = `%${filters.search}%`;
      params.push(term, term, term, term, term);
    }

    if (filters.status && filters.status !== 'all') {
      if (filters.status === 'open_all') {
        query += ` AND t.status IN ('new', 'open', 'pending_customer', 'on_hold')`;
      } else {
        query += ` AND t.status = ?`;
        params.push(filters.status);
      }
    }

    if (filters.priority && filters.priority !== 'all') {
      query += ` AND t.priority = ?`;
      params.push(filters.priority);
    }

    if (filters.channel && filters.channel !== 'all') {
      query += ` AND t.channel = ?`;
      params.push(filters.channel);
    }

    if (filters.category && filters.category !== 'all') {
      query += ` AND t.category = ?`;
      params.push(filters.category);
    }

    if (filters.assignedTo) {
      query += ` AND t.assigned_to = ?`;
      params.push(filters.assignedTo);
    }

    if (filters.slaStatus && filters.slaStatus !== 'all') {
      query += ` AND t.sla_status = ?`;
      params.push(filters.slaStatus);
    }

    query += ` ORDER BY 
      CASE t.priority 
        WHEN 'urgent' THEN 1 
        WHEN 'high' THEN 2 
        WHEN 'medium' THEN 3 
        WHEN 'low' THEN 4 
      END ASC, 
      t.created_at DESC`;

    const [rows] = await pool.query(query, params);

    // Compute dynamic SLA statuses
    const now = new Date();
    return rows.map(row => {
      const ticket = this.formatDates(row);
      if (ticket.status !== 'resolved' && ticket.status !== 'closed' && row.resolution_due_at) {
        const due = new Date(row.resolution_due_at);
        if (now > due) {
          ticket.sla_status = 'breached';
        } else if (due - now < 3600000 * 2) { // Less than 2 hours remaining
          ticket.sla_status = 'approaching_breach';
        } else {
          ticket.sla_status = 'within_sla';
        }
      }
      return ticket;
    });
  }

  /**
   * Get single ticket with complete message thread and details
   */
  static async getTicketById(orgId, ticketId) {
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT 
        t.*,
        c.name AS company_name,
        c.domain AS company_domain,
        CONCAT(ct.first_name, ' ', ct.last_name) AS contact_name,
        ct.email AS contact_email,
        ct.phone AS contact_phone,
        CONCAT(u.first_name, ' ', u.last_name) AS assignee_name,
        u.email AS assignee_email,
        sp.name AS sla_policy_name,
        sp.first_response_time_minutes,
        sp.resolution_time_minutes
      FROM tickets t
      LEFT JOIN companies c ON t.company_id = c.id
      LEFT JOIN contacts ct ON t.contact_id = ct.id
      LEFT JOIN users u ON t.assigned_to = u.id
      LEFT JOIN sla_policies sp ON t.sla_policy_id = sp.id
      WHERE t.id = ? AND t.organization_id = ?
      LIMIT 1;`,
      [ticketId, orgId]
    );

    if (rows.length === 0) return null;
    const ticket = this.formatDates(rows[0]);

    // Fetch conversation thread messages
    const [messages] = await pool.query(
      `SELECT 
        tm.*,
        CONCAT(u.first_name, ' ', u.last_name) AS agent_name,
        CONCAT(ct.first_name, ' ', ct.last_name) AS contact_name
      FROM ticket_messages tm
      LEFT JOIN users u ON tm.sender_user_id = u.id
      LEFT JOIN contacts ct ON tm.sender_contact_id = ct.id
      WHERE tm.ticket_id = ? AND tm.organization_id = ?
      ORDER BY tm.created_at ASC;`,
      [ticketId, orgId]
    );

    ticket.messages = messages.map(m => this.formatDates(m));
    return ticket;
  }

  /**
   * Create a new ticket with SLA matching and initial message
   */
  static async createTicket(orgId, userId, data) {
    const pool = getPool();

    // 1. Generate unique ticket number
    const [countRows] = await pool.query(
      'SELECT COUNT(*) AS total FROM tickets WHERE organization_id = ?;',
      [orgId]
    );
    const nextNum = (countRows[0]?.total || 0) + 1001;
    const ticketNumber = `TCK-${nextNum}`;

    // 2. Match appropriate SLA policy
    const priority = data.priority || 'medium';
    let slaPolicyId = data.slaPolicyId || null;
    let firstResponseDue = null;
    let resolutionDue = null;

    if (!slaPolicyId) {
      const [slaRows] = await pool.query(
        'SELECT * FROM sla_policies WHERE organization_id = ? AND priority = ? LIMIT 1;',
        [orgId, priority]
      );
      if (slaRows.length > 0) {
        slaPolicyId = slaRows[0].id;
        firstResponseDue = new Date(Date.now() + slaRows[0].first_response_time_minutes * 60000);
        resolutionDue = new Date(Date.now() + slaRows[0].resolution_time_minutes * 60000);
      } else {
        const [defaultSla] = await pool.query(
          'SELECT * FROM sla_policies WHERE organization_id = ? AND is_default = TRUE LIMIT 1;',
          [orgId]
        );
        if (defaultSla.length > 0) {
          slaPolicyId = defaultSla[0].id;
          firstResponseDue = new Date(Date.now() + defaultSla[0].first_response_time_minutes * 60000);
          resolutionDue = new Date(Date.now() + defaultSla[0].resolution_time_minutes * 60000);
        }
      }
    }

    const [result] = await pool.query(
      `INSERT INTO tickets 
        (organization_id, ticket_number, subject, description, status, priority, channel, category, company_id, contact_id, deal_id, assigned_to, sla_policy_id, first_response_due_at, resolution_due_at, tags_json, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        orgId,
        ticketNumber,
        data.subject,
        data.description,
        data.status || 'new',
        priority,
        data.channel || 'web_portal',
        data.category || 'General Support',
        data.companyId || null,
        data.contactId || null,
        data.dealId || null,
        data.assignedTo || null,
        slaPolicyId,
        firstResponseDue,
        resolutionDue,
        data.tags ? JSON.stringify(data.tags) : null,
        userId || null,
      ]
    );

    const ticketId = result.insertId;

    // 3. Add initial customer message if created by/on-behalf of contact
    let senderName = 'Customer';
    let senderEmail = null;
    if (data.contactId) {
      const [contact] = await pool.query('SELECT first_name, last_name, email FROM contacts WHERE id = ?;', [data.contactId]);
      if (contact.length > 0) {
        senderName = `${contact[0].first_name} ${contact[0].last_name}`;
        senderEmail = contact[0].email;
      }
    } else if (userId) {
      const [user] = await pool.query('SELECT first_name, last_name, email FROM users WHERE id = ?;', [userId]);
      if (user.length > 0) {
        senderName = `${user[0].first_name} ${user[0].last_name}`;
        senderEmail = user[0].email;
      }
    }

    await pool.query(
      `INSERT INTO ticket_messages 
        (organization_id, ticket_id, sender_type, sender_user_id, sender_contact_id, sender_name, sender_email, message_type, body_text, channel)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'public_reply', ?, ?);`,
      [
        orgId,
        ticketId,
        data.contactId ? 'customer' : 'agent',
        data.contactId ? null : userId,
        data.contactId || null,
        senderName,
        senderEmail,
        data.description,
        data.channel || 'web_portal',
      ]
    );

    // 4. Log to unified timeline activities table (§10)
    await pool.query(
      `INSERT INTO activities (organization_id, actor_id, record_type, record_id, activity_type, payload_json)
       VALUES (?, ?, 'ticket', ?, 'creation', ?);`,
      [
        orgId,
        userId || null,
        ticketId,
        JSON.stringify({
          title: `Support Ticket Created: ${ticketNumber}`,
          subject: data.subject,
          priority,
          channel: data.channel || 'web_portal',
          category: data.category || 'General Support',
        }),
      ]
    );

    return this.getTicketById(orgId, ticketId);
  }

  /**
   * Update ticket fields (priority, category, assignee, etc.)
   */
  static async updateTicket(orgId, ticketId, data) {
    const pool = getPool();
    const updates = [];
    const params = [];

    if (data.subject !== undefined) { updates.push('subject = ?'); params.push(data.subject); }
    if (data.description !== undefined) { updates.push('description = ?'); params.push(data.description); }
    if (data.priority !== undefined) { updates.push('priority = ?'); params.push(data.priority); }
    if (data.channel !== undefined) { updates.push('channel = ?'); params.push(data.channel); }
    if (data.category !== undefined) { updates.push('category = ?'); params.push(data.category); }
    if (data.assignedTo !== undefined) { updates.push('assigned_to = ?'); params.push(data.assignedTo || null); }
    if (data.companyId !== undefined) { updates.push('company_id = ?'); params.push(data.companyId || null); }
    if (data.contactId !== undefined) { updates.push('contact_id = ?'); params.push(data.contactId || null); }
    if (data.tags !== undefined) { updates.push('tags_json = ?'); params.push(JSON.stringify(data.tags)); }

    if (updates.length > 0) {
      params.push(ticketId, orgId);
      await pool.query(
        `UPDATE tickets SET ${updates.join(', ')} WHERE id = ? AND organization_id = ?;`,
        params
      );
    }

    return this.getTicketById(orgId, ticketId);
  }

  /**
   * Update ticket lifecycle status with resolution timestamps & timeline event
   */
  static async updateTicketStatus(orgId, ticketId, status, userId) {
    const pool = getPool();
    const validStatuses = ['new', 'open', 'pending_customer', 'on_hold', 'resolved', 'closed'];
    if (!validStatuses.includes(status)) {
      throw new Error(`Invalid status "${status}". Allowed: ${validStatuses.join(', ')}`);
    }

    const updates = ['status = ?'];
    const params = [status];

    if (status === 'resolved') {
      updates.push('resolved_at = COALESCE(resolved_at, NOW())');
    } else if (status === 'closed') {
      updates.push('closed_at = COALESCE(closed_at, NOW())');
      updates.push('resolved_at = COALESCE(resolved_at, NOW())');
    } else if (['open', 'pending_customer', 'on_hold'].includes(status)) {
      // Re-opening ticket
      updates.push('resolved_at = NULL');
      updates.push('closed_at = NULL');
    }

    params.push(ticketId, orgId);
    await pool.query(
      `UPDATE tickets SET ${updates.join(', ')} WHERE id = ? AND organization_id = ?;`,
      params
    );

    // Log status change activity
    await pool.query(
      `INSERT INTO activities (organization_id, actor_id, record_type, record_id, activity_type, payload_json)
       VALUES (?, ?, 'ticket', ?, 'status_change', ?);`,
      [
        orgId,
        userId || null,
        ticketId,
        JSON.stringify({
          title: `Ticket Status Updated to ${status.replace('_', ' ').toUpperCase()}`,
          status,
          updatedBy: userId,
        }),
      ]
    );

    return this.getTicketById(orgId, ticketId);
  }

  /**
   * Add message to conversation thread (public reply or internal note)
   */
  static async addTicketMessage(orgId, ticketId, userId, messageData) {
    const pool = getPool();

    // Verify ticket exists
    const [ticketRows] = await pool.query(
      'SELECT id, status, first_responded_at FROM tickets WHERE id = ? AND organization_id = ? LIMIT 1;',
      [ticketId, orgId]
    );
    if (ticketRows.length === 0) throw new Error('Ticket not found');
    const ticket = ticketRows[0];

    // Determine sender details
    let senderType = messageData.senderType || 'agent';
    let senderName = messageData.senderName || 'Agent';
    let senderEmail = messageData.senderEmail || null;
    let senderUserId = userId || null;
    let senderContactId = messageData.senderContactId || null;

    if (userId && (!messageData.senderName || senderType === 'agent')) {
      const [user] = await pool.query('SELECT first_name, last_name, email FROM users WHERE id = ?;', [userId]);
      if (user.length > 0) {
        senderName = `${user[0].first_name} ${user[0].last_name}`;
        senderEmail = user[0].email;
        senderUserId = userId;
      }
    }

    const messageType = messageData.messageType || 'public_reply';

    const [res] = await pool.query(
      `INSERT INTO ticket_messages 
        (organization_id, ticket_id, sender_type, sender_user_id, sender_contact_id, sender_name, sender_email, message_type, body_text, body_html, channel)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        orgId,
        ticketId,
        senderType,
        senderUserId,
        senderContactId,
        senderName,
        senderEmail,
        messageType,
        messageData.bodyText,
        messageData.bodyHtml || null,
        messageData.channel || 'web_portal',
      ]
    );

    // If agent posts public reply:
    // 1. Mark first_responded_at if null
    // 2. Automatically transition status from 'new' to 'pending_customer' or 'open'
    if (senderType === 'agent' && messageType === 'public_reply') {
      const ticketUpdates = [];
      const ticketParams = [];

      if (!ticket.first_responded_at) {
        ticketUpdates.push('first_responded_at = NOW()');
      }

      if (messageData.newStatus) {
        ticketUpdates.push('status = ?');
        ticketParams.push(messageData.newStatus);
      } else if (ticket.status === 'new') {
        ticketUpdates.push("status = 'pending_customer'");
      }

      if (ticketUpdates.length > 0) {
        ticketParams.push(ticketId, orgId);
        await pool.query(
          `UPDATE tickets SET ${ticketUpdates.join(', ')} WHERE id = ? AND organization_id = ?;`,
          ticketParams
        );
      }
    }

    // Log activity
    await pool.query(
      `INSERT INTO activities (organization_id, actor_id, record_type, record_id, activity_type, payload_json)
       VALUES (?, ?, 'ticket', ?, ?, ?);`,
      [
        orgId,
        userId || null,
        ticketId,
        messageType === 'internal_note' ? 'note' : 'email',
        JSON.stringify({
          title: messageType === 'internal_note' ? 'Internal Support Note' : 'Public Support Reply',
          sender: senderName,
          channel: messageData.channel || 'web_portal',
          snippet: messageData.bodyText.substring(0, 120),
        }),
      ]
    );

    return this.getTicketById(orgId, ticketId);
  }

  /**
   * Submit CSAT rating and comment
   */
  static async submitCsat(orgId, ticketId, csatScore, csatComment) {
    const pool = getPool();
    const score = parseInt(csatScore, 10);
    if (isNaN(score) || score < 1 || score > 5) {
      throw new Error('CSAT score must be an integer between 1 and 5');
    }

    await pool.query(
      `UPDATE tickets 
       SET csat_score = ?, csat_comment = ?, status = 'closed', closed_at = COALESCE(closed_at, NOW())
       WHERE id = ? AND organization_id = ?;`,
      [score, csatComment || null, ticketId, orgId]
    );

    await pool.query(
      `INSERT INTO activities (organization_id, actor_id, record_type, record_id, activity_type, payload_json)
       VALUES (?, NULL, 'ticket', ?, 'status_change', ?);`,
      [
        orgId,
        ticketId,
        JSON.stringify({
          title: `CSAT Rating Received: ${score}/5 Stars`,
          score,
          comment: csatComment || '',
        }),
      ]
    );

    return this.getTicketById(orgId, ticketId);
  }

  /**
   * Delete ticket
   */
  static async deleteTicket(orgId, ticketId) {
    const pool = getPool();
    const [result] = await pool.query(
      'DELETE FROM tickets WHERE id = ? AND organization_id = ?;',
      [ticketId, orgId]
    );
    return result.affectedRows > 0;
  }

  // -------------------------------------------------------------------
  // SLA POLICIES
  // -------------------------------------------------------------------

  static async getSlaPolicies(orgId) {
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT sp.*, (SELECT COUNT(*) FROM tickets t WHERE t.sla_policy_id = sp.id) AS ticket_count
       FROM sla_policies sp
       WHERE sp.organization_id = ?
       ORDER BY sp.priority ASC;`,
      [orgId]
    );
    return rows.map(r => this.formatDates(r));
  }

  static async createSlaPolicy(orgId, data) {
    const pool = getPool();
    const [res] = await pool.query(
      `INSERT INTO sla_policies (organization_id, name, description, priority, first_response_time_minutes, resolution_time_minutes, business_hours_only, is_default)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        orgId,
        data.name,
        data.description || null,
        data.priority || 'medium',
        data.firstResponseTimeMinutes || 240,
        data.resolutionTimeMinutes || 1440,
        data.businessHoursOnly ? true : false,
        data.isDefault ? true : false,
      ]
    );
    const [created] = await pool.query('SELECT * FROM sla_policies WHERE id = ?;', [res.insertId]);
    return this.formatDates(created[0]);
  }

  static async updateSlaPolicy(orgId, id, data) {
    const pool = getPool();
    const updates = [];
    const params = [];

    if (data.name !== undefined) { updates.push('name = ?'); params.push(data.name); }
    if (data.description !== undefined) { updates.push('description = ?'); params.push(data.description); }
    if (data.priority !== undefined) { updates.push('priority = ?'); params.push(data.priority); }
    if (data.firstResponseTimeMinutes !== undefined) { updates.push('first_response_time_minutes = ?'); params.push(data.firstResponseTimeMinutes); }
    if (data.resolutionTimeMinutes !== undefined) { updates.push('resolution_time_minutes = ?'); params.push(data.resolutionTimeMinutes); }
    if (data.businessHoursOnly !== undefined) { updates.push('business_hours_only = ?'); params.push(data.businessHoursOnly); }
    if (data.isDefault !== undefined) { updates.push('is_default = ?'); params.push(data.isDefault); }

    if (updates.length > 0) {
      params.push(id, orgId);
      await pool.query(`UPDATE sla_policies SET ${updates.join(', ')} WHERE id = ? AND organization_id = ?;`, params);
    }
    const [updated] = await pool.query('SELECT * FROM sla_policies WHERE id = ?;', [id]);
    return this.formatDates(updated[0]);
  }

  // -------------------------------------------------------------------
  // CANNED RESPONSES & SNIPPETS
  // -------------------------------------------------------------------

  static async getCannedResponses(orgId, category = null) {
    const pool = getPool();
    let query = 'SELECT * FROM canned_responses WHERE organization_id = ?';
    const params = [orgId];
    if (category && category !== 'all') {
      query += ' AND category = ?';
      params.push(category);
    }
    query += ' ORDER BY title ASC;';
    const [rows] = await pool.query(query, params);
    return rows.map(r => this.formatDates(r));
  }

  static async createCannedResponse(orgId, userId, data) {
    const pool = getPool();
    const [res] = await pool.query(
      `INSERT INTO canned_responses (organization_id, title, shortcut, category, body_text, created_by, is_shared)
       VALUES (?, ?, ?, ?, ?, ?, ?);`,
      [
        orgId,
        data.title,
        data.shortcut,
        data.category || 'General',
        data.bodyText,
        userId || null,
        data.isShared !== undefined ? data.isShared : true,
      ]
    );
    const [created] = await pool.query('SELECT * FROM canned_responses WHERE id = ?;', [res.insertId]);
    return this.formatDates(created[0]);
  }

  static async deleteCannedResponse(orgId, id) {
    const pool = getPool();
    const [res] = await pool.query('DELETE FROM canned_responses WHERE id = ? AND organization_id = ?;', [id, orgId]);
    return res.affectedRows > 0;
  }

  // -------------------------------------------------------------------
  // KNOWLEDGE BASE ARTICLES
  // -------------------------------------------------------------------

  static async getKbArticles(orgId, search = null, category = null) {
    const pool = getPool();
    let query = 'SELECT * FROM kb_articles WHERE organization_id = ? AND status = "published"';
    const params = [orgId];

    if (search) {
      query += ' AND (title LIKE ? OR content LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    if (category && category !== 'all') {
      query += ' AND category = ?';
      params.push(category);
    }

    query += ' ORDER BY helpful_count DESC, created_at DESC;';
    const [rows] = await pool.query(query, params);
    return rows.map(r => this.formatDates(r));
  }

  static async getKbArticleById(orgId, id) {
    const pool = getPool();
    await pool.query('UPDATE kb_articles SET view_count = view_count + 1 WHERE id = ? AND organization_id = ?;', [id, orgId]);
    const [rows] = await pool.query('SELECT * FROM kb_articles WHERE id = ? AND organization_id = ? LIMIT 1;', [id, orgId]);
    return rows.length > 0 ? this.formatDates(rows[0]) : null;
  }

  static async createKbArticle(orgId, userId, data) {
    const pool = getPool();
    const slug = (data.title || 'article').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const [res] = await pool.query(
      `INSERT INTO kb_articles (organization_id, title, slug, category, content, status, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?);`,
      [orgId, data.title, slug, data.category || 'Guides', data.content, data.status || 'published', userId || null]
    );
    const [created] = await pool.query('SELECT * FROM kb_articles WHERE id = ?;', [res.insertId]);
    return this.formatDates(created[0]);
  }

  static async markArticleHelpful(orgId, id) {
    const pool = getPool();
    await pool.query('UPDATE kb_articles SET helpful_count = helpful_count + 1 WHERE id = ? AND organization_id = ?;', [id, orgId]);
    const [updated] = await pool.query('SELECT * FROM kb_articles WHERE id = ?;', [id]);
    return this.formatDates(updated[0]);
  }

  // -------------------------------------------------------------------
  // SUPPORT OPERATIONS & SLA METRICS (§26)
  // -------------------------------------------------------------------

  static async getSupportMetrics(orgId) {
    const pool = getPool();

    // Summary counts
    const [summaryRows] = await pool.query(
      `SELECT
        COUNT(*) AS total_tickets,
        COUNT(CASE WHEN status IN ('new', 'open') THEN 1 END) AS open_tickets,
        COUNT(CASE WHEN status = 'pending_customer' THEN 1 END) AS pending_customer_tickets,
        COUNT(CASE WHEN status = 'resolved' THEN 1 END) AS resolved_tickets,
        COUNT(CASE WHEN status = 'closed' THEN 1 END) AS closed_tickets,
        COUNT(CASE WHEN priority = 'urgent' AND status NOT IN ('resolved', 'closed') THEN 1 END) AS urgent_backlog,
        AVG(CASE WHEN csat_score IS NOT NULL THEN csat_score END) AS avg_csat_score,
        COUNT(CASE WHEN csat_score IS NOT NULL THEN 1 END) AS csat_responses,
        AVG(CASE WHEN resolved_at IS NOT NULL THEN TIMESTAMPDIFF(MINUTE, created_at, resolved_at) END) AS avg_resolution_minutes
      FROM tickets
      WHERE organization_id = ?;`,
      [orgId]
    );

    const summary = summaryRows[0] || {};

    // SLA compliance
    const [slaRows] = await pool.query(
      `SELECT
        COUNT(*) AS total_resolved,
        COUNT(CASE WHEN resolved_at <= resolution_due_at THEN 1 END) AS resolved_within_sla
      FROM tickets
      WHERE organization_id = ? AND resolved_at IS NOT NULL AND resolution_due_at IS NOT NULL;`,
      [orgId]
    );

    const totalResolved = slaRows[0]?.total_resolved || 0;
    const withinSla = slaRows[0]?.resolved_within_sla || 0;
    const slaCompliancePercent = totalResolved > 0 ? ((withinSla / totalResolved) * 100).toFixed(1) : 100.0;

    // By Channel
    const [channelRows] = await pool.query(
      `SELECT channel, COUNT(*) AS count 
       FROM tickets 
       WHERE organization_id = ? 
       GROUP BY channel;`,
      [orgId]
    );

    // By Priority
    const [priorityRows] = await pool.query(
      `SELECT priority, COUNT(*) AS count 
       FROM tickets 
       WHERE organization_id = ? 
       GROUP BY priority;`,
      [orgId]
    );

    // By Category
    const [categoryRows] = await pool.query(
      `SELECT category, COUNT(*) AS count 
       FROM tickets 
       WHERE organization_id = ? 
       GROUP BY category;`,
      [orgId]
    );

    return {
      totalTickets: summary.total_tickets || 0,
      openTickets: summary.open_tickets || 0,
      pendingCustomerTickets: summary.pending_customer_tickets || 0,
      resolvedTickets: summary.resolved_tickets || 0,
      closedTickets: summary.closed_tickets || 0,
      urgentBacklog: summary.urgent_backlog || 0,
      avgCsatScore: summary.avg_csat_score ? parseFloat(summary.avg_csat_score).toFixed(1) : '5.0',
      csatResponses: summary.csat_responses || 0,
      avgResolutionHours: summary.avg_resolution_minutes ? (summary.avg_resolution_minutes / 60).toFixed(1) : '0.0',
      slaCompliancePercent: parseFloat(slaCompliancePercent),
      byChannel: channelRows,
      byPriority: priorityRows,
      byCategory: categoryRows,
    };
  }
}
