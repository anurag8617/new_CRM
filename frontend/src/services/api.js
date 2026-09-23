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

// Tasks & Reminders API (Spec §12)
export const getTasks = async (params = {}) => {
  const response = await api.get('/v1/tasks', { params });
  return response.data;
};

export const getTaskById = async (id) => {
  const response = await api.get(`/v1/tasks/${id}`);
  return response.data;
};

export const createTask = async (data) => {
  const response = await api.post('/v1/tasks', data);
  return response.data;
};

export const updateTask = async (id, data) => {
  const response = await api.put(`/v1/tasks/${id}`, data);
  return response.data;
};

export const deleteTask = async (id) => {
  const response = await api.delete(`/v1/tasks/${id}`);
  return response.data;
};

// Notifications API (Spec §23)
export const getNotifications = async (params = {}) => {
  const response = await api.get('/v1/notifications', { params });
  return response.data;
};

export const markNotificationRead = async (id) => {
  const response = await api.patch(`/v1/notifications/${id}/read`);
  return response.data;
};

export const markAllNotificationsRead = async () => {
  const response = await api.post('/v1/notifications/mark-all-read');
  return response.data;
};

export const deleteNotification = async (id) => {
  const response = await api.delete(`/v1/notifications/${id}`);
  return response.data;
};

// Communications & Telephony API (Spec §13, §23)
export const sendEmailMessage = async (data) => {
  const response = await api.post('/v1/communications/email', data);
  return response.data;
};

export const getEmailMessages = async (params = {}) => {
  const response = await api.get('/v1/communications/emails', { params });
  return response.data;
};

export const getEmailTemplates = async (params = {}) => {
  const response = await api.get('/v1/communications/templates', { params });
  return response.data;
};

export const createEmailTemplate = async (data) => {
  const response = await api.post('/v1/communications/templates', data);
  return response.data;
};

export const updateEmailTemplate = async (id, data) => {
  const response = await api.put(`/v1/communications/templates/${id}`, data);
  return response.data;
};

export const deleteEmailTemplate = async (id) => {
  const response = await api.delete(`/v1/communications/templates/${id}`);
  return response.data;
};

export const logPhoneCall = async (data) => {
  const response = await api.post('/v1/communications/calls', data);
  return response.data;
};

export const getPhoneCalls = async (params = {}) => {
  const response = await api.get('/v1/communications/calls', { params });
  return response.data;
};

// Analytics, Reports & Dashboards API (Spec §26-§30)
export const getAnalyticsOverview = async (params = {}) => {
  const response = await api.get('/v1/analytics/overview', { params });
  return response.data;
};

export const getPipelineFunnel = async (params = {}) => {
  const response = await api.get('/v1/analytics/funnel', { params });
  return response.data;
};

export const executeAnalyticsQuery = async (querySpec) => {
  const response = await api.post('/v1/analytics/query', querySpec);
  return response.data;
};

export const getReports = async (params = {}) => {
  const response = await api.get('/v1/analytics/reports', { params });
  return response.data;
};

export const getReportById = async (id) => {
  const response = await api.get(`/v1/analytics/reports/${id}`);
  return response.data;
};

export const runReport = async (id, params = {}) => {
  const response = await api.get(`/v1/analytics/reports/${id}/run`, { params });
  return response.data;
};

export const createReport = async (data) => {
  const response = await api.post('/v1/analytics/reports', data);
  return response.data;
};

export const updateReport = async (id, data) => {
  const response = await api.put(`/v1/analytics/reports/${id}`, data);
  return response.data;
};

export const deleteReport = async (id) => {
  const response = await api.delete(`/v1/analytics/reports/${id}`);
  return response.data;
};

export const getDashboards = async () => {
  const response = await api.get('/v1/analytics/dashboards');
  return response.data;
};

export const getDashboardById = async (id) => {
  const response = await api.get(`/v1/analytics/dashboards/${id}`);
  return response.data;
};

export const createDashboard = async (data) => {
  const response = await api.post('/v1/analytics/dashboards', data);
  return response.data;
};

export const addDashboardWidget = async (dashboardId, data) => {
  const response = await api.post(`/v1/analytics/dashboards/${dashboardId}/widgets`, data);
  return response.data;
};

export const deleteDashboardWidget = async (widgetId) => {
  const response = await api.delete(`/v1/analytics/widgets/${widgetId}`);
  return response.data;
};

// AI Copilot, Summaries & Autonomous Agents API (Spec §3, §16, §20, §47, §56)
export const askAiCopilot = async (data) => {
  const response = await api.post('/v1/ai/copilot', data);
  return response.data;
};

export const getAiConversations = async (params = {}) => {
  const response = await api.get('/v1/ai/conversations', { params });
  return response.data;
};

export const getAiMessages = async (conversationId) => {
  const response = await api.get(`/v1/ai/conversations/${conversationId}/messages`);
  return response.data;
};

export const summarizeRecordWithAi = async (data) => {
  const response = await api.post('/v1/ai/summarize', data);
  return response.data;
};

export const draftEmailWithAi = async (data) => {
  const response = await api.post('/v1/ai/draft-email', data);
  return response.data;
};

export const getAiAgents = async () => {
  const response = await api.get('/v1/ai/agents');
  return response.data;
};

export const runAiAgent = async (id, options = {}) => {
  const response = await api.post(`/v1/ai/agents/${id}/run`, options);
  return response.data;
};

export const getAiAgentRuns = async (params = {}) => {
  const response = await api.get('/v1/ai/agents/runs', { params });
  return response.data;
};

export default api;



