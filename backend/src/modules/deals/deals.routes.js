import express from 'express';
import { authenticate, requirePermission } from '../../middlewares/auth.js';
import * as dealsController from './deals.controller.js';

const router = express.Router();

router.use(authenticate);

router.get('/', requirePermission('deals', 'view'), dealsController.listDeals);
router.post('/', requirePermission('deals', 'create'), dealsController.createDeal);
router.get('/:id', requirePermission('deals', 'view'), dealsController.getDeal);
router.put('/:id', requirePermission('deals', 'edit'), dealsController.updateDeal);
router.patch('/:id/stage', requirePermission('deals', 'edit'), dealsController.updateDealStage);
router.delete('/:id', requirePermission('deals', 'delete'), dealsController.deleteDeal);

export default router;
