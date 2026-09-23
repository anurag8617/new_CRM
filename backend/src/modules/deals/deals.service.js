import { getPool } from '../../config/db.js';
import { eventBus } from '../../services/eventBus.js';

export const getDeals = async (orgId, options = {}) => {
  const pool = getPool();
  const { pipelineId, stageId, status, search, ownerId } = options;

  let query = `
    SELECT 
      d.id,
      d.organization_id,
      d.pipeline_id,
      d.stage_id,
      d.company_id,
      d.contact_id,
      d.owner_id,
      d.title,
      d.value,
      d.currency,
      d.expected_close_date,
      d.status,
      d.win_loss_reason,
      d.created_at,
      d.updated_at,
      c.name AS company_name,
      CONCAT(ct.first_name, ' ', ct.last_name) AS contact_name,
      ct.email AS contact_email,
      CONCAT(u.first_name, ' ', u.last_name) AS owner_name,
      ps.name AS stage_name,
      ps.probability AS stage_probability,
      ps.color AS stage_color,
      ps.stage_order
    FROM deals d
    LEFT JOIN companies c ON c.id = d.company_id
    LEFT JOIN contacts ct ON ct.id = d.contact_id
    LEFT JOIN users u ON u.id = d.owner_id
    LEFT JOIN pipeline_stages ps ON ps.id = d.stage_id
    WHERE d.organization_id = ?
  `;

  const params = [orgId];

  if (pipelineId) {
    query += ' AND d.pipeline_id = ?';
    params.push(pipelineId);
  }

  if (stageId) {
    query += ' AND d.stage_id = ?';
    params.push(stageId);
  }

  if (status) {
    query += ' AND d.status = ?';
    params.push(status);
  }

  if (ownerId) {
    query += ' AND d.owner_id = ?';
    params.push(ownerId);
  }

  if (search) {
    query += ' AND (d.title LIKE ? OR c.name LIKE ? OR ct.first_name LIKE ? OR ct.last_name LIKE ?)';
    const term = `%${search}%`;
    params.push(term, term, term, term);
  }

  query += ' ORDER BY ps.stage_order ASC, d.updated_at DESC;';

  const [deals] = await pool.query(query, params);
  return deals;
};

export const getDealById = async (orgId, dealId) => {
  const pool = getPool();

  const [deals] = await pool.query(
    `SELECT 
      d.id,
      d.organization_id,
      d.pipeline_id,
      d.stage_id,
      d.company_id,
      d.contact_id,
      d.owner_id,
      d.title,
      d.value,
      d.currency,
      d.expected_close_date,
      d.status,
      d.win_loss_reason,
      d.created_at,
      d.updated_at,
      p.name AS pipeline_name,
      ps.name AS stage_name,
      ps.probability AS stage_probability,
      ps.color AS stage_color,
      c.name AS company_name,
      c.domain AS company_domain,
      CONCAT(ct.first_name, ' ', ct.last_name) AS contact_name,
      ct.email AS contact_email,
      CONCAT(u.first_name, ' ', u.last_name) AS owner_name
    FROM deals d
    LEFT JOIN pipelines p ON p.id = d.pipeline_id
    LEFT JOIN pipeline_stages ps ON ps.id = d.stage_id
    LEFT JOIN companies c ON c.id = d.company_id
    LEFT JOIN contacts ct ON ct.id = d.contact_id
    LEFT JOIN users u ON u.id = d.owner_id
    WHERE d.id = ? AND d.organization_id = ?;`,
    [dealId, orgId]
  );

  if (deals.length === 0) return null;
  const deal = deals[0];

  // Fetch activities attached to this deal
  const [activities] = await pool.query(
    `SELECT a.id, a.activity_type, a.payload_json, a.created_at,
            CONCAT(u.first_name, ' ', u.last_name) AS actor_name
     FROM activities a
     LEFT JOIN users u ON u.id = a.actor_id
     WHERE a.organization_id = ? AND a.record_type = 'deal' AND a.record_id = ?
     ORDER BY a.created_at DESC;`,
    [orgId, dealId]
  );

  // Fetch line items
  const [lineItems] = await pool.query(
    'SELECT * FROM deal_line_items WHERE deal_id = ? ORDER BY id ASC;',
    [dealId]
  );

  return {
    ...deal,
    activities,
    lineItems,
  };
};

export const createDeal = async (orgId, actorId, data) => {
  const pool = getPool();

  const pipelineId = data.pipelineId || 1;
  let stageId = data.stageId;

  if (!stageId) {
    const [firstStage] = await pool.query(
      'SELECT id FROM pipeline_stages WHERE pipeline_id = ? ORDER BY stage_order ASC LIMIT 1;',
      [pipelineId]
    );
    stageId = firstStage.length > 0 ? firstStage[0].id : null;
  }

  const [result] = await pool.query(
    `INSERT INTO deals 
      (organization_id, pipeline_id, stage_id, company_id, contact_id, owner_id, title, value, currency, expected_close_date, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      orgId,
      pipelineId,
      stageId,
      data.companyId || null,
      data.contactId || null,
      data.ownerId || actorId,
      data.title,
      data.value || 0.0,
      data.currency || 'USD',
      data.expectedCloseDate || null,
      data.status || 'open',
    ]
  );

  const dealId = result.insertId;

  // Insert timeline activity
  await pool.query(
    `INSERT INTO activities (organization_id, record_type, record_id, activity_type, payload_json, actor_id)
     VALUES (?, 'deal', ?, 'creation', JSON_OBJECT('message', CONCAT('Opportunity created: ', ?)), ?);`,
    [orgId, dealId, data.title, actorId]
  );

  const createdDeal = await getDealById(orgId, dealId);

  // Dispatch domain event to Workflow Automation Engine (Spec §15)
  eventBus.emitEvent('deal.created', {
    orgId,
    recordType: 'deal',
    recordId: dealId,
    record: createdDeal,
    actorId,
  });

  return createdDeal;
};

export const updateDealStage = async (orgId, actorId, dealId, newStageId) => {
  const pool = getPool();

  const [existing] = await pool.query(
    `SELECT d.id, d.stage_id, ps.name AS old_stage_name, d.contact_id
     FROM deals d
     JOIN pipeline_stages ps ON ps.id = d.stage_id
     WHERE d.id = ? AND d.organization_id = ?;`,
    [dealId, orgId]
  );

  if (existing.length === 0) return null;
  const currentDeal = existing[0];

  const [stageRows] = await pool.query(
    'SELECT id, name, probability FROM pipeline_stages WHERE id = ?;',
    [newStageId]
  );

  if (stageRows.length === 0) {
    throw new Error('Target stage not found');
  }

  const targetStage = stageRows[0];
  let newStatus = 'open';
  if (targetStage.probability === 100) newStatus = 'won';
  else if (targetStage.probability === 0 && targetStage.name.toLowerCase().includes('lost')) newStatus = 'lost';

  await pool.query(
    'UPDATE deals SET stage_id = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND organization_id = ?;',
    [newStageId, newStatus, dealId, orgId]
  );

  // Append status change activity
  await pool.query(
    `INSERT INTO activities (organization_id, record_type, record_id, activity_type, payload_json, actor_id)
     VALUES (?, 'deal', ?, 'status_change', 
     JSON_OBJECT('field', 'stage', 'from', ?, 'to', ?, 'probability', ?), ?);`,
    [orgId, dealId, currentDeal.old_stage_name, targetStage.name, targetStage.probability, actorId]
  );

  const updatedDeal = await getDealById(orgId, dealId);

  // Dispatch domain event to Workflow Automation Engine (Spec §15)
  eventBus.emitEvent('deal.stage_changed', {
    orgId,
    recordType: 'deal',
    recordId: dealId,
    record: updatedDeal,
    oldStageName: currentDeal.old_stage_name,
    newStageName: targetStage.name,
    probability: targetStage.probability,
    actorId,
  });

  return updatedDeal;
};

export const updateDeal = async (orgId, actorId, dealId, data) => {
  const pool = getPool();

  const allowedFields = {
    title: 'title',
    value: 'value',
    companyId: 'company_id',
    contactId: 'contact_id',
    ownerId: 'owner_id',
    stageId: 'stage_id',
    expectedCloseDate: 'expected_close_date',
    status: 'status',
    winLossReason: 'win_loss_reason',
  };

  const updates = [];
  const params = [];

  for (const [key, col] of Object.entries(allowedFields)) {
    if (data[key] !== undefined) {
      updates.push(`${col} = ?`);
      params.push(data[key]);
    }
  }

  if (updates.length === 0) return getDealById(orgId, dealId);

  params.push(dealId, orgId);
  await pool.query(
    `UPDATE deals SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND organization_id = ?;`,
    params
  );

  const updatedDeal = await getDealById(orgId, dealId);

  // Dispatch domain event to Workflow Automation Engine (Spec §15)
  eventBus.emitEvent('deal.updated', {
    orgId,
    recordType: 'deal',
    recordId: dealId,
    record: updatedDeal,
    actorId,
  });

  return updatedDeal;
};

export const deleteDeal = async (orgId, dealId) => {
  const pool = getPool();
  const [res] = await pool.query('DELETE FROM deals WHERE id = ? AND organization_id = ?;', [dealId, orgId]);
  return res.affectedRows > 0;
};
