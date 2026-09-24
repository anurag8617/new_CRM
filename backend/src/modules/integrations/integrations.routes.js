import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.js';
import * as controller from './integrations.controller.js';

const router = Router();

// -------------------------------------------------------------------
// DEVELOPER API KEYS (§37)
// -------------------------------------------------------------------
router.get('/api-keys', authenticate, controller.getApiKeys);
router.post('/api-keys', authenticate, controller.createApiKey);
router.delete('/api-keys/:id', authenticate, controller.revokeApiKey);

// -------------------------------------------------------------------
// OUTGOING WEBHOOK ENDPOINTS (§31, §37)
// -------------------------------------------------------------------
router.get('/webhooks', authenticate, controller.getWebhooks);
router.post('/webhooks', authenticate, controller.createWebhook);
router.get('/webhooks/deliveries', authenticate, controller.getWebhookDeliveries);
router.get('/webhooks/:id', authenticate, controller.getWebhook);
router.patch('/webhooks/:id', authenticate, controller.updateWebhook);
router.delete('/webhooks/:id', authenticate, controller.deleteWebhook);
router.post('/webhooks/:id/test', authenticate, controller.testDispatchWebhook);

// -------------------------------------------------------------------
// THIRD-PARTY INTEGRATIONS & MARKETPLACE (§36)
// -------------------------------------------------------------------
router.get('/marketplace', authenticate, controller.getIntegrations);
router.patch('/marketplace/:provider', authenticate, controller.updateIntegration);
router.post('/marketplace/:provider/sync', authenticate, controller.triggerSync);
router.get('/logs', authenticate, controller.getIntegrationLogs);

// -------------------------------------------------------------------
// INBOUND WEBHOOK RECEIVER (Public / External Provider Calls)
// -------------------------------------------------------------------
router.post('/inbound/:provider', controller.handleInboundWebhook);

export default router;
