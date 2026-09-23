import { getPool } from '../../config/db.js';
import { eventBus } from '../../services/eventBus.js';

// =====================================================================
// Custom Objects Schema Management
// =====================================================================

export const getCustomObjects = async (orgId) => {
  const pool = getPool();

  const [objects] = await pool.query(
    `SELECT co.id, co.name, co.singular_name, co.slug, co.description, co.icon, co.color, co.is_active, co.created_at,
            COUNT(DISTINCT cf.id) AS field_count,
            COUNT(DISTINCT cr.id) AS record_count
     FROM custom_objects co
     LEFT JOIN custom_fields cf ON cf.custom_object_id = co.id
     LEFT JOIN custom_records cr ON cr.custom_object_id = co.id
     WHERE co.organization_id = ?
     GROUP BY co.id, co.name, co.singular_name, co.slug, co.description, co.icon, co.color, co.is_active, co.created_at
     ORDER BY co.id ASC;`,
    [orgId]
  );

  return objects.map((obj) => ({
    ...obj,
    field_count: Number(obj.field_count),
    record_count: Number(obj.record_count),
  }));
};

export const getCustomObjectById = async (orgId, id) => {
  const pool = getPool();

  const [objs] = await pool.query(
    'SELECT * FROM custom_objects WHERE id = ? AND organization_id = ?;',
    [id, orgId]
  );
  if (objs.length === 0) return null;
  const object = objs[0];

  const [fields] = await pool.query(
    'SELECT * FROM custom_fields WHERE custom_object_id = ? AND organization_id = ? ORDER BY sort_order ASC, id ASC;',
    [id, orgId]
  );

  const [relationships] = await pool.query(
    `SELECT * FROM object_relationships 
     WHERE organization_id = ? AND (from_object = CONCAT('custom_', ?) OR to_object = CONCAT('custom_', ?) OR from_object = ? OR to_object = ?);`,
    [orgId, id, id, object.slug, object.slug]
  );

  return {
    ...object,
    fields: fields.map((f) => ({
      ...f,
      options_json: typeof f.options_json === 'string' ? JSON.parse(f.options_json) : f.options_json,
    })),
    relationships,
  };
};

export const createCustomObject = async (orgId, data) => {
  const pool = getPool();
  const slug = (data.slug || data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')).replace(/^-|-$/g, '');

  const [res] = await pool.query(
    `INSERT INTO custom_objects (organization_id, name, singular_name, slug, description, icon, color)
     VALUES (?, ?, ?, ?, ?, ?, ?);`,
    [
      orgId,
      data.name.trim(),
      data.singularName?.trim() || data.name.trim(),
      slug,
      data.description || null,
      data.icon || 'Database',
      data.color || '#6366f1',
    ]
  );

  const objectId = res.insertId;

  // Automatically create a default 'Name' primary field
  await pool.query(
    `INSERT INTO custom_fields (organization_id, custom_object_id, field_key, label, field_type, is_required, sort_order)
     VALUES (?, ?, 'name', 'Record Name', 'text', TRUE, 1);`,
    [orgId, objectId]
  );

  return getCustomObjectById(orgId, objectId);
};

export const deleteCustomObject = async (orgId, id) => {
  const pool = getPool();
  const [res] = await pool.query(
    'DELETE FROM custom_objects WHERE id = ? AND organization_id = ?;',
    [id, orgId]
  );
  return res.affectedRows > 0;
};

// =====================================================================
// Custom Fields Management
// =====================================================================

export const addCustomField = async (orgId, objectId, data) => {
  const pool = getPool();
  const fieldKey = (data.fieldKey || data.label.toLowerCase().replace(/[^a-z0-9_]+/g, '_')).replace(/^_|_$/g, '');

  const [orderRow] = await pool.query(
    'SELECT COALESCE(MAX(sort_order), 0) + 1 AS next_order FROM custom_fields WHERE custom_object_id = ?;',
    [objectId]
  );
  const nextOrder = orderRow[0].next_order;

  const [res] = await pool.query(
    `INSERT INTO custom_fields (organization_id, custom_object_id, field_key, label, field_type, options_json, is_required, is_filterable, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      orgId,
      objectId,
      fieldKey,
      data.label.trim(),
      data.fieldType || 'text',
      data.options ? JSON.stringify(data.options) : null,
      data.isRequired ? 1 : 0,
      data.isFilterable !== false ? 1 : 0,
      nextOrder,
    ]
  );

  return res.insertId;
};

export const deleteCustomField = async (orgId, objectId, fieldId) => {
  const pool = getPool();
  const [res] = await pool.query(
    'DELETE FROM custom_fields WHERE id = ? AND custom_object_id = ? AND organization_id = ?;',
    [fieldId, objectId, orgId]
  );
  return res.affectedRows > 0;
};

// =====================================================================
// Custom Records CRUD (Hybrid JSON Engine - Spec §2.3)
// =====================================================================

export const getCustomRecords = async (orgId, objectId, options = {}) => {
  const pool = getPool();
  const { search } = options;

  let query = `
    SELECT cr.id, cr.custom_object_id, cr.record_name, cr.data_json, cr.created_at, cr.updated_at,
           CONCAT(u.first_name, ' ', u.last_name) AS created_by_name
    FROM custom_records cr
    LEFT JOIN users u ON u.id = cr.created_by
    WHERE cr.organization_id = ? AND cr.custom_object_id = ?
  `;
  const params = [orgId, objectId];

  if (search) {
    query += ' AND (cr.record_name LIKE ? OR JSON_SEARCH(cr.data_json, "one", ?) IS NOT NULL)';
    params.push(`%${search}%`, `%${search}%`);
  }

  query += ' ORDER BY cr.updated_at DESC;';

  const [records] = await pool.query(query, params);

  return records.map((r) => ({
    ...r,
    data: typeof r.data_json === 'string' ? JSON.parse(r.data_json) : r.data_json,
  }));
};

export const getCustomRecordById = async (orgId, objectId, recordId) => {
  const pool = getPool();

  const [records] = await pool.query(
    `SELECT cr.id, cr.custom_object_id, cr.record_name, cr.data_json, cr.created_at, cr.updated_at,
            CONCAT(u.first_name, ' ', u.last_name) AS created_by_name
     FROM custom_records cr
     LEFT JOIN users u ON u.id = cr.created_by
     WHERE cr.id = ? AND cr.custom_object_id = ? AND cr.organization_id = ?;`,
    [recordId, objectId, orgId]
  );

  if (records.length === 0) return null;
  const record = records[0];

  // Fetch timeline activities attached to this custom record
  const [activities] = await pool.query(
    `SELECT a.id, a.activity_type, a.payload_json, a.created_at,
            CONCAT(u.first_name, ' ', u.last_name) AS actor_name
     FROM activities a
     LEFT JOIN users u ON u.id = a.actor_id
     WHERE a.organization_id = ? AND a.record_type = 'custom_record' AND a.record_id = ?
     ORDER BY a.created_at DESC;`,
    [orgId, recordId]
  );

  // Fetch related linked entities (e.g. linked companies)
  const [links] = await pool.query(
    `SELECT rl.id, rl.relationship_id, rl.from_record_id, rl.to_record_id,
            rel.name AS relationship_name, rel.from_object, rel.to_object,
            c.name AS company_name
     FROM relationship_links rl
     JOIN object_relationships rel ON rel.id = rl.relationship_id
     LEFT JOIN companies c ON c.id = rl.from_record_id AND rel.from_object = 'companies'
     WHERE rl.to_record_id = ?;`,
    [recordId]
  );

  return {
    ...record,
    data: typeof record.data_json === 'string' ? JSON.parse(record.data_json) : record.data_json,
    activities,
    relationships: links,
  };
};

export const createCustomRecord = async (orgId, actorId, objectId, data) => {
  const pool = getPool();
  const { recordName, customData } = data;

  const [res] = await pool.query(
    `INSERT INTO custom_records (organization_id, custom_object_id, record_name, data_json, created_by)
     VALUES (?, ?, ?, ?, ?);`,
    [orgId, objectId, recordName.trim(), JSON.stringify(customData || {}), actorId]
  );

  const recordId = res.insertId;

  // Timeline activity
  await pool.query(
    `INSERT INTO activities (organization_id, record_type, record_id, activity_type, payload_json, actor_id)
     VALUES (?, 'custom_record', ?, 'creation', JSON_OBJECT('message', CONCAT('Custom record created: ', ?)), ?);`,
    [orgId, recordId, recordName.trim(), actorId]
  );

  const createdRecord = await getCustomRecordById(orgId, objectId, recordId);

  // Dispatch domain event to Workflow Automation Engine (Spec §15)
  eventBus.emitEvent('custom_record.created', {
    orgId,
    recordType: 'custom_record',
    recordId,
    record: createdRecord,
    actorId,
  });

  return createdRecord;
};

export const updateCustomRecord = async (orgId, actorId, objectId, recordId, data) => {
  const pool = getPool();
  const { recordName, customData } = data;

  const updates = [];
  const params = [];

  if (recordName) {
    updates.push('record_name = ?');
    params.push(recordName.trim());
  }

  if (customData) {
    updates.push('data_json = ?');
    params.push(JSON.stringify(customData));
  }

  if (updates.length > 0) {
    params.push(recordId, objectId, orgId);
    await pool.query(
      `UPDATE custom_records SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP 
       WHERE id = ? AND custom_object_id = ? AND organization_id = ?;`,
      params
    );
  }

  const updatedRecord = await getCustomRecordById(orgId, objectId, recordId);

  // Dispatch domain event to Workflow Automation Engine (Spec §15)
  eventBus.emitEvent('custom_record.updated', {
    orgId,
    recordType: 'custom_record',
    recordId,
    record: updatedRecord,
    actorId,
  });

  return updatedRecord;
};

export const deleteCustomRecord = async (orgId, objectId, recordId) => {
  const pool = getPool();
  const [res] = await pool.query(
    'DELETE FROM custom_records WHERE id = ? AND custom_object_id = ? AND organization_id = ?;',
    [recordId, objectId, orgId]
  );
  return res.affectedRows > 0;
};
