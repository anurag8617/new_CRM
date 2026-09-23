import { AiService } from './ai.service.js';

export class AiController {
  static async askCopilot(req, res, next) {
    try {
      const orgId = req.user.organizationId || req.user.organization_id;
      const userId = req.user.id;
      const prompt = req.body.prompt || req.body.message;
      const { conversationId, context } = req.body;

      if (!prompt || !prompt.trim()) {
        return res.status(400).json({ success: false, message: 'prompt or message is required' });
      }

      const result = await AiService.askCopilot(orgId, userId, { prompt, conversationId, context });
      // Ensure compatibility with frontend expectations
      result.reply = result.content;
      result.toolInvocations = result.toolCalls && result.toolCalls.length > 0 ? result.toolCalls[0] : null;

      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  static async summarizeRecord(req, res, next) {
    try {
      const orgId = req.user.organizationId || req.user.organization_id;
      const recordType = req.body.recordType || req.body.entityType;
      const recordId = req.body.recordId || req.body.id;

      if (!recordType || !recordId) {
        return res.status(400).json({ success: false, message: 'recordType and recordId are required' });
      }

      const summary = await AiService.summarizeRecord(orgId, { recordType, recordId: parseInt(recordId, 10) });
      // Add property aliases for seamless frontend consumption
      summary.recordName = summary.recordTitle;
      summary.bullets = summary.summaryPoints;
      summary.risks = summary.riskFactors;
      summary.recommendedAction = summary.recommendedNextAction;

      res.json({ success: true, data: summary });
    } catch (err) {
      next(err);
    }
  }

  static async draftEmail(req, res, next) {
    try {
      const orgId = req.user.organizationId || req.user.organization_id;
      const { contactId, dealId, tone, intent, recipientName, recipientEmail, contextDetails } = req.body;
      const draft = await AiService.draftEmail(orgId, {
        contactId: contactId ? parseInt(contactId, 10) : null,
        dealId: dealId ? parseInt(dealId, 10) : null,
        tone: tone || 'professional',
        intent: intent || 'follow_up',
        recipientName,
        recipientEmail,
        contextDetails,
      });
      res.json({ success: true, data: draft });
    } catch (err) {
      next(err);
    }
  }

  static async listAgents(req, res, next) {
    try {
      const orgId = req.user.organizationId || req.user.organization_id;
      const agents = await AiService.listAgents(orgId);
      res.json({ success: true, data: agents });
    } catch (err) {
      next(err);
    }
  }

  static async runAgent(req, res, next) {
    try {
      const orgId = req.user.organizationId || req.user.organization_id;
      const agentId = parseInt(req.params.id, 10);
      const recordType = req.body.recordType || 'deal';
      const recordId = req.body.recordId ? parseInt(req.body.recordId, 10) : 1;
      const runResult = await AiService.runAgentEvaluation(orgId, agentId, {
        recordType,
        recordId,
      });
      res.json({ success: true, data: runResult });
    } catch (err) {
      next(err);
    }
  }

  static async getAgentRuns(req, res, next) {
    try {
      const orgId = req.user.organizationId || req.user.organization_id;
      const { agentId, limit } = req.query;
      const runs = await AiService.getAgentRuns(orgId, {
        agentId: agentId ? parseInt(agentId, 10) : null,
        limit: limit ? parseInt(limit, 10) : 20,
      });
      res.json({ success: true, data: runs });
    } catch (err) {
      next(err);
    }
  }

  static async listConversations(req, res, next) {
    try {
      const orgId = req.user.organizationId || req.user.organization_id;
      const userId = req.user.id;
      const convs = await AiService.listConversations(orgId, userId);
      res.json({ success: true, data: convs });
    } catch (err) {
      next(err);
    }
  }

  static async getMessages(req, res, next) {
    try {
      const orgId = req.user.organizationId || req.user.organization_id;
      const conversationId = parseInt(req.params.conversationId, 10);
      const messages = await AiService.getConversationMessages(orgId, conversationId);
      res.json({ success: true, data: messages });
    } catch (err) {
      next(err);
    }
  }
}
