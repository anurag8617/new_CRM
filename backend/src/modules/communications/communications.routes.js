import { Router } from 'express';
import { CommunicationsController } from './communications.controller.js';
import { authenticate } from '../../middlewares/auth.js';

const router = Router();

router.use(authenticate);

// Emails
router.post('/email', CommunicationsController.sendEmail);
router.get('/emails', CommunicationsController.listEmails);

// Templates
router.get('/templates', CommunicationsController.listTemplates);
router.post('/templates', CommunicationsController.createTemplate);
router.put('/templates/:id', CommunicationsController.updateTemplate);
router.delete('/templates/:id', CommunicationsController.deleteTemplate);

// Calls
router.post('/calls', CommunicationsController.logCall);
router.get('/calls', CommunicationsController.listCalls);

export default router;
