import { Router } from 'express';
import { TasksController } from './tasks.controller.js';
import { authenticate } from '../../middlewares/auth.js';

const router = Router();

router.use(authenticate);

router.get('/', TasksController.list);
router.get('/:id', TasksController.getById);
router.post('/', TasksController.create);
router.put('/:id', TasksController.update);
router.delete('/:id', TasksController.delete);

export default router;
