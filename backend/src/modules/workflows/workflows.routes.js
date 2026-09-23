import { Router } from 'express';
import { WorkflowsController } from './workflows.controller.js';
import { authenticate, requirePermission } from '../../middlewares/auth.js';

const router = Router();

router.use(authenticate);

router.get('/executions', requirePermission('workflows:view'), WorkflowsController.getExecutions);
router.get('/', requirePermission('workflows:view'), WorkflowsController.list);
router.get('/:id', requirePermission('workflows:view'), WorkflowsController.getById);

router.post('/', requirePermission('workflows:manage'), WorkflowsController.create);
router.put('/:id', requirePermission('workflows:manage'), WorkflowsController.update);
router.delete('/:id', requirePermission('workflows:manage'), WorkflowsController.delete);

router.post('/:id/test', requirePermission('workflows:manage'), WorkflowsController.test);

export default router;
