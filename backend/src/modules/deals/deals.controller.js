import * as dealsService from './deals.service.js';

export const listDeals = async (req, res, next) => {
  try {
    const orgId = req.user.organizationId;
    const { pipelineId, stageId, status, search, ownerId } = req.query;

    const deals = await dealsService.getDeals(orgId, {
      pipelineId: pipelineId ? parseInt(pipelineId) : undefined,
      stageId: stageId ? parseInt(stageId) : undefined,
      status,
      search,
      ownerId: ownerId ? parseInt(ownerId) : undefined,
    });

    res.json({
      success: true,
      data: deals,
    });
  } catch (error) {
    next(error);
  }
};

export const getDeal = async (req, res, next) => {
  try {
    const orgId = req.user.organizationId;
    const { id } = req.params;

    const deal = await dealsService.getDealById(orgId, id);
    if (!deal) {
      return res.status(404).json({ success: false, message: 'Deal not found' });
    }

    res.json({
      success: true,
      data: deal,
    });
  } catch (error) {
    next(error);
  }
};

export const createDeal = async (req, res, next) => {
  try {
    const orgId = req.user.organizationId;
    const actorId = req.user.id;
    const { title, value, pipelineId, stageId, companyId, contactId, expectedCloseDate } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Deal title is required' });
    }

    const deal = await dealsService.createDeal(orgId, actorId, {
      title: title.trim(),
      value: parseFloat(value) || 0.0,
      pipelineId: pipelineId ? parseInt(pipelineId) : undefined,
      stageId: stageId ? parseInt(stageId) : undefined,
      companyId: companyId ? parseInt(companyId) : null,
      contactId: contactId ? parseInt(contactId) : null,
      expectedCloseDate,
    });

    res.status(201).json({
      success: true,
      message: 'Deal created successfully',
      data: deal,
    });
  } catch (error) {
    next(error);
  }
};

export const updateDealStage = async (req, res, next) => {
  try {
    const orgId = req.user.organizationId;
    const actorId = req.user.id;
    const { id } = req.params;
    const { stageId } = req.body;

    if (!stageId) {
      return res.status(400).json({ success: false, message: 'Target stageId is required' });
    }

    const updated = await dealsService.updateDealStage(orgId, actorId, id, parseInt(stageId));
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Deal not found' });
    }

    res.json({
      success: true,
      message: 'Deal stage updated successfully',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

export const updateDeal = async (req, res, next) => {
  try {
    const orgId = req.user.organizationId;
    const actorId = req.user.id;
    const { id } = req.params;

    const updated = await dealsService.updateDeal(orgId, actorId, id, req.body);
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Deal not found' });
    }

    res.json({
      success: true,
      message: 'Deal updated successfully',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteDeal = async (req, res, next) => {
  try {
    const orgId = req.user.organizationId;
    const { id } = req.params;

    const deleted = await dealsService.deleteDeal(orgId, id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Deal not found' });
    }

    res.json({
      success: true,
      message: 'Deal deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};
