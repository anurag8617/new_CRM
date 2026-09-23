import { SupportService } from './support.service.js';

export class SupportController {
  // -------------------------------------------------------------------
  // TICKETS
  // -------------------------------------------------------------------

  static async getTickets(req, res, next) {
    try {
      const orgId = req.user.organizationId;
      const filters = {
        search: req.query.search,
        status: req.query.status,
        priority: req.query.priority,
        channel: req.query.channel,
        category: req.query.category,
        assignedTo: req.query.assignedTo,
        slaStatus: req.query.slaStatus,
      };
      const tickets = await SupportService.getTickets(orgId, filters);
      return res.json({ success: true, data: tickets, count: tickets.length });
    } catch (err) {
      next(err);
    }
  }

  static async getTicketById(req, res, next) {
    try {
      const orgId = req.user.organizationId;
      const { id } = req.params;
      const ticket = await SupportService.getTicketById(orgId, id);
      if (!ticket) {
        return res.status(404).json({ success: false, message: 'Ticket not found' });
      }
      return res.json({ success: true, data: ticket });
    } catch (err) {
      next(err);
    }
  }

  static async createTicket(req, res, next) {
    try {
      const orgId = req.user.organizationId;
      const userId = req.user.id;
      const { subject, description } = req.body;
      if (!subject || !description) {
        return res.status(400).json({ success: false, message: 'Subject and description are required.' });
      }
      const ticket = await SupportService.createTicket(orgId, userId, req.body);
      return res.status(201).json({ success: true, data: ticket, message: 'Support ticket opened successfully.' });
    } catch (err) {
      next(err);
    }
  }

  static async updateTicket(req, res, next) {
    try {
      const orgId = req.user.organizationId;
      const { id } = req.params;
      const ticket = await SupportService.updateTicket(orgId, id, req.body);
      return res.json({ success: true, data: ticket, message: 'Ticket updated successfully.' });
    } catch (err) {
      next(err);
    }
  }

  static async updateTicketStatus(req, res, next) {
    try {
      const orgId = req.user.organizationId;
      const userId = req.user.id;
      const { id } = req.params;
      const { status } = req.body;
      if (!status) {
        return res.status(400).json({ success: false, message: 'Status is required.' });
      }
      const ticket = await SupportService.updateTicketStatus(orgId, id, status, userId);
      return res.json({ success: true, data: ticket, message: `Ticket status transitioned to ${status}.` });
    } catch (err) {
      next(err);
    }
  }

  static async deleteTicket(req, res, next) {
    try {
      const orgId = req.user.organizationId;
      const { id } = req.params;
      const deleted = await SupportService.deleteTicket(orgId, id);
      if (!deleted) {
        return res.status(404).json({ success: false, message: 'Ticket not found or already deleted.' });
      }
      return res.json({ success: true, message: 'Ticket deleted successfully.' });
    } catch (err) {
      next(err);
    }
  }

  // -------------------------------------------------------------------
  // MESSAGES & CONVERSATION THREAD
  // -------------------------------------------------------------------

  static async addTicketMessage(req, res, next) {
    try {
      const orgId = req.user.organizationId;
      const userId = req.user.id;
      const { id } = req.params;
      const { bodyText } = req.body;
      if (!bodyText) {
        return res.status(400).json({ success: false, message: 'Message body text is required.' });
      }
      const updatedTicket = await SupportService.addTicketMessage(orgId, id, userId, req.body);
      return res.status(201).json({
        success: true,
        data: updatedTicket,
        message: req.body.messageType === 'internal_note' ? 'Internal note added.' : 'Reply dispatched successfully.',
      });
    } catch (err) {
      next(err);
    }
  }

  static async submitCsat(req, res, next) {
    try {
      const orgId = req.user.organizationId;
      const { id } = req.params;
      const { csatScore, csatComment } = req.body;
      if (!csatScore) {
        return res.status(400).json({ success: false, message: 'CSAT rating score (1-5) is required.' });
      }
      const ticket = await SupportService.submitCsat(orgId, id, csatScore, csatComment);
      return res.json({ success: true, data: ticket, message: 'Thank you for your feedback! CSAT rating logged.' });
    } catch (err) {
      next(err);
    }
  }

  // -------------------------------------------------------------------
  // SLA POLICIES
  // -------------------------------------------------------------------

  static async getSlaPolicies(req, res, next) {
    try {
      const orgId = req.user.organizationId;
      const policies = await SupportService.getSlaPolicies(orgId);
      return res.json({ success: true, data: policies });
    } catch (err) {
      next(err);
    }
  }

  static async createSlaPolicy(req, res, next) {
    try {
      const orgId = req.user.organizationId;
      const { name, priority } = req.body;
      if (!name || !priority) {
        return res.status(400).json({ success: false, message: 'Policy name and priority are required.' });
      }
      const policy = await SupportService.createSlaPolicy(orgId, req.body);
      return res.status(201).json({ success: true, data: policy, message: 'SLA Policy created successfully.' });
    } catch (err) {
      next(err);
    }
  }

  static async updateSlaPolicy(req, res, next) {
    try {
      const orgId = req.user.organizationId;
      const { id } = req.params;
      const policy = await SupportService.updateSlaPolicy(orgId, id, req.body);
      return res.json({ success: true, data: policy, message: 'SLA Policy updated successfully.' });
    } catch (err) {
      next(err);
    }
  }

  // -------------------------------------------------------------------
  // CANNED RESPONSES
  // -------------------------------------------------------------------

  static async getCannedResponses(req, res, next) {
    try {
      const orgId = req.user.organizationId;
      const { category } = req.query;
      const responses = await SupportService.getCannedResponses(orgId, category);
      return res.json({ success: true, data: responses });
    } catch (err) {
      next(err);
    }
  }

  static async createCannedResponse(req, res, next) {
    try {
      const orgId = req.user.organizationId;
      const userId = req.user.id;
      const { title, shortcut, bodyText } = req.body;
      if (!title || !shortcut || !bodyText) {
        return res.status(400).json({ success: false, message: 'Title, shortcut, and body text are required.' });
      }
      const canned = await SupportService.createCannedResponse(orgId, userId, req.body);
      return res.status(201).json({ success: true, data: canned, message: 'Canned response created successfully.' });
    } catch (err) {
      next(err);
    }
  }

  static async deleteCannedResponse(req, res, next) {
    try {
      const orgId = req.user.organizationId;
      const { id } = req.params;
      await SupportService.deleteCannedResponse(orgId, id);
      return res.json({ success: true, message: 'Canned response deleted.' });
    } catch (err) {
      next(err);
    }
  }

  // -------------------------------------------------------------------
  // KNOWLEDGE BASE
  // -------------------------------------------------------------------

  static async getKbArticles(req, res, next) {
    try {
      const orgId = req.user.organizationId;
      const { search, category } = req.query;
      const articles = await SupportService.getKbArticles(orgId, search, category);
      return res.json({ success: true, data: articles });
    } catch (err) {
      next(err);
    }
  }

  static async getKbArticleById(req, res, next) {
    try {
      const orgId = req.user.organizationId;
      const { id } = req.params;
      const article = await SupportService.getKbArticleById(orgId, id);
      if (!article) {
        return res.status(404).json({ success: false, message: 'Article not found.' });
      }
      return res.json({ success: true, data: article });
    } catch (err) {
      next(err);
    }
  }

  static async createKbArticle(req, res, next) {
    try {
      const orgId = req.user.organizationId;
      const userId = req.user.id;
      const { title, content } = req.body;
      if (!title || !content) {
        return res.status(400).json({ success: false, message: 'Article title and content are required.' });
      }
      const article = await SupportService.createKbArticle(orgId, userId, req.body);
      return res.status(201).json({ success: true, data: article, message: 'Article published to Knowledge Base.' });
    } catch (err) {
      next(err);
    }
  }

  static async markArticleHelpful(req, res, next) {
    try {
      const orgId = req.user.organizationId;
      const { id } = req.params;
      const article = await SupportService.markArticleHelpful(orgId, id);
      return res.json({ success: true, data: article, message: 'Thank you for your feedback!' });
    } catch (err) {
      next(err);
    }
  }

  // -------------------------------------------------------------------
  // METRICS & OPERATIONS
  // -------------------------------------------------------------------

  static async getSupportMetrics(req, res, next) {
    try {
      const orgId = req.user.organizationId;
      const metrics = await SupportService.getSupportMetrics(orgId);
      return res.json({ success: true, data: metrics });
    } catch (err) {
      next(err);
    }
  }
}
