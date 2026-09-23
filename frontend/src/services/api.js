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

export default api;
