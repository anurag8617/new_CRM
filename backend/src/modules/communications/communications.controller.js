import { CommunicationsService } from './communications.service.js';

export class CommunicationsController {
  // Email Messages
  static async sendEmail(req, res, next) {
    try {
      const orgId = req.user.organizationId;
      const actorId = req.user.id;
      const email = await CommunicationsService.sendEmail(orgId, actorId, req.body);
      res.status(201).json({ success: true, data: email, message: 'Email sent and logged to timeline' });
    } catch (err) {
      next(err);
    }
  }

  static async listEmails(req, res, next) {
    try {
      const orgId = req.user.organizationId;
      const { recordType, recordId, limit } = req.query;
      const emails = await CommunicationsService.listEmails(orgId, { recordType, recordId, limit });
      res.status(200).json({ success: true, data: emails });
    } catch (err) {
      next(err);
    }
  }

  // Templates
  static async listTemplates(req, res, next) {
    try {
      const orgId = req.user.organizationId;
      const { category } = req.query;
      const templates = await CommunicationsService.listTemplates(orgId, { category });
      res.status(200).json({ success: true, data: templates });
    } catch (err) {
      next(err);
    }
  }

  static async createTemplate(req, res, next) {
    try {
      const orgId = req.user.organizationId;
      const creatorId = req.user.id;
      const template = await CommunicationsService.createTemplate(orgId, creatorId, req.body);
      res.status(201).json({ success: true, data: template });
    } catch (err) {
      next(err);
    }
  }

  static async updateTemplate(req, res, next) {
    try {
      const orgId = req.user.organizationId;
      const { id } = req.params;
      const template = await CommunicationsService.updateTemplate(orgId, id, req.body);
      res.status(200).json({ success: true, data: template });
    } catch (err) {
      next(err);
    }
  }

  static async deleteTemplate(req, res, next) {
    try {
      const orgId = req.user.organizationId;
      const { id } = req.params;
      await CommunicationsService.deleteTemplate(orgId, id);
      res.status(200).json({ success: true, message: 'Template deleted' });
    } catch (err) {
      next(err);
    }
  }

  // Calls
  static async logCall(req, res, next) {
    try {
      const orgId = req.user.organizationId;
      const actorId = req.user.id;
      const call = await CommunicationsService.logCall(orgId, actorId, req.body);
      res.status(201).json({ success: true, data: call, message: 'Call logged and normalized to timeline' });
    } catch (err) {
      next(err);
    }
  }

  static async listCalls(req, res, next) {
    try {
      const orgId = req.user.organizationId;
      const { recordType, recordId, limit } = req.query;
      const calls = await CommunicationsService.listCalls(orgId, { recordType, recordId, limit });
      res.status(200).json({ success: true, data: calls });
    } catch (err) {
      next(err);
    }
  }
}
