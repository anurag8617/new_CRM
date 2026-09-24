import * as formsService from './forms.service.js';

/**
 * -------------------------------------------------------------------------
 * FORMS ADMIN CONTROLLERS
 * -------------------------------------------------------------------------
 */

export const getForms = async (req, res, next) => {
  try {
    const orgId = req.user.organization_id;
    const forms = await formsService.listForms(orgId);
    res.json({ success: true, data: forms });
  } catch (error) {
    next(error);
  }
};

export const getForm = async (req, res, next) => {
  try {
    const orgId = req.user.organization_id;
    const formId = parseInt(req.params.id, 10);
    const form = await formsService.getFormById(orgId, formId);
    if (!form) {
      return res.status(404).json({ success: false, message: 'Form not found' });
    }
    res.json({ success: true, data: form });
  } catch (error) {
    next(error);
  }
};

export const createForm = async (req, res, next) => {
  try {
    const orgId = req.user.organization_id;
    const workspaceId = req.user.workspace_id || 1;
    const userId = req.user.id;

    if (!req.body.name || !req.body.name.trim()) {
      return res.status(400).json({ success: false, message: 'Form name is required' });
    }

    const created = await formsService.createForm(orgId, workspaceId, userId, req.body);
    res.status(201).json({ success: true, data: created, message: 'Form created successfully' });
  } catch (error) {
    next(error);
  }
};

export const updateForm = async (req, res, next) => {
  try {
    const orgId = req.user.organization_id;
    const formId = parseInt(req.params.id, 10);

    const updated = await formsService.updateForm(orgId, formId, req.body);
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Form not found' });
    }
    res.json({ success: true, data: updated, message: 'Form updated successfully' });
  } catch (error) {
    next(error);
  }
};

export const deleteForm = async (req, res, next) => {
  try {
    const orgId = req.user.organization_id;
    const formId = parseInt(req.params.id, 10);

    const deleted = await formsService.deleteForm(orgId, formId);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Form not found' });
    }
    res.json({ success: true, message: 'Form deleted successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * -------------------------------------------------------------------------
 * PUBLIC FORM INGESTION CONTROLLERS (No Auth Required)
 * -------------------------------------------------------------------------
 */

export const getPublicForm = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const form = await formsService.getPublicFormBySlug(slug);
    if (!form) {
      return res.status(404).json({ success: false, message: 'Form not found or is currently inactive' });
    }
    res.json({ success: true, data: form });
  } catch (error) {
    next(error);
  }
};

export const submitPublicForm = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const submittedData = req.body || {};

    const metadata = {
      ipAddress: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
      userAgent: req.headers['user-agent'],
      referrer: req.headers['referer'],
      utmSource: req.query.utm_source || submittedData.utm_source,
      utmMedium: req.query.utm_medium || submittedData.utm_medium,
      utmCampaign: req.query.utm_campaign || submittedData.utm_campaign,
    };

    const result = await formsService.submitPublicForm(slug, submittedData, metadata);
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * -------------------------------------------------------------------------
 * SUBMISSIONS AUDIT CONTROLLERS
 * -------------------------------------------------------------------------
 */

export const getSubmissions = async (req, res, next) => {
  try {
    const orgId = req.user.organization_id;
    const { formId, limit, offset } = req.query;

    const submissions = await formsService.listSubmissions(orgId, {
      formId: formId ? parseInt(formId, 10) : null,
      limit: limit || 50,
      offset: offset || 0,
    });
    res.json({ success: true, data: submissions });
  } catch (error) {
    next(error);
  }
};

export const getSubmission = async (req, res, next) => {
  try {
    const orgId = req.user.organization_id;
    const submissionId = parseInt(req.params.id, 10);

    const submission = await formsService.getSubmissionById(orgId, submissionId);
    if (!submission) {
      return res.status(404).json({ success: false, message: 'Submission not found' });
    }
    res.json({ success: true, data: submission });
  } catch (error) {
    next(error);
  }
};

/**
 * -------------------------------------------------------------------------
 * LEAD ROUTING RULES CONTROLLERS (§38)
 * -------------------------------------------------------------------------
 */

export const getRoutingRules = async (req, res, next) => {
  try {
    const orgId = req.user.organization_id;
    const rules = await formsService.listRoutingRules(orgId);
    res.json({ success: true, data: rules });
  } catch (error) {
    next(error);
  }
};

export const createRoutingRule = async (req, res, next) => {
  try {
    const orgId = req.user.organization_id;
    const workspaceId = req.user.workspace_id || 1;

    if (!req.body.name || !req.body.name.trim()) {
      return res.status(400).json({ success: false, message: 'Rule name is required' });
    }

    const created = await formsService.createRoutingRule(orgId, workspaceId, req.body);
    res.status(201).json({ success: true, data: created, message: 'Routing rule created successfully' });
  } catch (error) {
    next(error);
  }
};

export const updateRoutingRule = async (req, res, next) => {
  try {
    const orgId = req.user.organization_id;
    const ruleId = parseInt(req.params.id, 10);

    const updated = await formsService.updateRoutingRule(orgId, ruleId, req.body);
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Routing rule not found' });
    }
    res.json({ success: true, data: updated, message: 'Routing rule updated successfully' });
  } catch (error) {
    next(error);
  }
};

export const deleteRoutingRule = async (req, res, next) => {
  try {
    const orgId = req.user.organization_id;
    const ruleId = parseInt(req.params.id, 10);

    const deleted = await formsService.deleteRoutingRule(orgId, ruleId);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Routing rule not found' });
    }
    res.json({ success: true, message: 'Routing rule deleted successfully' });
  } catch (error) {
    next(error);
  }
};

export const simulateLeadRouting = async (req, res, next) => {
  try {
    const orgId = req.user.organization_id;
    const samplePayload = req.body || {};

    const evaluation = await formsService.routeLead(orgId, samplePayload, false);
    res.json({ success: true, data: evaluation });
  } catch (error) {
    next(error);
  }
};

/**
 * -------------------------------------------------------------------------
 * LANDING PAGES CONTROLLERS (§23)
 * -------------------------------------------------------------------------
 */

export const getLandingPages = async (req, res, next) => {
  try {
    const orgId = req.user.organization_id;
    const pages = await formsService.listLandingPages(orgId);
    res.json({ success: true, data: pages });
  } catch (error) {
    next(error);
  }
};

export const getLandingPage = async (req, res, next) => {
  try {
    const orgId = req.user.organization_id;
    const pageId = parseInt(req.params.id, 10);

    const page = await formsService.getLandingPageById(orgId, pageId);
    if (!page) {
      return res.status(404).json({ success: false, message: 'Landing page not found' });
    }
    res.json({ success: true, data: page });
  } catch (error) {
    next(error);
  }
};

export const getPublicLandingPage = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const page = await formsService.getPublicLandingPage(slug);
    if (!page) {
      return res.status(404).json({ success: false, message: 'Landing page not found or is unpublished' });
    }
    res.json({ success: true, data: page });
  } catch (error) {
    next(error);
  }
};

export const createLandingPage = async (req, res, next) => {
  try {
    const orgId = req.user.organization_id;
    const workspaceId = req.user.workspace_id || 1;
    const userId = req.user.id;

    if (!req.body.title || !req.body.title.trim()) {
      return res.status(400).json({ success: false, message: 'Landing page title is required' });
    }

    const created = await formsService.createLandingPage(orgId, workspaceId, userId, req.body);
    res.status(201).json({ success: true, data: created, message: 'Landing page created successfully' });
  } catch (error) {
    next(error);
  }
};

export const updateLandingPage = async (req, res, next) => {
  try {
    const orgId = req.user.organization_id;
    const pageId = parseInt(req.params.id, 10);

    const updated = await formsService.updateLandingPage(orgId, pageId, req.body);
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Landing page not found' });
    }
    res.json({ success: true, data: updated, message: 'Landing page updated successfully' });
  } catch (error) {
    next(error);
  }
};

export const deleteLandingPage = async (req, res, next) => {
  try {
    const orgId = req.user.organization_id;
    const pageId = parseInt(req.params.id, 10);

    const deleted = await formsService.deleteLandingPage(orgId, pageId);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Landing page not found' });
    }
    res.json({ success: true, message: 'Landing page deleted successfully' });
  } catch (error) {
    next(error);
  }
};
