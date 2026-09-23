import * as customObjectsService from './custom-objects.service.js';

// Objects Schema
export const listObjects = async (req, res, next) => {
  try {
    const orgId = req.user.organizationId;
    const objects = await customObjectsService.getCustomObjects(orgId);
    res.json({
      success: true,
      data: objects,
    });
  } catch (error) {
    next(error);
  }
};

export const getObject = async (req, res, next) => {
  try {
    const orgId = req.user.organizationId;
    const { id } = req.params;
    const object = await customObjectsService.getCustomObjectById(orgId, id);
    if (!object) {
      return res.status(404).json({ success: false, message: 'Custom object not found' });
    }
    res.json({
      success: true,
      data: object,
    });
  } catch (error) {
    next(error);
  }
};

export const createObject = async (req, res, next) => {
  try {
    const orgId = req.user.organizationId;
    const { name, singularName, slug, description, icon, color } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Object name is required' });
    }

    const created = await customObjectsService.createCustomObject(orgId, {
      name,
      singularName,
      slug,
      description,
      icon,
      color,
    });

    res.status(201).json({
      success: true,
      message: 'Custom object created successfully',
      data: created,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteObject = async (req, res, next) => {
  try {
    const orgId = req.user.organizationId;
    const { id } = req.params;
    const deleted = await customObjectsService.deleteCustomObject(orgId, id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Custom object not found' });
    }
    res.json({
      success: true,
      message: 'Custom object deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

// Fields Management
export const addField = async (req, res, next) => {
  try {
    const orgId = req.user.organizationId;
    const { id } = req.params;
    const { label, fieldKey, fieldType, options, isRequired, isFilterable } = req.body;

    if (!label || !label.trim()) {
      return res.status(400).json({ success: false, message: 'Field label is required' });
    }

    const fieldId = await customObjectsService.addCustomField(orgId, id, {
      label,
      fieldKey,
      fieldType,
      options,
      isRequired,
      isFilterable,
    });

    res.status(201).json({
      success: true,
      message: 'Field added successfully',
      data: { fieldId },
    });
  } catch (error) {
    next(error);
  }
};

export const deleteField = async (req, res, next) => {
  try {
    const orgId = req.user.organizationId;
    const { id, fieldId } = req.params;
    const deleted = await customObjectsService.deleteCustomField(orgId, id, fieldId);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Field not found' });
    }
    res.json({
      success: true,
      message: 'Field deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

// Records CRUD
export const listRecords = async (req, res, next) => {
  try {
    const orgId = req.user.organizationId;
    const { id } = req.params;
    const { search } = req.query;

    const records = await customObjectsService.getCustomRecords(orgId, id, { search });
    res.json({
      success: true,
      data: records,
    });
  } catch (error) {
    next(error);
  }
};

export const getRecord = async (req, res, next) => {
  try {
    const orgId = req.user.organizationId;
    const { id, recordId } = req.params;

    const record = await customObjectsService.getCustomRecordById(orgId, id, recordId);
    if (!record) {
      return res.status(404).json({ success: false, message: 'Record not found' });
    }
    res.json({
      success: true,
      data: record,
    });
  } catch (error) {
    next(error);
  }
};

export const createRecord = async (req, res, next) => {
  try {
    const orgId = req.user.organizationId;
    const actorId = req.user.id;
    const { id } = req.params;
    const { recordName, customData } = req.body;

    if (!recordName || !recordName.trim()) {
      return res.status(400).json({ success: false, message: 'Record name is required' });
    }

    const created = await customObjectsService.createCustomRecord(orgId, actorId, id, {
      recordName,
      customData,
    });

    res.status(201).json({
      success: true,
      message: 'Record created successfully',
      data: created,
    });
  } catch (error) {
    next(error);
  }
};

export const updateRecord = async (req, res, next) => {
  try {
    const orgId = req.user.organizationId;
    const actorId = req.user.id;
    const { id, recordId } = req.params;

    const updated = await customObjectsService.updateCustomRecord(orgId, actorId, id, recordId, req.body);
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Record not found' });
    }

    res.json({
      success: true,
      message: 'Record updated successfully',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteRecord = async (req, res, next) => {
  try {
    const orgId = req.user.organizationId;
    const { id, recordId } = req.params;

    const deleted = await customObjectsService.deleteCustomRecord(orgId, id, recordId);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Record not found' });
    }

    res.json({
      success: true,
      message: 'Record deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};
