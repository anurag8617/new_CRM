import { AnalyticsService } from './analytics.service.js';

export class AnalyticsController {
  static async getOverview(req, res, next) {
    try {
      const orgId = req.user.organization_id;
      const { dateRange = '30d' } = req.query;
      const overview = await AnalyticsService.getExecutiveOverview(orgId, { dateRange });
      res.json({ success: true, data: overview });
    } catch (err) {
      next(err);
    }
  }

  static async getFunnel(req, res, next) {
    try {
      const orgId = req.user.organization_id;
      const { pipelineId } = req.query;
      const funnel = await AnalyticsService.getPipelineFunnel(orgId, pipelineId ? parseInt(pipelineId, 10) : null);
      res.json({ success: true, data: funnel });
    } catch (err) {
      next(err);
    }
  }

  static async executeQuery(req, res, next) {
    try {
      const orgId = req.user.organization_id;
      const result = await AnalyticsService.executeQuery(orgId, req.body);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  // Reports
  static async listReports(req, res, next) {
    try {
      const orgId = req.user.organization_id;
      const { entityType, search } = req.query;
      const reports = await AnalyticsService.listReports(orgId, { entityType, search });
      res.json({ success: true, data: reports });
    } catch (err) {
      next(err);
    }
  }

  static async getReport(req, res, next) {
    try {
      const orgId = req.user.organization_id;
      const report = await AnalyticsService.getReportById(orgId, parseInt(req.params.id, 10));
      if (!report) {
        return res.status(404).json({ success: false, message: 'Report not found' });
      }
      res.json({ success: true, data: report });
    } catch (err) {
      next(err);
    }
  }

  static async runReport(req, res, next) {
    try {
      const orgId = req.user.organization_id;
      const report = await AnalyticsService.getReportById(orgId, parseInt(req.params.id, 10));
      if (!report) {
        return res.status(404).json({ success: false, message: 'Report not found' });
      }
      const querySpec = {
        entityType: report.entity_type,
        chartType: report.chart_type,
        metricType: report.metric_type,
        metricField: report.metric_field,
        groupBy: report.group_by,
        dateRange: req.query.dateRange || report.date_range,
      };
      const result = await AnalyticsService.executeQuery(orgId, querySpec);
      res.json({ success: true, data: { report, results: result } });
    } catch (err) {
      next(err);
    }
  }

  static async createReport(req, res, next) {
    try {
      const orgId = req.user.organization_id;
      const userId = req.user.id;
      const report = await AnalyticsService.createReport(orgId, userId, req.body);
      res.status(201).json({ success: true, data: report });
    } catch (err) {
      next(err);
    }
  }

  static async updateReport(req, res, next) {
    try {
      const orgId = req.user.organization_id;
      const report = await AnalyticsService.updateReport(orgId, parseInt(req.params.id, 10), req.body);
      if (!report) {
        return res.status(404).json({ success: false, message: 'Report not found' });
      }
      res.json({ success: true, data: report });
    } catch (err) {
      next(err);
    }
  }

  static async deleteReport(req, res, next) {
    try {
      const orgId = req.user.organization_id;
      const deleted = await AnalyticsService.deleteReport(orgId, parseInt(req.params.id, 10));
      if (!deleted) {
        return res.status(400).json({ success: false, message: 'Report could not be deleted (system reports cannot be deleted)' });
      }
      res.json({ success: true, message: 'Report deleted successfully' });
    } catch (err) {
      next(err);
    }
  }

  // Dashboards
  static async listDashboards(req, res, next) {
    try {
      const orgId = req.user.organization_id;
      const dashboards = await AnalyticsService.listDashboards(orgId);
      res.json({ success: true, data: dashboards });
    } catch (err) {
      next(err);
    }
  }

  static async getDashboard(req, res, next) {
    try {
      const orgId = req.user.organization_id;
      const dashboard = await AnalyticsService.getDashboardById(orgId, parseInt(req.params.id, 10));
      if (!dashboard) {
        return res.status(404).json({ success: false, message: 'Dashboard not found' });
      }
      res.json({ success: true, data: dashboard });
    } catch (err) {
      next(err);
    }
  }

  static async createDashboard(req, res, next) {
    try {
      const orgId = req.user.organization_id;
      const userId = req.user.id;
      const dashboard = await AnalyticsService.createDashboard(orgId, userId, req.body);
      res.status(201).json({ success: true, data: dashboard });
    } catch (err) {
      next(err);
    }
  }

  static async addWidget(req, res, next) {
    try {
      const orgId = req.user.organization_id;
      const dashboardId = parseInt(req.params.id, 10);
      const widget = await AnalyticsService.addWidget(orgId, dashboardId, req.body);
      res.status(201).json({ success: true, data: widget });
    } catch (err) {
      next(err);
    }
  }

  static async deleteWidget(req, res, next) {
    try {
      const orgId = req.user.organization_id;
      const widgetId = parseInt(req.params.widgetId, 10);
      const deleted = await AnalyticsService.deleteWidget(orgId, widgetId);
      if (!deleted) {
        return res.status(404).json({ success: false, message: 'Widget not found' });
      }
      res.json({ success: true, message: 'Widget deleted successfully' });
    } catch (err) {
      next(err);
    }
  }
}
