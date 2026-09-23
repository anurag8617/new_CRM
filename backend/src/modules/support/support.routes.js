import { Router } from 'express';
import { SupportController } from './support.controller.js';
import { authenticate } from '../../middlewares/auth.js';

const router = Router();

// Protect all support routes with tenant authentication
router.use(authenticate);

// -------------------------------------------------------------------
// Operational & SLA Metrics (§26)
// -------------------------------------------------------------------
router.get('/metrics', SupportController.getSupportMetrics);

// -------------------------------------------------------------------
// Tickets Management (§23)
// -------------------------------------------------------------------
router.get('/tickets', SupportController.getTickets);
router.get('/tickets/:id', SupportController.getTicketById);
router.post('/tickets', SupportController.createTicket);
router.put('/tickets/:id', SupportController.updateTicket);
router.patch('/tickets/:id/status', SupportController.updateTicketStatus);
router.delete('/tickets/:id', SupportController.deleteTicket);

// -------------------------------------------------------------------
// Omnichannel Conversation Thread & CSAT (§23)
// -------------------------------------------------------------------
router.post('/tickets/:id/messages', SupportController.addTicketMessage);
router.post('/tickets/:id/csat', SupportController.submitCsat);

// -------------------------------------------------------------------
// SLA Policies (§23)
// -------------------------------------------------------------------
router.get('/sla-policies', SupportController.getSlaPolicies);
router.post('/sla-policies', SupportController.createSlaPolicy);
router.put('/sla-policies/:id', SupportController.updateSlaPolicy);

// -------------------------------------------------------------------
// Canned Responses (§23)
// -------------------------------------------------------------------
router.get('/canned-responses', SupportController.getCannedResponses);
router.post('/canned-responses', SupportController.createCannedResponse);
router.delete('/canned-responses/:id', SupportController.deleteCannedResponse);

// -------------------------------------------------------------------
// Knowledge Base Articles (§23)
// -------------------------------------------------------------------
router.get('/kb/articles', SupportController.getKbArticles);
router.get('/kb/articles/:id', SupportController.getKbArticleById);
router.post('/kb/articles', SupportController.createKbArticle);
router.post('/kb/articles/:id/helpful', SupportController.markArticleHelpful);

export default router;
