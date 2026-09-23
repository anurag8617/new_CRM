import * as pipelinesService from './pipelines.service.js';

export const listPipelines = async (req, res, next) => {
  try {
    const orgId = req.user.organizationId;
    const pipelines = await pipelinesService.getPipelinesWithStages(orgId);
    res.json({
      success: true,
      data: pipelines,
    });
  } catch (error) {
    next(error);
  }
};

export const getPipeline = async (req, res, next) => {
  try {
    const orgId = req.user.organizationId;
    const { id } = req.params;
    const pipeline = await pipelinesService.getPipelineById(orgId, id);
    if (!pipeline) {
      return res.status(404).json({ success: false, message: 'Pipeline not found' });
    }
    res.json({
      success: true,
      data: pipeline,
    });
  } catch (error) {
    next(error);
  }
};
