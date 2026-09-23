import { getPool } from '../../config/db.js';

export class AnalyticsService {
  // ===================================================================
  // 1. EXECUTIVE KPI OVERVIEW (Spec §26, §28)
  // ===================================================================

  static async getExecutiveOverview(orgId, { dateRange = '30d' } = {}) {
    const pool = getPool();

    // 1. Deals & Pipeline KPIs
    const [dealsSummary] = await pool.query(
      `SELECT 
         COUNT(*) AS total_deals,
         COALESCE(SUM(value), 0) AS total_pipeline_value,
         COALESCE(SUM(CASE WHEN status = 'won' THEN value ELSE 0 END), 0) AS closed_won_revenue,
         COALESCE(SUM(CASE WHEN status = 'open' THEN (value * COALESCE(ps.probability, 50) / 100) ELSE 0 END), 0) AS weighted_forecast,
         COALESCE(AVG(value), 0) AS average_deal_size,
         COUNT(CASE WHEN status = 'won' THEN 1 END) AS won_count,
         COUNT(CASE WHEN status = 'lost' THEN 1 END) AS lost_count,
         COUNT(CASE WHEN status = 'open' THEN 1 END) AS open_count
       FROM deals d
       LEFT JOIN pipeline_stages ps ON ps.id = d.stage_id
       WHERE d.organization_id = ?;`,
      [orgId]
    );

    const dealStats = dealsSummary[0];
    const totalClosed = parseInt(dealStats.won_count, 10) + parseInt(dealStats.lost_count, 10);
    const winRate = totalClosed > 0 ? Math.round((parseInt(dealStats.won_count, 10) / totalClosed) * 100) : 0;

    // 2. Tasks & Execution KPIs
    const [tasksSummary] = await pool.query(
      `SELECT 
         COUNT(*) AS total_tasks,
         COUNT(CASE WHEN status = 'completed' THEN 1 END) AS completed_tasks,
         COUNT(CASE WHEN status = 'pending' THEN 1 END) AS pending_tasks,
         COUNT(CASE WHEN status = 'in_progress' THEN 1 END) AS in_progress_tasks,
         COUNT(CASE WHEN due_date < CURRENT_DATE AND status != 'completed' THEN 1 END) AS overdue_tasks
       FROM tasks
       WHERE organization_id = ?;`,
      [orgId]
    );
    const taskStats = tasksSummary[0];
    const taskCompletionRate = parseInt(taskStats.total_tasks, 10) > 0
      ? Math.round((parseInt(taskStats.completed_tasks, 10) / parseInt(taskStats.total_tasks, 10)) * 100)
      : 0;

    // 3. Customer Touchpoints & Activities
    const [activitiesSummary] = await pool.query(
      `SELECT 
         COUNT(*) AS total_activities,
         COUNT(CASE WHEN activity_type = 'email' THEN 1 END) AS email_count,
         COUNT(CASE WHEN activity_type = 'call' THEN 1 END) AS call_count,
         COUNT(CASE WHEN activity_type = 'note' THEN 1 END) AS note_count,
         COUNT(CASE WHEN activity_type = 'task' THEN 1 END) AS task_activity_count
       FROM activities
       WHERE organization_id = ?;`,
      [orgId]
    );
    const activityStats = activitiesSummary[0];

    // 4. Contact Lifecycle Distribution
    const [contactLifecycle] = await pool.query(
      `SELECT lifecycle_stage, COUNT(*) AS count
       FROM contacts
       WHERE organization_id = ?
       GROUP BY lifecycle_stage
       ORDER BY count DESC;`,
      [orgId]
    );

    // 5. Stage by Stage Deal Distribution
    const [stageDistribution] = await pool.query(
      `SELECT 
         ps.id AS stage_id,
         ps.name AS stage_name,
         ps.probability AS win_probability,
         ps.color AS color_tag,
         COUNT(d.id) AS deal_count,
         COALESCE(SUM(d.value), 0) AS stage_value,
         COALESCE(SUM(d.value * ps.probability / 100), 0) AS weighted_value
       FROM pipeline_stages ps
       JOIN pipelines pl ON pl.id = ps.pipeline_id
       LEFT JOIN deals d ON d.stage_id = ps.id AND d.organization_id = ?
       WHERE pl.organization_id = ?
       GROUP BY ps.id, ps.name, ps.probability, ps.color, ps.stage_order
       ORDER BY ps.stage_order ASC;`,
      [orgId, orgId]
    );

    return {
      dateRange,
      pipeline: {
        totalDeals: parseInt(dealStats.total_deals, 10),
        openDeals: parseInt(dealStats.open_count, 10),
        wonDeals: parseInt(dealStats.won_count, 10),
        lostDeals: parseInt(dealStats.lost_count, 10),
        totalPipelineValue: parseFloat(dealStats.total_pipeline_value),
        closedWonRevenue: parseFloat(dealStats.closed_won_revenue),
        weightedForecast: parseFloat(dealStats.weighted_forecast),
        averageDealSize: Math.round(parseFloat(dealStats.average_deal_size)),
        winRatePercent: winRate,
      },
      tasks: {
        total: parseInt(taskStats.total_tasks, 10),
        completed: parseInt(taskStats.completed_tasks, 10),
        pending: parseInt(taskStats.pending_tasks, 10),
        inProgress: parseInt(taskStats.in_progress_tasks, 10),
        overdue: parseInt(taskStats.overdue_tasks, 10),
        completionRatePercent: taskCompletionRate,
      },
      activities: {
        total: parseInt(activityStats.total_activities, 10),
        emails: parseInt(activityStats.email_count, 10),
        calls: parseInt(activityStats.call_count, 10),
        notes: parseInt(activityStats.note_count, 10),
        taskActivities: parseInt(activityStats.task_activity_count, 10),
      },
      contactLifecycle,
      stageDistribution,
    };
  }

  // ===================================================================
  // 2. PIPELINE STAGE CONVERSION FUNNEL (Spec §27)
  // ===================================================================

  static async getPipelineFunnel(orgId, pipelineId = null) {
    const pool = getPool();

    // Find default pipeline if none provided
    let activePipelineId = pipelineId;
    if (!activePipelineId) {
      const [pipelines] = await pool.query(
        'SELECT id, name FROM pipelines WHERE organization_id = ? ORDER BY is_default DESC, id ASC LIMIT 1;',
        [orgId]
      );
      if (pipelines.length > 0) {
        activePipelineId = pipelines[0].id;
      }
    }

    if (!activePipelineId) {
      return { stages: [], totalDeals: 0, overallConversion: 0 };
    }

    const [stages] = await pool.query(
      `SELECT 
         ps.id,
         ps.name,
         ps.probability AS win_probability,
         ps.color AS color_tag,
         ps.stage_order,
         COUNT(d.id) AS deal_count,
         COALESCE(SUM(d.value), 0) AS total_value
       FROM pipeline_stages ps
       JOIN pipelines pl ON pl.id = ps.pipeline_id
       LEFT JOIN deals d ON d.stage_id = ps.id AND d.organization_id = ?
       WHERE ps.pipeline_id = ? AND pl.organization_id = ?
       GROUP BY ps.id, ps.name, ps.probability, ps.color, ps.stage_order
       ORDER BY ps.stage_order ASC;`,
      [orgId, activePipelineId, orgId]
    );

    const totalDeals = stages.reduce((acc, st) => acc + parseInt(st.deal_count, 10), 0);

    // Compute conversion from first stage and drop-off
    let runningDeals = totalDeals;
    const funnelStages = stages.map((st, index) => {
      const count = parseInt(st.deal_count, 10);
      const conversionFromTotal = totalDeals > 0 ? Math.round((count / totalDeals) * 100) : 0;
      const prevCount = index > 0 ? parseInt(stages[index - 1].deal_count, 10) : count;
      const stepConversion = prevCount > 0 ? Math.round((count / prevCount) * 100) : 100;
      const dropOffCount = Math.max(0, prevCount - count);

      return {
        id: st.id,
        name: st.name,
        probability: st.win_probability,
        colorTag: st.color_tag || '#4f46e5',
        dealCount: count,
        totalValue: parseFloat(st.total_value),
        conversionFromTotal,
        stepConversion,
        dropOffCount,
      };
    });

    const wonStage = funnelStages.find(s => s.probability === 100) || funnelStages[funnelStages.length - 1];
    const overallConversion = totalDeals > 0 && wonStage ? Math.round((wonStage.dealCount / totalDeals) * 100) : 0;

    return {
      pipelineId: activePipelineId,
      totalDeals,
      overallConversion,
      stages: funnelStages,
    };
  }

  // ===================================================================
  // 3. DYNAMIC REPORT QUERY COMPILER (Spec §29 Query Builder)
  // ===================================================================

  static async executeQuery(orgId, spec) {
    const pool = getPool();
    const {
      entityType = 'deals',
      chartType = 'bar',
      metricType = 'count',
      metricField = 'id',
      groupBy = 'stage_name',
      dateRange = '30d',
    } = spec;

    let baseTable = 'deals';
    let groupColumn = '';
    let selectClause = '';
    let joinClause = '';
    let whereClause = 'WHERE t.organization_id = ?';
    const params = [orgId];

    // Metric aggregation formulation
    let metricExpr = 'COUNT(t.id)';
    if (metricType === 'sum') {
      metricExpr = `COALESCE(SUM(t.${metricField}), 0)`;
    } else if (metricType === 'avg') {
      metricExpr = `COALESCE(AVG(t.${metricField}), 0)`;
    } else if (metricType === 'max') {
      metricExpr = `COALESCE(MAX(t.${metricField}), 0)`;
    } else if (metricType === 'min') {
      metricExpr = `COALESCE(MIN(t.${metricField}), 0)`;
    }

    switch (entityType) {
      case 'deals':
        baseTable = 'deals';
        joinClause = `
          LEFT JOIN pipeline_stages ps ON ps.id = t.stage_id
          LEFT JOIN users u ON u.id = t.owner_id
          LEFT JOIN companies c ON c.id = t.company_id
        `;
        if (groupBy === 'stage_name') groupColumn = 'COALESCE(ps.name, "Unassigned")';
        else if (groupBy === 'owner_name') groupColumn = 'COALESCE(CONCAT(u.first_name, " ", u.last_name), "Unassigned")';
        else if (groupBy === 'status') groupColumn = 't.status';
        else if (groupBy === 'company') groupColumn = 'COALESCE(c.name, "Individual")';
        else groupColumn = 't.status';
        break;

      case 'contacts':
        baseTable = 'contacts';
        joinClause = 'LEFT JOIN companies c ON c.id = t.company_id';
        if (groupBy === 'lifecycle_stage') groupColumn = 't.lifecycle_stage';
        else if (groupBy === 'lead_status') groupColumn = 'COALESCE(t.lead_status, "New")';
        else if (groupBy === 'company') groupColumn = 'COALESCE(c.name, "Direct Contact")';
        else groupColumn = 't.lifecycle_stage';
        break;

      case 'companies':
        baseTable = 'companies';
        joinClause = '';
        if (groupBy === 'industry') groupColumn = 'COALESCE(t.industry, "Other")';
        else if (groupBy === 'tier') groupColumn = 'COALESCE(t.tier, "Standard")';
        else groupColumn = 'COALESCE(t.industry, "Other")';
        break;

      case 'tasks':
        baseTable = 'tasks';
        joinClause = 'LEFT JOIN users u ON u.id = t.assigned_to';
        if (groupBy === 'status') groupColumn = 't.status';
        else if (groupBy === 'priority') groupColumn = 't.priority';
        else if (groupBy === 'assigned_to') groupColumn = 'COALESCE(CONCAT(u.first_name, " ", u.last_name), "Unassigned")';
        else groupColumn = 't.priority';
        break;

      case 'activities':
        baseTable = 'activities';
        joinClause = '';
        if (groupBy === 'activity_type') groupColumn = 't.activity_type';
        else if (groupBy === 'record_type') groupColumn = 't.record_type';
        else groupColumn = 't.activity_type';
        break;

      default:
        baseTable = 'deals';
        groupColumn = 't.status';
    }

    // Date range filtering
    if (dateRange === '7d') {
      whereClause += ' AND t.created_at >= DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 7 DAY)';
    } else if (dateRange === '30d') {
      whereClause += ' AND t.created_at >= DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 30 DAY)';
    } else if (dateRange === '90d') {
      whereClause += ' AND t.created_at >= DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 90 DAY)';
    } else if (dateRange === 'ytd') {
      whereClause += ' AND t.created_at >= MAKEDATE(YEAR(CURRENT_DATE), 1)';
    }

    const query = `
      SELECT 
        ${groupColumn} AS label,
        ${metricExpr} AS value,
        COUNT(t.id) AS row_count
      FROM ${baseTable} t
      ${joinClause}
      ${whereClause}
      GROUP BY label
      ORDER BY value DESC
      LIMIT 25;
    `;

    const [rows] = await pool.query(query, params);

    const totalMetricSum = rows.reduce((acc, r) => acc + parseFloat(r.value || 0), 0);

    const dataPoints = rows.map((r, i) => {
      const val = parseFloat(r.value || 0);
      const pct = totalMetricSum > 0 ? Math.round((val / totalMetricSum) * 100) : 0;
      return {
        label: r.label || `Group ${i + 1}`,
        value: val,
        count: parseInt(r.row_count, 10),
        percentage: pct,
        formattedValue: metricType === 'sum' && (metricField === 'value' || metricField === 'weighted_value')
          ? `$${val.toLocaleString()}`
          : val.toLocaleString(),
      };
    });

    return {
      spec,
      totalMetricSum,
      dataPoints,
    };
  }

  // ===================================================================
  // 4. SAVED REPORTS CRUD (Spec §29)
  // ===================================================================

  static async listReports(orgId, { entityType, search } = {}) {
    const pool = getPool();
    let query = `
      SELECT r.*, CONCAT(u.first_name, ' ', u.last_name) AS creator_name
      FROM reports r
      LEFT JOIN users u ON u.id = r.created_by
      WHERE r.organization_id = ?
    `;
    const params = [orgId];

    if (entityType && entityType !== 'all') {
      query += ' AND r.entity_type = ?';
      params.push(entityType);
    }
    if (search && search.trim() !== '') {
      query += ' AND (r.name LIKE ? OR r.description LIKE ?)';
      params.push(`%${search.trim()}%`, `%${search.trim()}%`);
    }

    query += ' ORDER BY r.is_system DESC, r.created_at DESC;';
    const [rows] = await pool.query(query, params);
    return rows;
  }

  static async getReportById(orgId, id) {
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT r.*, CONCAT(u.first_name, ' ', u.last_name) AS creator_name
       FROM reports r
       LEFT JOIN users u ON u.id = r.created_by
       WHERE r.id = ? AND r.organization_id = ?;`,
      [id, orgId]
    );
    return rows[0] || null;
  }

  static async createReport(orgId, creatorId, data) {
    const pool = getPool();
    const {
      name,
      description = '',
      entityType = 'deals',
      chartType = 'bar',
      metricType = 'count',
      metricField = 'id',
      dateRange = '30d',
      groupBy = 'stage_name',
      filters = null,
    } = data;

    if (!name || !name.trim()) {
      throw new Error('Report name is required');
    }

    const [res] = await pool.query(
      `INSERT INTO reports (organization_id, name, description, entity_type, chart_type, metric_type, metric_field, date_range, group_by, filters_json, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        orgId,
        name.trim(),
        description.trim(),
        entityType,
        chartType,
        metricType,
        metricField,
        dateRange,
        groupBy,
        filters ? JSON.stringify(filters) : null,
        creatorId || null,
      ]
    );

    return this.getReportById(orgId, res.insertId);
  }

  static async updateReport(orgId, id, data) {
    const pool = getPool();
    const existing = await this.getReportById(orgId, id);
    if (!existing) return null;

    const {
      name,
      description,
      chartType,
      metricType,
      metricField,
      dateRange,
      groupBy,
      filters,
    } = data;

    const updates = [];
    const params = [];

    if (name !== undefined) { updates.push('name = ?'); params.push(name.trim()); }
    if (description !== undefined) { updates.push('description = ?'); params.push(description.trim()); }
    if (chartType !== undefined) { updates.push('chart_type = ?'); params.push(chartType); }
    if (metricType !== undefined) { updates.push('metric_type = ?'); params.push(metricType); }
    if (metricField !== undefined) { updates.push('metric_field = ?'); params.push(metricField); }
    if (dateRange !== undefined) { updates.push('date_range = ?'); params.push(dateRange); }
    if (groupBy !== undefined) { updates.push('group_by = ?'); params.push(groupBy); }
    if (filters !== undefined) { updates.push('filters_json = ?'); params.push(filters ? JSON.stringify(filters) : null); }

    if (updates.length === 0) return existing;

    params.push(id, orgId);
    await pool.query(
      `UPDATE reports SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND organization_id = ?;`,
      params
    );

    return this.getReportById(orgId, id);
  }

  static async deleteReport(orgId, id) {
    const pool = getPool();
    const [res] = await pool.query(
      'DELETE FROM reports WHERE id = ? AND organization_id = ? AND is_system = FALSE;',
      [id, orgId]
    );
    return res.affectedRows > 0;
  }

  // ===================================================================
  // 5. DASHBOARDS & WIDGETS CRUD (Spec §30)
  // ===================================================================

  static async listDashboards(orgId) {
    const pool = getPool();
    const [dashboards] = await pool.query(
      `SELECT d.*, 
              (SELECT COUNT(*) FROM dashboard_widgets dw WHERE dw.dashboard_id = d.id) AS widget_count
       FROM dashboards d
       WHERE d.organization_id = ?
       ORDER BY d.is_default DESC, d.created_at ASC;`,
      [orgId]
    );
    return dashboards;
  }

  static async getDashboardById(orgId, id) {
    const pool = getPool();
    const [dashboards] = await pool.query(
      'SELECT * FROM dashboards WHERE id = ? AND organization_id = ?;',
      [id, orgId]
    );
    if (dashboards.length === 0) return null;

    const dashboard = dashboards[0];

    // Fetch widgets and their report metadata
    const [widgets] = await pool.query(
      `SELECT dw.*,
              r.name AS report_name,
              r.entity_type AS report_entity_type,
              r.chart_type AS report_chart_type,
              r.metric_type AS report_metric_type,
              r.metric_field AS report_metric_field,
              r.group_by AS report_group_by
       FROM dashboard_widgets dw
       LEFT JOIN reports r ON r.id = dw.report_id
       WHERE dw.dashboard_id = ? AND dw.organization_id = ?
       ORDER BY dw.position_y ASC, dw.position_x ASC;`,
      [id, orgId]
    );

    dashboard.widgets = widgets;
    return dashboard;
  }

  static async createDashboard(orgId, creatorId, data) {
    const pool = getPool();
    const { name, description = '', isDefault = false } = data;

    if (!name || !name.trim()) {
      throw new Error('Dashboard name is required');
    }

    if (isDefault) {
      await pool.query('UPDATE dashboards SET is_default = FALSE WHERE organization_id = ?;', [orgId]);
    }

    const [res] = await pool.query(
      `INSERT INTO dashboards (organization_id, name, description, is_default, created_by)
       VALUES (?, ?, ?, ?, ?);`,
      [orgId, name.trim(), description.trim(), isDefault ? 1 : 0, creatorId || null]
    );

    return this.getDashboardById(orgId, res.insertId);
  }

  static async addWidget(orgId, dashboardId, data) {
    const pool = getPool();
    const {
      reportId = null,
      title,
      widgetType = 'chart',
      width = 6,
      height = 4,
      positionX = 0,
      positionY = 0,
      config = {},
    } = data;

    if (!title || !title.trim()) {
      throw new Error('Widget title is required');
    }

    const [res] = await pool.query(
      `INSERT INTO dashboard_widgets (organization_id, dashboard_id, report_id, title, widget_type, width, height, position_x, position_y, config_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        orgId,
        dashboardId,
        reportId,
        title.trim(),
        widgetType,
        width,
        height,
        positionX,
        positionY,
        JSON.stringify(config),
      ]
    );

    return { id: res.insertId, ...data };
  }

  static async deleteWidget(orgId, widgetId) {
    const pool = getPool();
    const [res] = await pool.query(
      'DELETE FROM dashboard_widgets WHERE id = ? AND organization_id = ?;',
      [widgetId, orgId]
    );
    return res.affectedRows > 0;
  }
}
