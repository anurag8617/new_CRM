import { getPool } from '../../config/db.js';

export const getPipelinesWithStages = async (orgId) => {
  const pool = getPool();

  const [pipelines] = await pool.query(
    'SELECT id, name, is_default, created_at FROM pipelines WHERE organization_id = ? ORDER BY is_default DESC, id ASC;',
    [orgId]
  );

  const result = [];
  for (const pipe of pipelines) {
    const [stages] = await pool.query(
      `SELECT s.id, s.name, s.stage_order, s.probability, s.color,
              COUNT(d.id) AS deal_count,
              COALESCE(SUM(d.value), 0) AS total_value,
              COALESCE(SUM(d.value * s.probability / 100), 0) AS weighted_value
       FROM pipeline_stages s
       LEFT JOIN deals d ON d.stage_id = s.id AND d.organization_id = ? AND d.status = 'open'
       WHERE s.pipeline_id = ?
       GROUP BY s.id, s.name, s.stage_order, s.probability, s.color
       ORDER BY s.stage_order ASC;`,
      [orgId, pipe.id]
    );

    result.push({
      ...pipe,
      stages: stages.map((st) => ({
        ...st,
        deal_count: Number(st.deal_count),
        total_value: Number(st.total_value),
        weighted_value: Number(st.weighted_value),
      })),
    });
  }

  return result;
};

export const getPipelineById = async (orgId, pipelineId) => {
  const pool = getPool();
  const [pipes] = await pool.query(
    'SELECT id, name, is_default FROM pipelines WHERE id = ? AND organization_id = ?;',
    [pipelineId, orgId]
  );
  if (pipes.length === 0) return null;

  const [stages] = await pool.query(
    `SELECT s.id, s.name, s.stage_order, s.probability, s.color,
            COUNT(d.id) AS deal_count,
            COALESCE(SUM(d.value), 0) AS total_value,
            COALESCE(SUM(d.value * s.probability / 100), 0) AS weighted_value
     FROM pipeline_stages s
     LEFT JOIN deals d ON d.stage_id = s.id AND d.organization_id = ? AND d.status = 'open'
     WHERE s.pipeline_id = ?
     GROUP BY s.id, s.name, s.stage_order, s.probability, s.color
     ORDER BY s.stage_order ASC;`,
    [orgId, pipelineId]
  );

  return {
    ...pipes[0],
    stages: stages.map((st) => ({
      ...st,
      deal_count: Number(st.deal_count),
      total_value: Number(st.total_value),
      weighted_value: Number(st.weighted_value),
    })),
  };
};
