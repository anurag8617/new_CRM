import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to automatically attach JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('crm_access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to catch unauthorized errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // If unauthorized on protected routes, clear token
      if (localStorage.getItem('crm_access_token')) {
        localStorage.removeItem('crm_access_token');
        localStorage.removeItem('crm_refresh_token');
        localStorage.removeItem('crm_user');
      }
    }
    return Promise.reject(error);
  }
);

export const checkHealth = async () => {
  const response = await api.get('/health');
  return response.data;
};

export const getDbStatus = async () => {
  const response = await api.get('/v1/system/db-status');
  return response.data;
};

// Auth Services
export const loginUser = async (email, password) => {
  const response = await api.post('/v1/auth/login', { email, password });
  return response.data;
};

export const getCurrentUser = async () => {
  const response = await api.get('/v1/auth/me');
  return response.data;
};

export const logoutUser = async (refreshToken) => {
  const response = await api.post('/v1/auth/logout', { refreshToken });
  return response.data;
};

// Companies API
export const getCompanies = async (params = {}) => {
  const response = await api.get('/v1/companies', { params });
  return response.data;
};

export const createCompany = async (data) => {
  const response = await api.post('/v1/companies', data);
  return response.data;
};

export const deleteCompany = async (id) => {
  const response = await api.delete(`/v1/companies/${id}`);
  return response.data;
};

// Contacts API
export const getContacts = async (params = {}) => {
  const response = await api.get('/v1/contacts', { params });
  return response.data;
};

export const getContactById = async (id) => {
  const response = await api.get(`/v1/contacts/${id}`);
  return response.data;
};

export const createContact = async (data) => {
  const response = await api.post('/v1/contacts', data);
  return response.data;
};

export const updateContact = async (id, data) => {
  const response = await api.put(`/v1/contacts/${id}`, data);
  return response.data;
};

export const deleteContact = async (id) => {
  const response = await api.delete(`/v1/contacts/${id}`);
  return response.data;
};

// Activities API (Unified Timeline - Spec §10)
export const getActivities = async (recordType, recordId) => {
  const response = await api.get('/v1/activities', {
    params: { recordType, recordId },
  });
  return response.data;
};

export const createActivity = async (data) => {
  const response = await api.post('/v1/activities', data);
  return response.data;
};

// Pipelines & Deals API (Spec §9)
export const getPipelines = async () => {
  const response = await api.get('/v1/pipelines');
  return response.data;
};

export const getPipelineById = async (id) => {
  const response = await api.get(`/v1/pipelines/${id}`);
  return response.data;
};

export const getDeals = async (params = {}) => {
  const response = await api.get('/v1/deals', { params });
  return response.data;
};

export const getDealById = async (id) => {
  const response = await api.get(`/v1/deals/${id}`);
  return response.data;
};

export const createDeal = async (data) => {
  const response = await api.post('/v1/deals', data);
  return response.data;
};

export const updateDeal = async (id, data) => {
  const response = await api.put(`/v1/deals/${id}`, data);
  return response.data;
};

export const updateDealStage = async (id, stageId) => {
  const response = await api.patch(`/v1/deals/${id}/stage`, { stageId });
  return response.data;
};

export const deleteDeal = async (id) => {
  const response = await api.delete(`/v1/deals/${id}`);
  return response.data;
};

// Custom Objects & Dynamic Tables API (Spec §2)
export const getCustomObjects = async () => {
  const response = await api.get('/v1/custom-objects');
  return response.data;
};

export const getCustomObjectById = async (id) => {
  const response = await api.get(`/v1/custom-objects/${id}`);
  return response.data;
};

export const createCustomObject = async (data) => {
  const response = await api.post('/v1/custom-objects', data);
  return response.data;
};

export const deleteCustomObject = async (id) => {
  const response = await api.delete(`/v1/custom-objects/${id}`);
  return response.data;
};

export const addCustomField = async (objectId, data) => {
  const response = await api.post(`/v1/custom-objects/${objectId}/fields`, data);
  return response.data;
};

export const deleteCustomField = async (objectId, fieldId) => {
  const response = await api.delete(`/v1/custom-objects/${objectId}/fields/${fieldId}`);
  return response.data;
};

export const getCustomRecords = async (objectId, params = {}) => {
  const response = await api.get(`/v1/custom-objects/${objectId}/records`, { params });
  return response.data;
};

export const getCustomRecordById = async (objectId, recordId) => {
  const response = await api.get(`/v1/custom-objects/${objectId}/records/${recordId}`);
  return response.data;
};

export const createCustomRecord = async (objectId, data) => {
  const response = await api.post(`/v1/custom-objects/${objectId}/records`, data);
  return response.data;
};

export const updateCustomRecord = async (objectId, recordId, data) => {
  const response = await api.put(`/v1/custom-objects/${objectId}/records/${recordId}`, data);
  return response.data;
};

export const deleteCustomRecord = async (objectId, recordId) => {
  const response = await api.delete(`/v1/custom-objects/${objectId}/records/${recordId}`);
  return response.data;
};

// Workflow Automation Engine API (Spec §15)
export const getWorkflows = async (params = {}) => {
  const response = await api.get('/v1/workflows', { params });
  return response.data;
};

export const getWorkflowById = async (id) => {
  const response = await api.get(`/v1/workflows/${id}`);
  return response.data;
};

export const createWorkflow = async (data) => {
  const response = await api.post('/v1/workflows', data);
  return response.data;
};

export const updateWorkflow = async (id, data) => {
  const response = await api.put(`/v1/workflows/${id}`, data);
  return response.data;
};

export const deleteWorkflow = async (id) => {
  const response = await api.delete(`/v1/workflows/${id}`);
  return response.data;
};

export const getWorkflowExecutions = async (workflowId = null, limit = 50) => {
  const params = { limit };
  if (workflowId) params.workflowId = workflowId;
  const response = await api.get('/v1/workflows/executions', { params });
  return response.data;
};

export const testRunWorkflow = async (workflowId, recordId) => {
  const response = await api.post(`/v1/workflows/${workflowId}/test`, { recordId });
  return response.data;
};

export default api;


