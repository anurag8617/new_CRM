import * as integrationsService from './integrations.service.js';

// API Keys Controllers
export const getApiKeys = async (req, res, next) => {
  try {
    const keys = await integrationsService.listApiKeys(req.user.organizationId);
    res.json({ success: true, data: keys });
  } catch (err) {
    next(err);
  }
};

export const createApiKey = async (req, res, next) => {
  try {
    const { name, scopes, rateLimit, expiresDays } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'API key name is required.' });
    }

    const key = await integrationsService.createApiKey(req.user.organizationId, req.user.id, {
      name,
      scopes,
      rateLimit,
      expiresDays,
    });
    res.status(201).json({ success: true, data: key });
  } catch (err) {
    next(err);
  }
};

export const revokeApiKey = async (req, res, next) => {
  try {
    const { id } = req.params;
    const success = await integrationsService.revokeApiKey(req.user.organizationId, id);
    if (!success) {
      return res.status(404).json({ success: false, message: 'API key not found.' });
    }
    res.json({ success: true, message: 'API key revoked successfully.' });
  } catch (err) {
    next(err);
  }
};

// Webhook Endpoints Controllers
export const getWebhooks = async (req, res, next) => {
  try {
    const webhooks = await integrationsService.listWebhookEndpoints(req.user.organizationId);
    res.json({ success: true, data: webhooks });
  } catch (err) {
    next(err);
  }
};

export const getWebhook = async (req, res, next) => {
  try {
    const { id } = req.params;
    const webhook = await integrationsService.getWebhookEndpoint(req.user.organizationId, id);
    if (!webhook) {
      return res.status(404).json({ success: false, message: 'Webhook endpoint not found.' });
    }
    res.json({ success: true, data: webhook });
  } catch (err) {
    next(err);
  }
};

export const createWebhook = async (req, res, next) => {
  try {
    const { name, targetUrl, events, secretToken } = req.body;
    if (!name || !targetUrl) {
      return res.status(400).json({ success: false, message: 'Webhook name and target URL are required.' });
    }

    const webhook = await integrationsService.createWebhookEndpoint(req.user.organizationId, req.user.id, {
      name,
      targetUrl,
      events,
      secretToken,
    });
    res.status(201).json({ success: true, data: webhook });
  } catch (err) {
    next(err);
  }
};

export const updateWebhook = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updated = await integrationsService.updateWebhookEndpoint(req.user.organizationId, id, req.body);
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Webhook endpoint not found.' });
    }
    res.json({ success: true, message: 'Webhook updated successfully.' });
  } catch (err) {
    next(err);
  }
};

export const deleteWebhook = async (req, res, next) => {
  try {
    const { id } = req.params;
    const deleted = await integrationsService.deleteWebhookEndpoint(req.user.organizationId, id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Webhook endpoint not found.' });
    }
    res.json({ success: true, message: 'Webhook endpoint deleted.' });
  } catch (err) {
    next(err);
  }
};

export const getWebhookDeliveries = async (req, res, next) => {
  try {
    const { endpointId, limit } = req.query;
    const deliveries = await integrationsService.listWebhookDeliveries(
      req.user.organizationId,
      endpointId || null,
      limit || 50
    );
    res.json({ success: true, data: deliveries });
  } catch (err) {
    next(err);
  }
};

export const testDispatchWebhook = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { eventType = 'deal.stage_changed', payload = null } = req.body;

    const endpoint = await integrationsService.getWebhookEndpoint(req.user.organizationId, id);
    if (!endpoint) {
      return res.status(404).json({ success: false, message: 'Webhook endpoint not found.' });
    }

    const samplePayload = payload || {
      event: eventType,
      recordType: 'deal',
      recordId: 101,
      deal: {
        title: 'Enterprise ERP Modernization',
        value: 120000,
        currency: 'USD',
        stage: 'negotiation',
        probability: 80,
      },
      triggeredBy: req.user.email,
      timestamp: new Date().toISOString(),
    };

    const delivery = await integrationsService.dispatchWebhookDelivery(
      req.user.organizationId,
      endpoint,
      eventType,
      samplePayload
    );

    res.json({ success: true, message: 'Test webhook dispatched.', data: delivery });
  } catch (err) {
    next(err);
  }
};

// Integrations Controllers
export const getIntegrations = async (req, res, next) => {
  try {
    const integrations = await integrationsService.listIntegrations(req.user.organizationId);
    res.json({ success: true, data: integrations });
  } catch (err) {
    next(err);
  }
};

export const updateIntegration = async (req, res, next) => {
  try {
    const { provider } = req.params;
    const { status, config } = req.body;
    await integrationsService.updateIntegration(req.user.organizationId, provider, { status, config });
    res.json({ success: true, message: `Integration "${provider}" updated.` });
  } catch (err) {
    next(err);
  }
};

export const triggerSync = async (req, res, next) => {
  try {
    const { provider } = req.params;
    const { action } = req.body;
    const result = await integrationsService.triggerIntegrationSync(req.user.organizationId, provider, action);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

export const getIntegrationLogs = async (req, res, next) => {
  try {
    const { integrationId, limit } = req.query;
    const logs = await integrationsService.listIntegrationLogs(
      req.user.organizationId,
      integrationId || null,
      limit || 50
    );
    res.json({ success: true, data: logs });
  } catch (err) {
    next(err);
  }
};

// Inbound Webhook Receiver
export const handleInboundWebhook = async (req, res, next) => {
  try {
    const { provider } = req.params;
    const signature = req.headers['x-crm-signature'] || req.headers['stripe-signature'];
    const idempotencyKey = req.headers['x-idempotency-key'] || 'inbound-' + Date.now();

    console.log(`[Inbound Webhook] Received webhook from "${provider}" with idempotency key "${idempotencyKey}"`);

    res.status(200).json({
      success: true,
      received: true,
      provider,
      idempotencyKey,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
};
