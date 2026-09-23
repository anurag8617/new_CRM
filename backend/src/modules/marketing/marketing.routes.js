import { Router } from 'express';
import { MarketingController } from './marketing.controller.js';
import { authenticate } from '../../middlewares/auth.js';

const router = Router();

// Protect all marketing and sequence routes with tenant authentication
router.use(authenticate);

// -------------------------------------------------------------------
// 1. Overview & Operational Metrics (§14, §23)
// -------------------------------------------------------------------
router.get('/metrics', MarketingController.getMarketingMetrics);

// -------------------------------------------------------------------
// 2. Sales Cadence Sequences (§14)
// -------------------------------------------------------------------
router.get('/sequences', MarketingController.getSequences);
router.get('/sequences/:id', MarketingController.getSequenceById);
router.post('/sequences', MarketingController.createSequence);
router.put('/sequences/:id', MarketingController.updateSequence);
router.delete('/sequences/:id', MarketingController.deleteSequence);

// Sequence Steps Builder (§14)
router.post('/sequences/:id/steps', MarketingController.addSequenceStep);
router.put('/sequences/:id/steps/:stepId', MarketingController.updateSequenceStep);
router.delete('/sequences/:id/steps/:stepId', MarketingController.deleteSequenceStep);

// Sequence Contact Enrollment (§14)
router.post('/sequences/:id/enroll', MarketingController.enrollContacts);

// -------------------------------------------------------------------
// 3. Cadence Enrollments & Step Simulator (§14)
// -------------------------------------------------------------------
router.get('/enrollments', MarketingController.getEnrollments);
router.patch('/enrollments/:id/status', MarketingController.updateEnrollmentStatus);
router.post('/enrollments/:id/execute-step', MarketingController.executeStep);
router.post('/enrollments/:id/reply', MarketingController.simulateReply);

// -------------------------------------------------------------------
// 4. Broadcast Email Campaigns & Segments (§23)
// -------------------------------------------------------------------
router.get('/campaigns/audience-preview', MarketingController.getAudiencePreview);
router.get('/campaigns', MarketingController.getCampaigns);
router.get('/campaigns/:id', MarketingController.getCampaignById);
router.post('/campaigns', MarketingController.createCampaign);
router.put('/campaigns/:id', MarketingController.updateCampaign);
router.delete('/campaigns/:id', MarketingController.deleteCampaign);
router.post('/campaigns/:id/send', MarketingController.sendCampaign);

// Recipient Engagement Tracking
router.post('/recipients/:recipientId/track', MarketingController.trackRecipientEvent);

export default router;
