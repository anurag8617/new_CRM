import { ActivitiesService } from './activities.service.js';

export class ActivitiesController {
  static async list(req, res, next) {
    try {
      const { recordType, recordId, limit } = req.query;
      if (!recordType || !recordId) {
        return res.status(400).json({ success: false, message: 'recordType and recordId are required' });
      }

      const result = await ActivitiesService.listForRecord({
        orgId: req.user.organizationId,
        recordType,
        recordId,
        limit,
      });

      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  static async create(req, res, next) {
    try {
      const { recordType, recordId, activityType, payload } = req.body;
      if (!recordType || !recordId || !activityType) {
        return res.status(400).json({
          success: false,
          message: 'recordType, recordId, and activityType are required',
        });
      }

      const result = await ActivitiesService.create({
        orgId: req.user.organizationId,
        actorId: req.user.id,
        recordType,
        recordId,
        activityType,
        payload: payload || {},
      });

      res.status(201).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }
}
