import { getPool } from '../../config/db.js';
import { WorkflowEngine } from './workflow.engine.js';

export class WorkflowsService {
  /**
   * List all workflows for an organization with condition and action counts
   */
  static async listWorkflows(orgId, { status, objectType, search } = {}) {
    const pool = getPool();
    let query = `
      SELECT w.*,
             CONCAT(u.first_name, ' ', u.last_name) AS creator_name,
             (SELECT COUNT(*) FROM workflow_conditions wc WHERE wc.workflow_id = w.id) AS conditions_count,
             (SELECT COUNT(*) FROM workflow_actions wa WHERE wa.workflow_id = w.id) AS actions_count,
             (SELECT COUNT(*) FROM workflow_executions we WHERE we.workflow_id = w.id) AS executions_count,
             (SELECT MAX(started_at) FROM workflow_executions we WHERE we.workflow_id = w.id) AS last_executed_at
      FROM workflows w
      LEFT JOIN users u ON u.id = w.created_by
      WHERE w.organization_id = ?
    `;
    const params = [orgId];

    if (status) {
      query += ' AND w.status = ?';
      params.push(status);
    }
    if (objectType) {
      query += ' AND w.object_type = ?';
      params.push(objectType);
    }
    if (search) {
      query += ' AND (w.name LIKE ? OR w.description LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY w.updated_at DESC;';
    const [rows] = await pool.query(query, params);
    return rows;
  }

  /**
   * Get workflow by ID including its conditions and actions
   */
  static async getWorkflowById(orgId, id) {
    const pool = getPool();

    const [workflows] = await pool.query(
      `SELECT w.*, CONCAT(u.first_name, ' ', u.last_name) AS creator_name
       FROM workflows w
       LEFT JOIN users u ON u.id = w.created_by
       WHERE w.id = ? AND w.organization_id = ?;`,
      [id, orgId]
    );

    if (workflows.length === 0) return null;
    const workflow = workflows[0];

    // Fetch conditions
    const [conditions] = await pool.query(
      'SELECT * FROM workflow_conditions WHERE workflow_id = ? ORDER BY condition_group ASC, sort_order ASC;',
      [id]
    );

    // Fetch actions
    const [actions] = await pool.query(
      'SELECT * FROM workflow_actions WHERE workflow_id = ? ORDER BY sort_order ASC;',
      [id]
    );

    const parsedActions = actions.map((a) => ({
      ...a,
      config: typeof a.config_json === 'string' ? JSON.parse(a.config_json) : a.config_json,
    }));

    return {
      ...workflow,
      conditions,
      actions: parsedActions,
    };
  }

  /**
   * Create a new automation workflow
   */
  static async createWorkflow(orgId, actorId, data) {
    const pool = getPool();
    const {
      name,
      description = '',
      objectType,
      triggerType,
      triggerConfig = null,
      status = 'published',
      conditions = [],
      actions = [],
    } = data;

    if (!name || !objectType || !triggerType) {
      throw new Error('Name, objectType, and triggerType are required.');
    }

    const [res] = await pool.query(
      `INSERT INTO workflows (organization_id, name, description, object_type, trigger_type, trigger_config_json, status, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        orgId,
        name.trim(),
        description.trim(),
        objectType,
        triggerType,
        triggerConfig ? JSON.stringify(triggerConfig) : null,
        status,
        actorId || null,
      ]
    );

    const workflowId = res.insertId;

    // Insert conditions
    if (Array.isArray(conditions) && conditions.length > 0) {
      for (let i = 0; i < conditions.length; i++) {
        const c = conditions[i];
        await pool.query(
          `INSERT INTO workflow_conditions (workflow_id, condition_group, field, operator, value, logic, sort_order)
           VALUES (?, ?, ?, ?, ?, ?, ?);`,
          [
            workflowId,
            c.conditionGroup || 1,
            c.field,
            c.operator || 'equals',
            c.value !== undefined ? String(c.value) : '',
            c.logic || 'AND',
            i + 1,
          ]
        );
      }
    }

    // Insert actions
    if (Array.isArray(actions) && actions.length > 0) {
      for (let i = 0; i < actions.length; i++) {
        const a = actions[i];
        await pool.query(
          `INSERT INTO workflow_actions (workflow_id, sort_order, action_type, config_json)
           VALUES (?, ?, ?, ?);`,
          [workflowId, i + 1, a.actionType, JSON.stringify(a.config || {})]
        );
      }
    }

    return this.getWorkflowById(orgId, workflowId);
  }

  /**
   * Update workflow details, status, or rule configurations
   */
  static async updateWorkflow(orgId, id, data) {
    const pool = getPool();
    const existing = await this.getWorkflowById(orgId, id);
    if (!existing) return null;

    const {
      name,
      description,
      objectType,
      triggerType,
      triggerConfig,
      status,
      conditions,
      actions,
    } = data;

    await pool.query(
      `UPDATE workflows 
       SET name = COALESCE(?, name),
           description = COALESCE(?, description),
           object_type = COALESCE(?, object_type),
           trigger_type = COALESCE(?, trigger_type),
           trigger_config_json = COALESCE(?, trigger_config_json),
           status = COALESCE(?, status),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND organization_id = ?;`,
      [
        name ? name.trim() : null,
        description !== undefined ? description.trim() : null,
        objectType || null,
        triggerType || null,
        triggerConfig ? JSON.stringify(triggerConfig) : null,
        status || null,
        id,
        orgId,
      ]
    );

    // Replace conditions if provided
    if (Array.isArray(conditions)) {
      await pool.query('DELETE FROM workflow_conditions WHERE workflow_id = ?;', [id]);
      for (let i = 0; i < conditions.length; i++) {
        const c = conditions[i];
        await pool.query(
          `INSERT INTO workflow_conditions (workflow_id, condition_group, field, operator, value, logic, sort_order)
           VALUES (?, ?, ?, ?, ?, ?, ?);`,
          [
            id,
            c.conditionGroup || 1,
            c.field,
            c.operator || 'equals',
            c.value !== undefined ? String(c.value) : '',
            c.logic || 'AND',
            i + 1,
          ]
        );
      }
    }

    // Replace actions if provided
    if (Array.isArray(actions)) {
      await pool.query('DELETE FROM workflow_actions WHERE workflow_id = ?;', [id]);
      for (let i = 0; i < actions.length; i++) {
        const a = actions[i];
        await pool.query(
          `INSERT INTO workflow_actions (workflow_id, sort_order, action_type, config_json)
           VALUES (?, ?, ?, ?);`,
          [id, i + 1, a.actionType, JSON.stringify(a.config || {})]
        );
      }
    }

    return this.getWorkflowById(orgId, id);
  }

  /**
   * Delete a workflow and associated configurations
   */
  static async deleteWorkflow(orgId, id) {
    const pool = getPool();
    const [res] = await pool.query(
      'DELETE FROM workflows WHERE id = ? AND organization_id = ?;',
      [id, orgId]
    );
    return res.affectedRows > 0;
  }

  /**
   * Get execution audit logs for a specific workflow
   */
  static async getExecutions(orgId, workflowId, limit = 50) {
    const pool = getPool();

    let query = `
      SELECT we.*, w.name AS workflow_name, w.object_type
      FROM workflow_executions we
      JOIN workflows w ON w.id = we.workflow_id
      WHERE we.organization_id = ?
    `;
    const params = [orgId];

    if (workflowId) {
      query += ' AND we.workflow_id = ?';
      params.push(workflowId);
    }

    query += ' ORDER BY we.started_at DESC LIMIT ?;';
    params.push(parseInt(limit, 10));

    const [executions] = await pool.query(query, params);

    // Fetch step details for each execution
    for (const exec of executions) {
      const [steps] = await pool.query(
        'SELECT * FROM workflow_execution_steps WHERE execution_id = ? ORDER BY id ASC;',
        [exec.id]
      );
      exec.steps = steps.map((s) => ({
        ...s,
        input: typeof s.input_json === 'string' ? JSON.parse(s.input_json) : s.input_json,
        output: typeof s.output_json === 'string' ? JSON.parse(s.output_json) : s.output_json,
      }));
    }

    return executions;
  }

  /**
   * Test-run / dry-run a workflow against a specific target record
   */
  static async testExecuteWorkflow(orgId, actorId, workflowId, recordId) {
    const pool = getPool();
    const workflow = await this.getWorkflowById(orgId, workflowId);
    if (!workflow) throw new Error('Workflow not found.');

    // Fetch record data
    let record = null;
    if (workflow.object_type === 'deal') {
      const [rows] = await pool.query('SELECT * FROM deals WHERE id = ? AND organization_id = ?;', [recordId, orgId]);
      record = rows[0];
    } else if (workflow.object_type === 'contact') {
      const [rows] = await pool.query('SELECT * FROM contacts WHERE id = ? AND organization_id = ?;', [recordId, orgId]);
      record = rows[0];
    } else if (workflow.object_type === 'company') {
      const [rows] = await pool.query('SELECT * FROM companies WHERE id = ? AND organization_id = ?;', [recordId, orgId]);
      record = rows[0];
    } else if (workflow.object_type === 'custom_record') {
      const [rows] = await pool.query('SELECT * FROM custom_records WHERE id = ? AND organization_id = ?;', [recordId, orgId]);
      if (rows[0]) {
        record = {
          ...rows[0],
          data: typeof rows[0].data_json === 'string' ? JSON.parse(rows[0].data_json) : rows[0].data_json,
        };
      }
    }

    if (!record) {
      throw new Error(`Target record #${recordId} for object "${workflow.object_type}" not found.`);
    }

    // Execute through engine
    return WorkflowEngine.executeWorkflow({
      workflow,
      orgId,
      recordId,
      record,
      triggerEvent: `manual.test_run`,
      actorId,
    });
  }
}
