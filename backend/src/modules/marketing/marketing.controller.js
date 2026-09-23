import { MarketingService } from './marketing.service.js';

export class MarketingController {
  // ===================================================================
  // 1. Overview Metrics (§14, §23)
  // ===================================================================
  static async getMarketingMetrics(req, res, next) {
    try {
      const orgId = req.user.organization_id;
      const metrics = await MarketingService.getMarketingMetrics(orgId);
      res.json({ success: true, data: metrics });
    } catch (error) {
      next(error);
    }
  }

  // ===================================================================
  // 2. Sales Sequences (§14)
  // ===================================================================
  static async getSequences(req, res, next) {
    try {
      const orgId = req.user.organization_id;
      const sequences = await MarketingService.getSequences(orgId);
      res.json({ success: true, data: sequences });
    } catch (error) {
      next(error);
    }
  }

  static async getSequenceById(req, res, next) {
    try {
      const orgId = req.user.organization_id;
      const sequence = await MarketingService.getSequenceById(orgId, req.params.id);
      if (!sequence) {
        return res.status(404).json({ success: false, message: 'Sequence not found' });
      }
      res.json({ success: true, data: sequence });
    } catch (error) {
      next(error);
    }
  }

  static async createSequence(req, res, next) {
    try {
      const orgId = req.user.organization_id;
      const userId = req.user.id;
      const sequence = await MarketingService.createSequence(orgId, userId, req.body);
      res.status(201).json({ success: true, data: sequence });
    } catch (error) {
      next(error);
    }
  }

  static async updateSequence(req, res, next) {
    try {
      const orgId = req.user.organization_id;
      const sequence = await MarketingService.updateSequence(orgId, req.params.id, req.body);
      res.json({ success: true, data: sequence });
    } catch (error) {
      next(error);
    }
  }

  static async deleteSequence(req, res, next) {
    try {
      const orgId = req.user.organization_id;
      const success = await MarketingService.deleteSequence(orgId, req.params.id);
      res.json({ success, message: 'Sequence deleted successfully' });
    } catch (error) {
      next(error);
    }
  }

  // ===================================================================
  // 3. Cadence Steps (§14)
  // ===================================================================
  static async addSequenceStep(req, res, next) {
    try {
      const orgId = req.user.organization_id;
      const sequence = await MarketingService.addSequenceStep(orgId, req.params.id, req.body);
      res.status(201).json({ success: true, data: sequence });
    } catch (error) {
      next(error);
    }
  }

  static async updateSequenceStep(req, res, next) {
    try {
      const orgId = req.user.organization_id;
      const sequence = await MarketingService.updateSequenceStep(orgId, req.params.id, req.params.stepId, req.body);
      res.json({ success: true, data: sequence });
    } catch (error) {
      next(error);
    }
  }

  static async deleteSequenceStep(req, res, next) {
    try {
      const orgId = req.user.organization_id;
      const sequence = await MarketingService.deleteSequenceStep(orgId, req.params.id, req.params.stepId);
      res.json({ success: true, data: sequence });
    } catch (error) {
      next(error);
    }
  }

  // ===================================================================
  // 4. Enrollments & Cadence Simulator (§14)
  // ===================================================================
  static async getEnrollments(req, res, next) {
    try {
      const orgId = req.user.organization_id;
      const enrollments = await MarketingService.getEnrollments(orgId, req.query);
      res.json({ success: true, data: enrollments });
    } catch (error) {
      next(error);
    }
  }

  static async enrollContacts(req, res, next) {
    try {
      const orgId = req.user.organization_id;
      const userId = req.user.id;
      const { contact_ids, contact_id } = req.body;
      const targets = contact_ids || (contact_id ? [contact_id] : []);

      if (targets.length === 0) {
        return res.status(400).json({ success: false, message: 'contact_ids array is required' });
      }

      const result = await MarketingService.enrollContacts(orgId, userId, req.params.id, targets);
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  static async updateEnrollmentStatus(req, res, next) {
    try {
      const orgId = req.user.organization_id;
      const { status } = req.body;
      const updated = await MarketingService.updateEnrollmentStatus(orgId, req.params.id, status);
      res.json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  }

  static async executeStep(req, res, next) {
    try {
      const orgId = req.user.organization_id;
      const userId = req.user.id;
      const result = await MarketingService.executeStep(orgId, userId, req.params.id);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  static async simulateReply(req, res, next) {
    try {
      const orgId = req.user.organization_id;
      const userId = req.user.id;
      const { reply_text } = req.body;
      const result = await MarketingService.simulateReply(orgId, userId, req.params.id, reply_text);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  // ===================================================================
  // 5. Broadcast Email Campaigns (§23)
  // ===================================================================
  static async getCampaigns(req, res, next) {
    try {
      const orgId = req.user.organization_id;
      const campaigns = await MarketingService.getCampaigns(orgId);
      res.json({ success: true, data: campaigns });
    } catch (error) {
      next(error);
    }
  }

  static async getCampaignById(req, res, next) {
    try {
      const orgId = req.user.organization_id;
      const campaign = await MarketingService.getCampaignById(orgId, req.params.id);
      if (!campaign) {
        return res.status(404).json({ success: false, message: 'Campaign not found' });
      }
      res.json({ success: true, data: campaign });
    } catch (error) {
      next(error);
    }
  }

  static async getAudiencePreview(req, res, next) {
    try {
      const orgId = req.user.organization_id;
      const segment = req.query.segment || 'all_contacts';
      const preview = await MarketingService.getAudiencePreview(orgId, segment);
      res.json({ success: true, data: preview });
    } catch (error) {
      next(error);
    }
  }

  static async createCampaign(req, res, next) {
    try {
      const orgId = req.user.organization_id;
      const userId = req.user.id;
      const campaign = await MarketingService.createCampaign(orgId, userId, req.body);
      res.status(201).json({ success: true, data: campaign });
    } catch (error) {
      next(error);
    }
  }

  static async updateCampaign(req, res, next) {
    try {
      const orgId = req.user.organization_id;
      const campaign = await MarketingService.updateCampaign(orgId, req.params.id, req.body);
      res.json({ success: true, data: campaign });
    } catch (error) {
      next(error);
    }
  }

  static async deleteCampaign(req, res, next) {
    try {
      const orgId = req.user.organization_id;
      const success = await MarketingService.deleteCampaign(orgId, req.params.id);
      res.json({ success, message: 'Campaign deleted successfully' });
    } catch (error) {
      next(error);
    }
  }

  static async sendCampaign(req, res, next) {
    try {
      const orgId = req.user.organization_id;
      const userId = req.user.id;
      const campaign = await MarketingService.sendCampaign(orgId, userId, req.params.id);
      res.json({ success: true, data: campaign });
    } catch (error) {
      next(error);
    }
  }

  static async trackRecipientEvent(req, res, next) {
    try {
      const orgId = req.user.organization_id;
      const { eventType } = req.body; // 'open' | 'click' | 'bounce'
      const campaign = await MarketingService.trackRecipientEvent(orgId, req.params.recipientId, eventType);
      res.json({ success: true, data: campaign });
    } catch (error) {
      next(error);
    }
  }
}
