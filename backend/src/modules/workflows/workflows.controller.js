import { WorkflowsService } from './workflows.service.js';

export class WorkflowsController {
  static async list(req, res, next) {
    try {
      const orgId = req.user.organizationId;
      const { status, objectType, search } = req.query;
      const workflows = await WorkflowsService.listWorkflows(orgId, { status, objectType, search });
      res.status(200).json({ success: true, data: workflows });
    } catch (err) {
      next(err);
    }
  }

  static async getById(req, res, next) {
    try {
      const orgId = req.user.organizationId;
      const { id } = req.params;
      const workflow = await WorkflowsService.getWorkflowById(orgId, id);
      if (!workflow) {
        return res.status(404).json({ success: false, message: 'Workflow not found' });
      }
      res.status(200).json({ success: true, data: workflow });
    } catch (err) {
      next(err);
    }
  }

  static async create(req, res, next) {
    try {
      const orgId = req.user.organizationId;
      const actorId = req.user.id;
      const workflow = await WorkflowsService.createWorkflow(orgId, actorId, req.body);
      res.status(201).json({ success: true, data: workflow });
    } catch (err) {
      next(err);
    }
  }

  static async update(req, res, next) {
    try {
      const orgId = req.user.organizationId;
      const { id } = req.params;
      const updated = await WorkflowsService.updateWorkflow(orgId, id, req.body);
      if (!updated) {
        return res.status(404).json({ success: false, message: 'Workflow not found' });
      }
      res.status(200).json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  }

  static async delete(req, res, next) {
    try {
      const orgId = req.user.organizationId;
      const { id } = req.params;
      const deleted = await WorkflowsService.deleteWorkflow(orgId, id);
      if (!deleted) {
        return res.status(404).json({ success: false, message: 'Workflow not found' });
      }
      res.status(200).json({ success: true, message: 'Workflow deleted successfully' });
    } catch (err) {
      next(err);
    }
  }

  static async getExecutions(req, res, next) {
    try {
      const orgId = req.user.organizationId;
      const { workflowId, limit } = req.query;
      const executions = await WorkflowsService.getExecutions(orgId, workflowId, limit);
      res.status(200).json({ success: true, data: executions });
    } catch (err) {
      next(err);
    }
  }

  static async test(req, res, next) {
    try {
      const orgId = req.user.organizationId;
      const actorId = req.user.id;
      const { id } = req.params;
      const { recordId } = req.body;

      if (!recordId) {
        return res.status(400).json({ success: false, message: 'recordId is required to test workflow execution' });
      }

      const result = await WorkflowsService.testExecuteWorkflow(orgId, actorId, id, recordId);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }
}
