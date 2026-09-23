import { TasksService } from './tasks.service.js';

export class TasksController {
  static async list(req, res, next) {
    try {
      const orgId = req.user.organizationId;
      const { status, priority, recordType, recordId, assignedTo, search, limit, page } = req.query;
      const result = await TasksService.listTasks(orgId, {
        status,
        priority,
        recordType,
        recordId,
        assignedTo,
        search,
        limit,
        page,
      });
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  static async getById(req, res, next) {
    try {
      const orgId = req.user.organizationId;
      const { id } = req.params;
      const task = await TasksService.getTaskById(orgId, id);
      if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
      res.status(200).json({ success: true, data: task });
    } catch (err) {
      next(err);
    }
  }

  static async create(req, res, next) {
    try {
      const orgId = req.user.organizationId;
      const creatorId = req.user.id;
      const task = await TasksService.createTask(orgId, creatorId, req.body);
      res.status(201).json({ success: true, data: task });
    } catch (err) {
      next(err);
    }
  }

  static async update(req, res, next) {
    try {
      const orgId = req.user.organizationId;
      const actorId = req.user.id;
      const { id } = req.params;
      const task = await TasksService.updateTask(orgId, actorId, id, req.body);
      if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
      res.status(200).json({ success: true, data: task });
    } catch (err) {
      next(err);
    }
  }

  static async delete(req, res, next) {
    try {
      const orgId = req.user.organizationId;
      const { id } = req.params;
      const deleted = await TasksService.deleteTask(orgId, id);
      if (!deleted) return res.status(404).json({ success: false, message: 'Task not found' });
      res.status(200).json({ success: true, message: 'Task deleted successfully' });
    } catch (err) {
      next(err);
    }
  }
}
