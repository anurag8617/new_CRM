import { getPool } from '../../config/db.js';
import { eventBus } from '../../services/eventBus.js';

/**
 * Evaluates a single condition rule against a record's attribute
 */
export function evaluateConditionRule(recordValue, operator, targetValue) {
  const normRecord = recordValue !== undefined && recordValue !== null ? recordValue : '';
  const normTarget = targetValue !== undefined && targetValue !== null ? targetValue : '';

  switch (operator) {
    case 'equals':
      return String(normRecord).trim().toLowerCase() === String(normTarget).trim().toLowerCase();

    case 'not_equals':
      return String(normRecord).trim().toLowerCase() !== String(normTarget).trim().toLowerCase();

    case 'contains':
      return String(normRecord).toLowerCase().includes(String(normTarget).toLowerCase());

    case 'greater_than': {
      const numRec = parseFloat(normRecord);
      const numTarget = parseFloat(normTarget);
      if (isNaN(numRec) || isNaN(numTarget)) return false;
      return numRec > numTarget;
    }

    case 'less_than': {
      const numRec = parseFloat(normRecord);
      const numTarget = parseFloat(normTarget);
      if (isNaN(numRec) || isNaN(numTarget)) return false;
      return numRec < numTarget;
    }

    case 'is_empty':
      return normRecord === '' || normRecord === null || normRecord === undefined;

    case 'is_not_empty':
      return normRecord !== '' && normRecord !== null && normRecord !== undefined;

    default:
      return true;
  }
}

/**
 * Replaces {{field}} template tokens with record values
 */
export function interpolateTemplate(template, data) {
  if (!template) return '';
  return template.replace(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g, (_, key) => {
    return data[key] !== undefined && data[key] !== null ? String(data[key]) : '';
  });
}

export class WorkflowEngine {
  /**
   * Initializes listeners on the central domain EventBus
   */
  static init() {
    console.log('[WorkflowEngine] 🚀 Initializing workflow trigger listeners on EventBus...');

    const eventToTriggerMap = {
      'deal.created': { objectType: 'deal', triggerType: 'record_created' },
      'deal.stage_changed': { objectType: 'deal', triggerType: 'stage_changed' },
      'deal.updated': { objectType: 'deal', triggerType: 'record_updated' },

      'contact.created': { objectType: 'contact', triggerType: 'record_created' },
      'contact.updated': { objectType: 'contact', triggerType: 'record_updated' },

      'company.created': { objectType: 'company', triggerType: 'record_created' },
      'company.updated': { objectType: 'company', triggerType: 'record_updated' },

      'custom_record.created': { objectType: 'custom_record', triggerType: 'record_created' },
      'custom_record.updated': { objectType: 'custom_record', triggerType: 'record_updated' },
    };

    for (const [eventName, meta] of Object.entries(eventToTriggerMap)) {
      eventBus.onEvent(eventName, async (payload) => {
        try {
          await WorkflowEngine.processEvent({
            eventName,
            objectType: meta.objectType,
            triggerType: meta.triggerType,
            payload,
          });
        } catch (err) {
          console.error(`[WorkflowEngine Error] Processing event "${eventName}":`, err);
        }
      });
    }

    console.log('[WorkflowEngine] ✅ Listeners registered successfully.');
  }

  /**
   * Dispatches workflows matching an event trigger
   */
  static async processEvent({ eventName, objectType, triggerType, payload }) {
    const { orgId, recordId, record, actorId } = payload;
    if (!orgId || !recordId) return;

    const pool = getPool();

    // Find all published workflows matching this object and trigger
    const [workflows] = await pool.query(
      `SELECT * FROM workflows 
       WHERE organization_id = ? AND object_type = ? AND trigger_type = ? AND status = 'published'
       ORDER BY id ASC;`,
      [orgId, objectType, triggerType]
    );

    if (workflows.length === 0) {
      return;
    }

    console.log(`[WorkflowEngine] Found ${workflows.length} workflow(s) for trigger "${objectType}.${triggerType}".`);

    for (const wf of workflows) {
      await WorkflowEngine.executeWorkflow({
        workflow: wf,
        orgId,
        recordId,
        record: record || {},
        triggerEvent: eventName,
        actorId: actorId || null,
      });
    }
  }

  /**
   * Executes a single workflow instance with condition checking and step tracking
   */
  static async executeWorkflow({ workflow, orgId, recordId, record, triggerEvent, actorId }) {
    const pool = getPool();
    const startTime = Date.now();

    // 1. Create Execution Record
    const [execResult] = await pool.query(
      `INSERT INTO workflow_executions 
       (workflow_id, organization_id, record_type, record_id, trigger_event, status, started_at)
       VALUES (?, ?, ?, ?, ?, 'running', CURRENT_TIMESTAMP);`,
      [workflow.id, orgId, workflow.object_type, recordId, triggerEvent]
    );
    const executionId = execResult.insertId;

    try {
      // 2. Fetch Conditions
      const [conditions] = await pool.query(
        `SELECT * FROM workflow_conditions 
         WHERE workflow_id = ? 
         ORDER BY condition_group ASC, sort_order ASC;`,
        [workflow.id]
      );

      // Flatten data for condition matching (including nested JSON attributes if custom record)
      const flatRecordData = {
        ...record,
        ...(record.data || {}),
      };

      // 3. Evaluate Conditions
      let conditionsPassed = true;
      if (conditions.length > 0) {
        // Group by condition_group
        const groups = {};
        for (const c of conditions) {
          const g = c.condition_group || 1;
          if (!groups[g]) groups[g] = [];
          groups[g].push(c);
        }

        // Each group must evaluate to true
        for (const grpConditions of Object.values(groups)) {
          let grpResult = null;
          for (const cond of grpConditions) {
            const val = flatRecordData[cond.field];
            const condMet = evaluateConditionRule(val, cond.operator, cond.value);

            if (grpResult === null) {
              grpResult = condMet;
            } else if (cond.logic === 'OR') {
              grpResult = grpResult || condMet;
            } else {
              grpResult = grpResult && condMet;
            }
          }
          if (grpResult === false) {
            conditionsPassed = false;
            break;
          }
        }
      }

      // If condition check failed, mark execution skipped
      if (!conditionsPassed) {
        await pool.query(
          `UPDATE workflow_executions 
           SET status = 'skipped', finished_at = CURRENT_TIMESTAMP, error_message = 'Conditions not met.'
           WHERE id = ?;`,
          [executionId]
        );
        console.log(`[WorkflowEngine] Workflow #${workflow.id} ("${workflow.name}") skipped (conditions not met).`);
        return { executionId, status: 'skipped' };
      }

      // 4. Fetch Actions
      const [actions] = await pool.query(
        `SELECT * FROM workflow_actions 
         WHERE workflow_id = ? 
         ORDER BY sort_order ASC;`,
        [workflow.id]
      );

      console.log(`[WorkflowEngine] Executing ${actions.length} action(s) for Workflow #${workflow.id} ("${workflow.name}").`);

      // 5. Execute Action Chain Sequentially
      for (const act of actions) {
        const stepStart = Date.now();
        const config = typeof act.config_json === 'string' ? JSON.parse(act.config_json) : act.config_json;

        try {
          const stepOutput = await WorkflowEngine.executeActionStep({
            orgId,
            actorId,
            recordType: workflow.object_type,
            recordId,
            recordData: flatRecordData,
            actionType: act.action_type,
            config,
          });

          const durationMs = Date.now() - stepStart;

          // Record successful step
          await pool.query(
            `INSERT INTO workflow_execution_steps 
             (execution_id, action_id, action_type, status, input_json, output_json, duration_ms, executed_at)
             VALUES (?, ?, ?, 'completed', ?, ?, ?, CURRENT_TIMESTAMP);`,
            [executionId, act.id, act.action_type, JSON.stringify(config), JSON.stringify(stepOutput), durationMs]
          );
        } catch (stepErr) {
          const durationMs = Date.now() - stepStart;
          await pool.query(
            `INSERT INTO workflow_execution_steps 
             (execution_id, action_id, action_type, status, input_json, duration_ms, error_message, executed_at)
             VALUES (?, ?, ?, 'failed', ?, ?, ?, CURRENT_TIMESTAMP);`,
            [executionId, act.id, act.action_type, JSON.stringify(config), durationMs, stepErr.message]
          );
          throw stepErr; // trigger outer catch to mark execution failed
        }
      }

      // Mark execution completed
      await pool.query(
        `UPDATE workflow_executions 
         SET status = 'completed', finished_at = CURRENT_TIMESTAMP 
         WHERE id = ?;`,
        [executionId]
      );

      console.log(`[WorkflowEngine] ✅ Workflow #${workflow.id} completed successfully in ${Date.now() - startTime}ms.`);
      return { executionId, status: 'completed' };
    } catch (err) {
      console.error(`[WorkflowEngine Error] Workflow #${workflow.id} execution failed:`, err);
      await pool.query(
        `UPDATE workflow_executions 
         SET status = 'failed', finished_at = CURRENT_TIMESTAMP, error_message = ? 
         WHERE id = ?;`,
        [err.message, executionId]
      );
      return { executionId, status: 'failed', error: err.message };
    }
  }

  /**
   * Executes a single atomic action step
   */
  static async executeActionStep({ orgId, actorId, recordType, recordId, recordData, actionType, config }) {
    const pool = getPool();

    switch (actionType) {
      case 'create_note': {
        const rawNote = config.note || config.content || 'Automated workflow notification.';
        const noteContent = interpolateTemplate(rawNote, recordData);

        const [res] = await pool.query(
          `INSERT INTO activities (organization_id, record_type, record_id, activity_type, payload_json, actor_id)
           VALUES (?, ?, ?, 'note', JSON_OBJECT('content', ?, 'automated', true), ?);`,
          [orgId, recordType, recordId, noteContent, actorId || null]
        );

        return {
          activityId: res.insertId,
          content: noteContent,
          message: 'Timeline activity note created successfully',
        };
      }

      case 'update_field': {
        const fieldName = config.fieldName || config.field;
        const rawValue = config.value;
        const parsedValue = interpolateTemplate(String(rawValue), recordData);

        if (!fieldName) {
          throw new Error('Action configuration missing "fieldName" parameter.');
        }

        if (recordType === 'custom_record') {
          // Update JSON attribute in custom_records
          await pool.query(
            `UPDATE custom_records 
             SET data_json = JSON_SET(data_json, CONCAT('$.', ?), ?), updated_at = CURRENT_TIMESTAMP
             WHERE id = ? AND organization_id = ?;`,
            [fieldName, parsedValue, recordId, orgId]
          );
        } else {
          // Standard table update (contacts, deals, companies)
          const tableName = recordType === 'company' ? 'companies' : `${recordType}s`;
          // Basic whitelist verification of allowed columns to prevent SQL injection
          const allowedColumns = [
            'status', 'lifecycle_stage', 'lead_status', 'probability', 'win_loss_reason', 'notes',
            'city', 'state', 'industry', 'description'
          ];

          if (allowedColumns.includes(fieldName)) {
            await pool.query(
              `UPDATE \`${tableName}\` SET \`${fieldName}\` = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND organization_id = ?;`,
              [parsedValue, recordId, orgId]
            );
          } else {
            console.warn(`[WorkflowEngine] Column "${fieldName}" is not in whitelist for table "${tableName}". Skipping update.`);
          }
        }

        return {
          fieldUpdated: fieldName,
          newValue: parsedValue,
          message: `Field ${fieldName} updated to ${parsedValue}`,
        };
      }

      case 'send_notification': {
        const messageTemplate = config.message || 'Workflow notification alert';
        const formattedMsg = interpolateTemplate(messageTemplate, recordData);
        const titleTemplate = config.title || 'Workflow Automation Alert';
        const formattedTitle = interpolateTemplate(titleTemplate, recordData);

        if (actorId) {
          await pool.query(
            `INSERT INTO notifications (organization_id, user_id, title, message, type, link_url)
             VALUES (?, ?, ?, ?, ?, ?);`,
            [orgId, actorId, formattedTitle, formattedMsg, config.type || 'system', `/${recordType}s/${recordId}`]
          );
        }

        await pool.query(
          `INSERT INTO audit_logs (organization_id, actor_id, action, object_type, record_id, after_json)
           VALUES (?, ?, 'workflow.notification', ?, ?, JSON_OBJECT('message', ?, 'severity', ?));`,
          [orgId, actorId || null, recordType, recordId, formattedMsg, config.severity || 'info']
        );

        return {
          notification: formattedMsg,
          severity: config.severity || 'info',
        };
      }

      case 'create_task': {
        const titleTemplate = config.title || 'Follow up with {{title}}';
        const taskTitle = interpolateTemplate(titleTemplate, recordData);
        const descTemplate = config.description || 'Automated task generated by workflow';
        const taskDesc = interpolateTemplate(descTemplate, recordData);

        const [res] = await pool.query(
          `INSERT INTO tasks (organization_id, title, description, record_type, record_id, assigned_to, due_date, priority, status, created_by)
           VALUES (?, ?, ?, ?, ?, ?, DATE_ADD(CURRENT_DATE, INTERVAL ? DAY), ?, 'pending', ?);`,
          [
            orgId,
            taskTitle,
            taskDesc,
            recordType,
            recordId,
            actorId || null,
            config.dueInDays || 2,
            config.priority || 'medium',
            actorId || null,
          ]
        );

        return {
          taskId: res.insertId,
          title: taskTitle,
          message: 'Task created successfully by automation',
        };
      }

      case 'webhook': {
        const targetUrl = config.url;
        if (!targetUrl) throw new Error('Webhook action requires a "url" property.');

        console.log(`[WorkflowEngine] Webhook simulated/dispatched to ${targetUrl}`);
        // Log webhook payload
        return {
          url: targetUrl,
          dispatchedAt: new Date().toISOString(),
          status: 200,
          simulated: true,
        };
      }

      default:
        throw new Error(`Unsupported workflow action type: "${actionType}"`);
    }
  }
}
