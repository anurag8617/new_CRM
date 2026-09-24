import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { X, Sparkles, AlertCircle, ArrowRight, Loader2 } from 'lucide-react';
import { Button, Input } from './ui';

/**
 * UI.md §7.8 Login Modal / Onboarding
 * Minimal ChatGPT login style:
 * Centered card 400px on --bg-app, logo top, heading, stacked inputs, primary button full-width.
 */
export default function LoginModal({ isOpen, onClose }) {
  const { login } = useAuth();
  const [email, setEmail] = useState('admin@crm.local');
  const [password, setPassword] = useState('Admin@123456');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await login(email, password);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Login failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = () => {
    setEmail('admin@crm.local');
    setPassword('Admin@123456');
    setError(null);
  };

  return (
    <div className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-[var(--bg-overlay)] backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Centered Modal Card (400px) */}
      <div className="relative w-full max-w-[400px] bg-[var(--bg-modal)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] shadow-[var(--shadow-lg)] p-6 z-10 space-y-5 animate-in fade-in duration-150">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-full text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
          title="Close dialog"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Brand Header */}
        <div className="text-center space-y-1.5 pt-2">
          <div className="w-10 h-10 rounded-full bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] flex items-center justify-center mx-auto text-[var(--accent)] mb-2">
            <Sparkles className="w-5 h-5" />
          </div>
          <h2 className="text-xl font-semibold text-[var(--text-primary)] tracking-tight">
            Welcome to Nexus CRM
          </h2>
          <p className="text-xs text-[var(--text-secondary)]">
            Sign in with your credentials to access your tenant.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {error && (
            <div className="p-3 rounded-[var(--radius-sm)] bg-[var(--danger-soft)] border border-[var(--danger)]/30 flex items-start gap-2 text-xs text-[var(--danger)]">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-medium text-[var(--text-secondary)]">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@crm.local"
              className="w-full h-10 px-3 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-input)] text-xs text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:border-[var(--border-focus)] transition-colors"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-[var(--text-secondary)]">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full h-10 px-3 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-input)] text-xs text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:border-[var(--border-focus)] transition-colors"
            />
          </div>

          {/* Quick Demo Autofill */}
          <div className="p-2.5 bg-[var(--bg-surface-sunken)] rounded-[var(--radius-sm)] border border-[var(--border-subtle)] flex items-center justify-between">
            <div className="text-[11px] text-[var(--text-tertiary)]">
              admin@crm.local · Admin@123456
            </div>
            <button
              type="button"
              onClick={fillDemo}
              className="text-xs font-medium text-[var(--text-link)] hover:underline flex items-center gap-1"
            >
              <span>Fill Demo</span>
            </button>
          </div>

          <Button
            variant="primary"
            type="submit"
            loading={loading}
            className="w-full h-10 text-sm mt-2"
          >
            Sign In
          </Button>
        </form>
      </div>
    </div>
  );
}
