import { getPool } from '../../config/db.js';
import { eventBus } from '../../services/eventBus.js';

export class TasksService {
  /**
   * List tasks with multi-tenant filtering, status/priority filters, and pagination
   */
  static async listTasks(orgId, { status, priority, recordType, recordId, assignedTo, search, limit = 50, page = 1 } = {}) {
    const pool = getPool();
    const offset = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);
    const parsedLimit = parseInt(limit, 10);

    let query = `
      SELECT t.*,
             CONCAT(u_assigned.first_name, ' ', u_assigned.last_name) AS assigned_to_name,
             u_assigned.email AS assigned_to_email,
             CONCAT(u_creator.first_name, ' ', u_creator.last_name) AS created_by_name
      FROM tasks t
      LEFT JOIN users u_assigned ON u_assigned.id = t.assigned_to
      LEFT JOIN users u_creator ON u_creator.id = t.created_by
      WHERE t.organization_id = ?
    `;
    const params = [orgId];

    if (status && status !== 'all') {
      query += ' AND t.status = ?';
      params.push(status);
    }
    if (priority && priority !== 'all') {
      query += ' AND t.priority = ?';
      params.push(priority);
    }
    if (recordType && recordId) {
      query += ' AND t.record_type = ? AND t.record_id = ?';
      params.push(recordType, recordId);
    }
    if (assignedTo) {
      query += ' AND t.assigned_to = ?';
      params.push(assignedTo);
    }
    if (search && search.trim() !== '') {
      query += ' AND (t.title LIKE ? OR t.description LIKE ?)';
      params.push(`%${search.trim()}%`, `%${search.trim()}%`);
    }

    query += ' ORDER BY CASE t.priority WHEN "urgent" THEN 1 WHEN "high" THEN 2 WHEN "medium" THEN 3 ELSE 4 END ASC, t.due_date ASC, t.created_at DESC LIMIT ? OFFSET ?;';
    params.push(parsedLimit, offset);

    const [tasks] = await pool.query(query, params);

    // Count total for pagination
    const [countRow] = await pool.query(
      'SELECT COUNT(*) as total FROM tasks WHERE organization_id = ?;',
      [orgId]
    );

    return {
      tasks,
      pagination: {
        total: countRow[0].total,
        page: parseInt(page, 10),
        limit: parsedLimit,
        pages: Math.ceil(countRow[0].total / parsedLimit),
      },
    };
  }

  /**
   * Get single task by ID
   */
  static async getTaskById(orgId, id) {
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT t.*,
              CONCAT(u_assigned.first_name, ' ', u_assigned.last_name) AS assigned_to_name,
              u_assigned.email AS assigned_to_email,
              CONCAT(u_creator.first_name, ' ', u_creator.last_name) AS created_by_name
       FROM tasks t
       LEFT JOIN users u_assigned ON u_assigned.id = t.assigned_to
       LEFT JOIN users u_creator ON u_creator.id = t.created_by
       WHERE t.id = ? AND t.organization_id = ?;`,
      [id, orgId]
    );
    return rows[0] || null;
  }

  /**
   * Create new task and normalize into timeline activity if attached to a record
   */
  static async createTask(orgId, creatorId, data) {
    const pool = getPool();
    const {
      title,
      description = '',
      recordType = null,
      recordId = null,
      assignedTo = null,
      dueDate = null,
      priority = 'medium',
      status = 'pending',
    } = data;

    if (!title || !title.trim()) {
      throw new Error('Task title is required');
    }

    const [res] = await pool.query(
      `INSERT INTO tasks (organization_id, title, description, record_type, record_id, assigned_to, due_date, priority, status, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        orgId,
        title.trim(),
        description.trim(),
        recordType || null,
        recordId || null,
        assignedTo || creatorId || null,
        dueDate || null,
        priority,
        status,
        creatorId || null,
      ]
    );

    const taskId = res.insertId;

    // Normalize into activities (§10 Unified Timeline)
    if (recordType && recordId) {
      await pool.query(
        `INSERT INTO activities (organization_id, record_type, record_id, activity_type, payload_json, actor_id)
         VALUES (?, ?, ?, 'task', JSON_OBJECT('taskId', ?, 'title', ?, 'priority', ?, 'dueDate', ?, 'status', ?), ?);`,
        [orgId, recordType, recordId, taskId, title.trim(), priority, dueDate, status, creatorId || null]
      );
    }

    const createdTask = await this.getTaskById(orgId, taskId);

    // Emit event on EventBus
    eventBus.emitEvent('task.created', {
      orgId,
      recordType: recordType || 'task',
      recordId: taskId,
      record: createdTask,
      actorId: creatorId,
    });

    return createdTask;
  }

  /**
   * Update task fields and track status changes
   */
  static async updateTask(orgId, actorId, id, data) {
    const pool = getPool();
    const existing = await this.getTaskById(orgId, id);
    if (!existing) return null;

    const {
      title,
      description,
      assignedTo,
      dueDate,
      priority,
      status,
    } = data;

    const updates = [];
    const params = [];

    if (title !== undefined) {
      updates.push('title = ?');
      params.push(title.trim());
    }
    if (description !== undefined) {
      updates.push('description = ?');
      params.push(description.trim());
    }
    if (assignedTo !== undefined) {
      updates.push('assigned_to = ?');
      params.push(assignedTo || null);
    }
    if (dueDate !== undefined) {
      updates.push('due_date = ?');
      params.push(dueDate || null);
    }
    if (priority !== undefined) {
      updates.push('priority = ?');
      params.push(priority);
    }
    if (status !== undefined) {
      updates.push('status = ?');
      params.push(status);
      if (status === 'completed' && existing.status !== 'completed') {
        updates.push('completed_at = CURRENT_TIMESTAMP');
      } else if (status !== 'completed' && existing.status === 'completed') {
        updates.push('completed_at = NULL');
      }
    }

    if (updates.length === 0) return existing;

    params.push(id, orgId);
    await pool.query(
      `UPDATE tasks SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND organization_id = ?;`,
      params
    );

    // If status changed to completed, append timeline activity
    if (status === 'completed' && existing.status !== 'completed' && existing.record_type && existing.record_id) {
      await pool.query(
        `INSERT INTO activities (organization_id, record_type, record_id, activity_type, payload_json, actor_id)
         VALUES (?, ?, ?, 'task', JSON_OBJECT('taskId', ?, 'title', ?, 'action', 'completed'), ?);`,
        [orgId, existing.record_type, existing.record_id, id, existing.title, actorId || null]
      );
    }

    const updatedTask = await this.getTaskById(orgId, id);

    eventBus.emitEvent('task.updated', {
      orgId,
      recordType: existing.record_type || 'task',
      recordId: id,
      record: updatedTask,
      actorId,
    });

    return updatedTask;
  }

  /**
   * Delete task
   */
  static async deleteTask(orgId, id) {
    const pool = getPool();
    const [res] = await pool.query(
      'DELETE FROM tasks WHERE id = ? AND organization_id = ?;',
      [id, orgId]
    );
    return res.affectedRows > 0;
  }
}
