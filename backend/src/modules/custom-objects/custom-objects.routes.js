import express from 'express';
import { authenticate, requirePermission } from '../../middlewares/auth.js';
import * as customObjectsController from './custom-objects.controller.js';

const router = express.Router();

router.use(authenticate);

// Object Schema
router.get('/', requirePermission('custom_objects', 'view'), customObjectsController.listObjects);
router.post('/', requirePermission('custom_objects', 'schema_manage'), customObjectsController.createObject);
router.get('/:id', requirePermission('custom_objects', 'view'), customObjectsController.getObject);
router.delete('/:id', requirePermission('custom_objects', 'schema_manage'), customObjectsController.deleteObject);

// Fields
router.post('/:id/fields', requirePermission('custom_objects', 'schema_manage'), customObjectsController.addField);
router.delete('/:id/fields/:fieldId', requirePermission('custom_objects', 'schema_manage'), customObjectsController.deleteField);

// Records
router.get('/:id/records', requirePermission('custom_objects', 'view'), customObjectsController.listRecords);
router.post('/:id/records', requirePermission('custom_objects', 'create'), customObjectsController.createRecord);
router.get('/:id/records/:recordId', requirePermission('custom_objects', 'view'), customObjectsController.getRecord);
router.put('/:id/records/:recordId', requirePermission('custom_objects', 'edit'), customObjectsController.updateRecord);
router.delete('/:id/records/:recordId', requirePermission('custom_objects', 'delete'), customObjectsController.deleteRecord);

export default router;
