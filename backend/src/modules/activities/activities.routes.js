import { Router } from 'express';
import { ActivitiesController } from './activities.controller.js';
import { authenticate } from '../../middlewares/auth.js';

const router = Router();

// All activity routes require authentication
router.use(authenticate);

router.get('/', ActivitiesController.list);
router.post('/', ActivitiesController.create);

export default router;
