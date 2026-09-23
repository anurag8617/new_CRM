import { Router } from 'express';
import { AnalyticsController } from './analytics.controller.js';
import { authenticate } from '../../middlewares/auth.js';

const router = Router();

router.use(authenticate);

// Executive KPIs & Conversion Funnel
router.get('/overview', AnalyticsController.getOverview);
router.get('/funnel', AnalyticsController.getFunnel);
router.post('/query', AnalyticsController.executeQuery);

// Saved Reports (§29)
router.get('/reports', AnalyticsController.listReports);
router.post('/reports', AnalyticsController.createReport);
router.get('/reports/:id', AnalyticsController.getReport);
router.get('/reports/:id/run', AnalyticsController.runReport);
router.put('/reports/:id', AnalyticsController.updateReport);
router.delete('/reports/:id', AnalyticsController.deleteReport);

// Operational Dashboards (§30)
router.get('/dashboards', AnalyticsController.listDashboards);
router.post('/dashboards', AnalyticsController.createDashboard);
router.get('/dashboards/:id', AnalyticsController.getDashboard);
router.post('/dashboards/:id/widgets', AnalyticsController.addWidget);
router.delete('/widgets/:widgetId', AnalyticsController.deleteWidget);

export default router;
