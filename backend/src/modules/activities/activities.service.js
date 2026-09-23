import { getPool } from '../../config/db.js';

export class ActivitiesService {
  /**
   * List activities timeline for a specific record (contact, company, deal, etc.)
   */
  static async listForRecord({ orgId, recordType, recordId, limit = 50 }) {
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT a.id, a.record_type, a.record_id, a.activity_type, a.payload_json, a.created_at,
              CONCAT(u.first_name, ' ', u.last_name) AS actor_name,
              u.email AS actor_email
       FROM activities a
       LEFT JOIN users u ON a.actor_id = u.id
       WHERE a.organization_id = ? AND a.record_type = ? AND a.record_id = ?
       ORDER BY a.created_at DESC
       LIMIT ?;`,
      [orgId, recordType, recordId, parseInt(limit, 10)]
    );
    return rows;
  }

  /**
   * Add a new activity (note, call, meeting, etc.)
   */
  static async create({ orgId, actorId, recordType, recordId, activityType, payload }) {
    const pool = getPool();

    const [result] = await pool.query(
      `INSERT INTO activities (organization_id, record_type, record_id, activity_type, payload_json, actor_id)
       VALUES (?, ?, ?, ?, ?, ?);`,
      [orgId, recordType, recordId, activityType, JSON.stringify(payload), actorId || null]
    );

    const [rows] = await pool.query(
      `SELECT a.id, a.record_type, a.record_id, a.activity_type, a.payload_json, a.created_at,
              CONCAT(u.first_name, ' ', u.last_name) AS actor_name
       FROM activities a
       LEFT JOIN users u ON a.actor_id = u.id
       WHERE a.id = ?;`,
      [result.insertId]
    );

    return rows[0];
  }
}
