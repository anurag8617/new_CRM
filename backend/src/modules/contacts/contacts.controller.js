import { ContactsService } from './contacts.service.js';

export class ContactsController {
  static async list(req, res, next) {
    try {
      const { search, stage, status, companyId, page, limit, sortBy, sortOrder } = req.query;
      const result = await ContactsService.list({
        orgId: req.user.organizationId,
        search,
        stage,
        status,
        companyId,
        page,
        limit,
        sortBy,
        sortOrder,
      });
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  static async getById(req, res, next) {
    try {
      const { id } = req.params;
      const result = await ContactsService.getById({
        orgId: req.user.organizationId,
        id,
      });
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      if (err.message === 'Contact not found') {
        return res.status(404).json({ success: false, message: err.message });
      }
      next(err);
    }
  }

  static async create(req, res, next) {
    try {
      const result = await ContactsService.create({
        orgId: req.user.organizationId,
        ownerId: req.user.id,
        data: req.body,
      });
      res.status(201).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  static async update(req, res, next) {
    try {
      const { id } = req.params;
      const result = await ContactsService.update({
        orgId: req.user.organizationId,
        actorId: req.user.id,
        id,
        data: req.body,
      });
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      if (err.message === 'Contact not found') {
        return res.status(404).json({ success: false, message: err.message });
      }
      next(err);
    }
  }

  static async delete(req, res, next) {
    try {
      const { id } = req.params;
      const result = await ContactsService.delete({
        orgId: req.user.organizationId,
        actorId: req.user.id,
        id,
      });
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      if (err.message === 'Contact not found') {
        return res.status(404).json({ success: false, message: err.message });
      }
      next(err);
    }
  }
}
