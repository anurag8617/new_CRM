import { Router } from 'express';
import { CompaniesController } from './companies.controller.js';
import { authenticate, requirePermission } from '../../middlewares/auth.js';

const router = Router();

// All company routes require authentication
router.use(authenticate);

router.get('/', requirePermission('companies', 'view'), CompaniesController.list);
router.get('/:id', requirePermission('companies', 'view'), CompaniesController.getById);
router.post('/', requirePermission('companies', 'create'), CompaniesController.create);
router.put('/:id', requirePermission('companies', 'edit'), CompaniesController.update);
router.delete('/:id', requirePermission('companies', 'delete'), CompaniesController.delete);

export default router;
