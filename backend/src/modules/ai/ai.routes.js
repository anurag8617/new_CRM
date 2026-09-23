import { Router } from 'express';
import { AiController } from './ai.controller.js';
import { authenticate } from '../../middlewares/auth.js';

const router = Router();

router.use(authenticate);

// AI Copilot Natural Language Engine (§16)
router.post('/copilot', AiController.askCopilot);
router.get('/conversations', AiController.listConversations);
router.get('/conversations/:conversationId/messages', AiController.getMessages);

// Smart Intelligence Utilities (§3, §13, §16)
router.post('/summarize', AiController.summarizeRecord);
router.post('/draft-email', AiController.draftEmail);

// Autonomous Sales Agents (§20, §56)
router.get('/agents', AiController.listAgents);
router.post('/agents/:id/run', AiController.runAgent);
router.get('/agents/runs', AiController.getAgentRuns);

export default router;
