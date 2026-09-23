import { Router } from 'express';
import { ContactsController } from './contacts.controller.js';
import { authenticate, requirePermission } from '../../middlewares/auth.js';

const router = Router();

// All contacts routes require authentication
router.use(authenticate);

router.get('/', requirePermission('contacts', 'view'), ContactsController.list);
router.get('/:id', requirePermission('contacts', 'view'), ContactsController.getById);
router.post('/', requirePermission('contacts', 'create'), ContactsController.create);
router.put('/:id', requirePermission('contacts', 'edit'), ContactsController.update);
router.delete('/:id', requirePermission('contacts', 'delete'), ContactsController.delete);

export default router;
