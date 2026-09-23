import express from 'express';
import { authenticate, requirePermission } from '../../middlewares/auth.js';
import * as pipelinesController from './pipelines.controller.js';

const router = express.Router();

router.use(authenticate);

router.get('/', requirePermission('deals', 'view'), pipelinesController.listPipelines);
router.get('/:id', requirePermission('deals', 'view'), pipelinesController.getPipeline);

export default router;
