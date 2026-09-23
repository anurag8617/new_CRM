import { Router } from 'express';
import { NotificationsController } from './notifications.controller.js';
import { authenticate } from '../../middlewares/auth.js';

const router = Router();

router.use(authenticate);

router.get('/', NotificationsController.list);
router.post('/mark-all-read', NotificationsController.markAllRead);
router.patch('/:id/read', NotificationsController.markRead);
router.delete('/:id', NotificationsController.delete);

export default router;
