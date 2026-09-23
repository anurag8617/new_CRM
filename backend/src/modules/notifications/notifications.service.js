import { getPool } from '../../config/db.js';

export class NotificationsService {
  /**
   * List notifications for a user with unread-first sorting
   */
  static async listNotifications(orgId, userId, { unreadOnly = false, limit = 30 } = {}) {
    const pool = getPool();
    let query = `
      SELECT n.*
      FROM notifications n
      WHERE n.organization_id = ? AND n.user_id = ?
    `;
    const params = [orgId, userId];

    if (unreadOnly) {
      query += ' AND n.is_read = FALSE';
    }

    query += ' ORDER BY n.is_read ASC, n.created_at DESC LIMIT ?;';
    params.push(parseInt(limit, 10));

    const [rows] = await pool.query(query, params);

    // Count unread
    const [unreadCountRow] = await pool.query(
      'SELECT COUNT(*) as unreadCount FROM notifications WHERE organization_id = ? AND user_id = ? AND is_read = FALSE;',
      [orgId, userId]
    );

    return {
      notifications: rows,
      unreadCount: unreadCountRow[0].unreadCount,
    };
  }

  /**
   * Create a notification for a user
   */
  static async createNotification(orgId, { userId, title, message, type = 'info', linkUrl = null }) {
    const pool = getPool();
    const [res] = await pool.query(
      `INSERT INTO notifications (organization_id, user_id, title, message, type, link_url)
       VALUES (?, ?, ?, ?, ?, ?);`,
      [orgId, userId, title.trim(), message.trim(), type, linkUrl]
    );

    const [rows] = await pool.query('SELECT * FROM notifications WHERE id = ?;', [res.insertId]);
    return rows[0];
  }

  /**
   * Mark a specific notification as read
   */
  static async markAsRead(orgId, userId, id) {
    const pool = getPool();
    const [res] = await pool.query(
      `UPDATE notifications 
       SET is_read = TRUE, read_at = CURRENT_TIMESTAMP 
       WHERE id = ? AND user_id = ? AND organization_id = ?;`,
      [id, userId, orgId]
    );
    return res.affectedRows > 0;
  }

  /**
   * Mark all notifications for user as read
   */
  static async markAllAsRead(orgId, userId) {
    const pool = getPool();
    const [res] = await pool.query(
      `UPDATE notifications 
       SET is_read = TRUE, read_at = CURRENT_TIMESTAMP 
       WHERE user_id = ? AND organization_id = ? AND is_read = FALSE;`,
      [userId, orgId]
    );
    return res.affectedRows;
  }

  /**
   * Delete a notification
   */
  static async deleteNotification(orgId, userId, id) {
    const pool = getPool();
    const [res] = await pool.query(
      'DELETE FROM notifications WHERE id = ? AND user_id = ? AND organization_id = ?;',
      [id, userId, orgId]
    );
    return res.affectedRows > 0;
  }
}
