import React, { createContext, useContext, useState, useEffect } from 'react';
import { loginUser, getCurrentUser, logoutUser } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [workspace, setWorkspace] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [token, setToken] = useState(localStorage.getItem('crm_access_token') || null);
  const [loading, setLoading] = useState(true);

  // Initialize session on mount
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('crm_access_token');
      if (storedToken) {
        try {
          const res = await getCurrentUser();
          if (res.success && res.data) {
            setUser(res.data.user);
            setOrganization(res.data.organization);
            setWorkspace(res.data.workspace);
            setPermissions(res.data.permissions || []);
          }
        } catch (err) {
          console.warn('[Auth] Session restoration failed:', err.message);
          logout();
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email, password) => {
    const response = await loginUser(email, password);
    if (response.success && response.data) {
      const { accessToken, refreshToken, user, organization, workspace, permissions } = response.data;
      localStorage.setItem('crm_access_token', accessToken);
      if (refreshToken) {
        localStorage.setItem('crm_refresh_token', refreshToken);
      }
      setToken(accessToken);
      setUser(user);
      setOrganization(organization);
      setWorkspace(workspace);
      setPermissions(permissions || []);
      return response.data;
    }
    throw new Error(response.message || 'Login failed');
  };

  const logout = async () => {
    try {
      const refreshToken = localStorage.getItem('crm_refresh_token');
      if (refreshToken) {
        await logoutUser(refreshToken);
      }
    } catch (e) {
      // Ignore network errors on logout
    } finally {
      localStorage.removeItem('crm_access_token');
      localStorage.removeItem('crm_refresh_token');
      setToken(null);
      setUser(null);
      setOrganization(null);
      setWorkspace(null);
      setPermissions([]);
    }
  };

  const hasPermission = (moduleName, actionName) => {
    if (!user) return false;
    if (user.role === 'Super Admin') return true;
    return permissions.some(
      (p) => p.module === moduleName && (p.action === actionName || p.action === 'manage' || p.action === 'all')
    );
  };

  const value = {
    user,
    organization,
    workspace,
    permissions,
    token,
    isAuthenticated: !!token && !!user,
    loading,
    login,
    logout,
    hasPermission,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
