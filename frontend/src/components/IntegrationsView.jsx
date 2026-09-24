import React, { useState, useEffect } from 'react';
import {
  Webhook,
  Key,
  Plug,
  Send,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  RefreshCw,
  Plus,
  Trash2,
  Copy,
  Check,
  ExternalLink,
  Shield,
  Zap,
  Sliders,
  Radio,
  FileCode,
  ArrowRight,
  Database,
  Search,
  Code2,
  Terminal,
  MessageSquare,
  CreditCard,
  Calendar,
  Layers,
  Sparkles,
  Lock,
  Eye,
  EyeOff
} from 'lucide-react';
import {
  getApiKeys,
  createApiKey,
  revokeApiKey,
  getWebhooks,
  createWebhook,
  updateWebhook,
  deleteWebhook,
  getWebhookDeliveries,
  testDispatchWebhook,
  getIntegrations,
  updateIntegration,
  triggerIntegrationSync,
  getIntegrationLogs
} from '../services/api';

export default function IntegrationsView() {
  const [activeTab, setActiveTab] = useState('hub'); // 'hub' | 'webhooks' | 'deliveries' | 'apikeys'
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Data states
  const [integrations, setIntegrations] = useState([]);
  const [webhooks, setWebhooks] = useState([]);
  const [deliveries, setDeliveries] = useState([]);
  const [apiKeys, setApiKeys] = useState([]);
  const [syncLogs, setSyncLogs] = useState([]);

  // Modals & Drawers
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [newKeyData, setNewKeyData] = useState({ name: '', scopes: ['*'], rateLimit: 60, expiresDays: '90' });
  const [generatedKeyResult, setGeneratedKeyResult] = useState(null);
  const [copiedKey, setCopiedKey] = useState(false);

  const [showWebhookModal, setShowWebhookModal] = useState(false);
  const [newWebhookData, setNewWebhookData] = useState({
    name: '',
    targetUrl: '',
    events: ['deal.stage_changed', 'contact.created'],
    secretToken: '',
  });

  const [inspectingDelivery, setInspectingDelivery] = useState(null);
  const [dispatchingWebhookId, setDispatchingWebhookId] = useState(null);
  const [syncingProvider, setSyncingProvider] = useState(null);
  const [statusMessage, setStatusMessage] = useState(null);

  // Available domain events for webhooks
  const availableEvents = [
    { id: '*', label: 'All Domain Events (*)' },
    { id: 'deal.created', label: 'deal.created' },
    { id: 'deal.stage_changed', label: 'deal.stage_changed' },
    { id: 'contact.created', label: 'contact.created' },
    { id: 'contact.updated', label: 'contact.updated' },
    { id: 'ticket.created', label: 'ticket.created' },
    { id: 'ticket.resolved', label: 'ticket.resolved' },
    { id: 'quote.accepted', label: 'quote.accepted' },
  ];

  // Available API Key Scopes
  const availableScopes = [
    { id: '*', label: 'Full Access (*)' },
    { id: 'contacts:read', label: 'contacts:read' },
    { id: 'contacts:write', label: 'contacts:write' },
    { id: 'deals:read', label: 'deals:read' },
    { id: 'deals:write', label: 'deals:write' },
    { id: 'quotes:read', label: 'quotes:read' },
    { id: 'quotes:sign', label: 'quotes:sign' },
    { id: 'tickets:read', label: 'tickets:read' },
    { id: 'tickets:write', label: 'tickets:write' },
    { id: 'webhooks:manage', label: 'webhooks:manage' },
  ];

  const fetchData = async () => {
    try {
      const [integRes, hooksRes, delivRes, keysRes, logsRes] = await Promise.all([
        getIntegrations().catch(() => ({ data: [] })),
        getWebhooks().catch(() => ({ data: [] })),
        getWebhookDeliveries({ limit: 40 }).catch(() => ({ data: [] })),
        getApiKeys().catch(() => ({ data: [] })),
        getIntegrationLogs({ limit: 20 }).catch(() => ({ data: [] })),
      ]);

      if (integRes.data) setIntegrations(integRes.data);
      if (hooksRes.data) setWebhooks(hooksRes.data);
      if (delivRes.data) setDeliveries(delivRes.data);
      if (keysRes.data) setApiKeys(keysRes.data);
      if (logsRes.data) setSyncLogs(logsRes.data);
    } catch (err) {
      console.error('Failed to load integrations data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  // Create API Key Submit
  const handleCreateApiKeySubmit = async (e) => {
    e.preventDefault();
    if (!newKeyData.name.trim()) return;

    try {
      const res = await createApiKey(newKeyData);
      if (res.success) {
        setGeneratedKeyResult(res.data);
        setShowApiKeyModal(false);
        setNewKeyData({ name: '', scopes: ['*'], rateLimit: 60, expiresDays: '90' });
        fetchData();
      }
    } catch (err) {
      alert('Failed to generate API Key: ' + (err.response?.data?.message || err.message));
    }
  };

  // Revoke API Key
  const handleRevokeApiKey = async (id) => {
    if (!window.confirm('Are you sure you want to revoke this API key? External clients will immediately lose access.')) {
      return;
    }
    try {
      await revokeApiKey(id);
      fetchData();
    } catch (err) {
      alert('Failed to revoke API key: ' + err.message);
    }
  };

  // Create Webhook Submit
  const handleCreateWebhookSubmit = async (e) => {
    e.preventDefault();
    if (!newWebhookData.name.trim() || !newWebhookData.targetUrl.trim()) return;

    try {
      const res = await createWebhook(newWebhookData);
      if (res.success) {
        setShowWebhookModal(false);
        setNewWebhookData({
          name: '',
          targetUrl: '',
          events: ['deal.stage_changed', 'contact.created'],
          secretToken: '',
        });
        fetchData();
      }
    } catch (err) {
      alert('Failed to register webhook: ' + (err.response?.data?.message || err.message));
    }
  };

  // Delete Webhook
  const handleDeleteWebhook = async (id) => {
    if (!window.confirm('Delete this webhook endpoint subscription?')) return;
    try {
      await deleteWebhook(id);
      fetchData();
    } catch (err) {
      alert('Failed to delete webhook: ' + err.message);
    }
  };

  // Test Dispatch Webhook
  const handleTestDispatch = async (webhookId) => {
    setDispatchingWebhookId(webhookId);
    try {
      const res = await testDispatchWebhook(webhookId, {
        eventType: 'deal.stage_changed',
      });
      if (res.success) {
        setStatusMessage(`✅ Webhook dispatched! Signature: ${res.data.signature.slice(0, 18)}... (Latency: ${res.data.durationMs}ms)`);
        fetchData();
        setTimeout(() => setStatusMessage(null), 6000);
      }
    } catch (err) {
      alert('Test dispatch failed: ' + err.message);
    } finally {
      setDispatchingWebhookId(null);
    }
  };

  // Toggle Integration status
  const handleToggleIntegration = async (provider, currentStatus) => {
    const nextStatus = currentStatus === 'connected' ? 'disconnected' : 'connected';
    try {
      await updateIntegration(provider, { status: nextStatus });
      fetchData();
    } catch (err) {
      alert('Failed to update integration: ' + err.message);
    }
  };

  // Trigger Integration Test Sync
  const handleTriggerSync = async (provider) => {
    setSyncingProvider(provider);
    try {
      const res = await triggerIntegrationSync(provider, 'manual_sync');
      if (res.success) {
        setStatusMessage(`⚡ [${provider.toUpperCase()}] Sync event executed successfully!`);
        fetchData();
        setTimeout(() => setStatusMessage(null), 5000);
      }
    } catch (err) {
      alert('Integration sync test failed: ' + err.message);
    } finally {
      setSyncingProvider(null);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 3000);
  };

  // Helper for provider branding
  const getProviderMeta = (provider) => {
    switch (provider) {
      case 'slack':
        return {
          title: 'Slack Deal & Support Bot',
          desc: 'Instant channel broadcasts for high-value won deals & approaching ticket SLA breaches.',
          icon: MessageSquare,
          accent: 'from-emerald-500 to-teal-600',
          badgeBg: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60',
        };
      case 'stripe':
        return {
          title: 'Stripe Billing & Payments',
          desc: 'Synchronize quote acceptance, auto-generate invoices, and reconcile incoming wire payments.',
          icon: CreditCard,
          accent: 'from-indigo-500 to-purple-600',
          badgeBg: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/60',
        };
      case 'google_calendar':
        return {
          title: 'Google Calendar Sync',
          desc: 'Bi-directional discovery call booking, reps meeting invites, and automated CRM task scheduling.',
          icon: Calendar,
          accent: 'from-sky-500 to-blue-600',
          badgeBg: 'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800/60',
        };
      case 'zapier':
        return {
          title: 'Zapier Multi-App Bridge',
          desc: 'Ingest leads from Typeform, Facebook Ads, or Webflow forms directly into contact pipelines.',
          icon: Zap,
          accent: 'from-amber-500 to-orange-600',
          badgeBg: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/60',
        };
      case 'hubspot':
        return {
          title: 'HubSpot Migration Bridge',
          desc: 'Bi-directional synchronization for migrating legacy contacts, deals, and engagement activities.',
          icon: Database,
          accent: 'from-rose-500 to-pink-600',
          badgeBg: 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/60',
        };
      default:
        return {
          title: provider,
          desc: 'External connector',
          icon: Plug,
          accent: 'from-slate-500 to-slate-700',
          badgeBg: 'bg-slate-50 text-slate-700',
        };
    }
  };

  return (
    <div className="space-y-6">
      {/* Status Notification Banner */}
      {statusMessage && (
        <div className="p-3.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800/60 text-xs font-semibold text-indigo-900 dark:text-indigo-200 flex items-center justify-between shadow-xs animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>{statusMessage}</span>
          </div>
          <button onClick={() => setStatusMessage(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            &times;
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4 transition-colors">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60 flex items-center gap-1.5">
              <Webhook className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
              <span>Step 14: Developer Webhooks & API Platform</span>
            </span>
            <span className="text-xs text-slate-400 dark:text-slate-500">Spec §31, §36, §37, §41</span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white mt-2 tracking-tight">
            Developer Webhooks, REST APIs & External Integrations
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-3xl">
            Event-driven outgoing webhooks with cryptographic HMAC SHA-256 signatures, idempotency deduplication keys, scoped developer API tokens, and pre-built enterprise connectors (Slack, Stripe, Zapier, Google Calendar).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2.5 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800 rounded-xl hover:bg-slate-200/70 transition-colors"
            title="Refresh All Integrations & Webhooks"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-indigo-600' : ''}`} />
          </button>

          <button
            onClick={() => setShowApiKeyModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-all shadow-2xs"
          >
            <Key className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>Generate API Key</span>
          </button>

          <button
            onClick={() => setShowWebhookModal(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-xs hover:shadow transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add Webhook Endpoint</span>
          </button>
        </div>
      </div>

      {/* KPI Metric Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Connected Hubs</span>
            <Plug className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-xl font-black text-slate-900 dark:text-white mt-1">
            {integrations.filter(i => i.status === 'connected').length} / {integrations.length}
          </p>
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">Slack, Stripe & Zapier Live</span>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Active Webhooks</span>
            <Webhook className="w-4 h-4 text-purple-500" />
          </div>
          <p className="text-xl font-black text-slate-900 dark:text-white mt-1">
            {webhooks.filter(w => w.status === 'active').length}
          </p>
          <span className="text-[10px] text-purple-600 dark:text-purple-400 font-semibold">HMAC SHA-256 Signed</span>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Total Deliveries</span>
            <Send className="w-4 h-4 text-sky-500" />
          </div>
          <p className="text-xl font-black text-slate-900 dark:text-white mt-1">
            {deliveries.length}
          </p>
          <span className="text-[10px] text-sky-600 dark:text-sky-400 font-semibold">Avg 48ms Execution Latency</span>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Developer Keys</span>
            <Key className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-xl font-black text-slate-900 dark:text-white mt-1">
            {apiKeys.filter(k => k.status === 'active').length}
          </p>
          <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">Scoped RBAC & Rate Limited</span>
        </div>
      </div>

      {/* Tabs Navigation Bar */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700/80 overflow-x-auto">
        <button
          onClick={() => setActiveTab('hub')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all shrink-0 ${
            activeTab === 'hub'
              ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-2xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Plug className="w-3.5 h-3.5" />
          <span>Integration Marketplace ({integrations.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('webhooks')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all shrink-0 ${
            activeTab === 'webhooks'
              ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-2xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Webhook className="w-3.5 h-3.5" />
          <span>Outgoing Webhooks ({webhooks.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('deliveries')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all shrink-0 ${
            activeTab === 'deliveries'
              ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-2xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Terminal className="w-3.5 h-3.5" />
          <span>Delivery Logs & Payloads ({deliveries.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('apikeys')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all shrink-0 ${
            activeTab === 'apikeys'
              ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-2xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Key className="w-3.5 h-3.5" />
          <span>Developer API Keys ({apiKeys.length})</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: INTEGRATION MARKETPLACE & NATIVE CONNECTORS                        */}
      {/* ========================================================================= */}
      {activeTab === 'hub' && (
        <div className="space-y-6">
          {/* Inbound Webhook Lead Ingestion Box */}
          <div className="p-4 bg-gradient-to-r from-indigo-900 via-slate-900 to-purple-950 rounded-2xl text-white shadow-xs border border-indigo-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-300 flex items-center gap-1.5">
                <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
                Public Inbound Webhook Gateway (§31)
              </span>
              <h3 className="text-sm font-bold">Universal External Inbound Webhook Listener</h3>
              <p className="text-xs text-slate-300 max-w-xl">
                Point Zapier, Make, Typeform or Stripe webhooks to this endpoint. Incoming payloads are verified with HMAC signatures and ingested into your CRM database.
              </p>
            </div>
            <div className="flex items-center gap-2 bg-black/40 border border-white/10 rounded-xl px-3 py-2 shrink-0">
              <code className="text-xs font-mono text-emerald-300 truncate max-w-xs">
                http://localhost:5000/api/v1/integrations/inbound/zapier
              </code>
              <button
                onClick={() => copyToClipboard('http://localhost:5000/api/v1/integrations/inbound/zapier')}
                className="p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
                title="Copy Inbound Webhook URL"
              >
                {copiedKey ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Connectors Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {integrations.map((integ) => {
              const meta = getProviderMeta(integ.provider);
              const Icon = meta.icon;
              const isConnected = integ.status === 'connected';

              return (
                <div
                  key={integ.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-2xs flex flex-col justify-between transition-all hover:border-slate-300 dark:hover:border-slate-700"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${meta.accent} text-white flex items-center justify-center font-bold shadow-xs`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border capitalize ${
                        isConnected
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700'
                      }`}>
                        {integ.status}
                      </span>
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">{meta.title}</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                        {meta.desc}
                      </p>
                    </div>

                    {/* Sync telemetry */}
                    <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 rounded-xl text-[11px] space-y-1">
                      <div className="flex justify-between text-slate-500 dark:text-slate-400">
                        <span>Total Syncs:</span>
                        <span className="font-semibold text-slate-900 dark:text-white">{integ.sync_count || 0} events</span>
                      </div>
                      <div className="flex justify-between text-slate-500 dark:text-slate-400">
                        <span>Last Execution:</span>
                        <span className="font-semibold text-slate-900 dark:text-white">
                          {integ.last_sync_at ? new Date(integ.last_sync_at).toLocaleTimeString() : 'Never'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-4 border-t border-slate-100 dark:border-slate-800 mt-4">
                    <button
                      onClick={() => handleToggleIntegration(integ.provider, integ.status)}
                      className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-colors ${
                        isConnected
                          ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/40'
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      }`}
                    >
                      {isConnected ? 'Disconnect' : 'Connect'}
                    </button>

                    {isConnected && (
                      <button
                        onClick={() => handleTriggerSync(integ.provider)}
                        disabled={syncingProvider === integ.provider}
                        className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                        title="Simulate Instant Real-Time Sync Event"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${syncingProvider === integ.provider ? 'animate-spin text-indigo-600' : ''}`} />
                        <span>Test Sync</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Recent Sync Audit Stream */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-2xs space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
              <Terminal className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Real-Time Integration Event Activity Stream (§36)</span>
            </h4>

            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {syncLogs.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400">No integration sync logs recorded yet.</div>
              ) : (
                syncLogs.slice(0, 5).map((log) => (
                  <div key={log.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                      <span className="font-bold text-slate-800 dark:text-slate-200 capitalize">{log.provider}:</span>
                      <span className="font-mono text-slate-600 dark:text-slate-300">{log.action}</span>
                    </div>
                    <div className="flex items-center gap-3 text-slate-400 text-[11px]">
                      <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-semibold uppercase">{log.direction}</span>
                      <span>{new Date(log.created_at).toLocaleTimeString()}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: OUTGOING WEBHOOK ENDPOINTS                                         */}
      {/* ========================================================================= */}
      {activeTab === 'webhooks' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Registered Outgoing Webhook Endpoints</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Every event emits an HTTP POST request carrying an HMAC SHA-256 signature in the <code className="text-indigo-600 dark:text-indigo-400 font-mono">X-CRM-Signature</code> header.
              </p>
            </div>
            <button
              onClick={() => setShowWebhookModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Webhook</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-4">Endpoint Name</th>
                  <th className="py-3 px-4">Target URL</th>
                  <th className="py-3 px-4">Subscribed Events</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Last Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {webhooks.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      No webhook endpoints configured. Click "New Webhook" to register your first endpoint.
                    </td>
                  </tr>
                ) : (
                  webhooks.map((wh) => (
                    <tr key={wh.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white">
                        {wh.name}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 font-mono text-slate-600 dark:text-slate-300 max-w-xs truncate" title={wh.target_url}>
                          <ExternalLink className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate">{wh.target_url}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1">
                          {(wh.subscribed_events || []).map((ev) => (
                            <span key={ev} className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60">
                              {ev}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          wh.status === 'active'
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                            : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300'
                        }`}>
                          {wh.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        {wh.last_status_code ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">
                            HTTP {wh.last_status_code}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">—</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleTestDispatch(wh.id)}
                            disabled={dispatchingWebhookId === wh.id}
                            className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-semibold text-[11px] flex items-center gap-1 transition-colors"
                            title="Send simulated test event payload"
                          >
                            <Send className={`w-3 h-3 ${dispatchingWebhookId === wh.id ? 'animate-spin' : ''}`} />
                            <span>Test</span>
                          </button>
                          <button
                            onClick={() => handleDeleteWebhook(wh.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded transition-colors"
                            title="Delete endpoint"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: WEBHOOK DELIVERY LOGS & PAYLOAD INSPECTOR                          */}
      {/* ========================================================================= */}
      {activeTab === 'deliveries' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Recent Delivery Attempts</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Click any delivery attempt to inspect HMAC signature & request payload.</p>
              </div>
              <span className="text-xs text-slate-400 font-mono">Total {deliveries.length}</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase">
                  <tr>
                    <th className="py-3 px-4">Event</th>
                    <th className="py-3 px-4">Target Endpoint</th>
                    <th className="py-3 px-4">Response</th>
                    <th className="py-3 px-4">Latency</th>
                    <th className="py-3 px-4">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                  {deliveries.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">No delivery logs recorded yet.</td>
                    </tr>
                  ) : (
                    deliveries.map((deliv) => {
                      const isSelected = inspectingDelivery?.id === deliv.id;
                      return (
                        <tr
                          key={deliv.id}
                          onClick={() => setInspectingDelivery(deliv)}
                          className={`cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-indigo-50/80 dark:bg-indigo-950/50'
                              : 'hover:bg-slate-50/70 dark:hover:bg-slate-800/40'
                          }`}
                        >
                          <td className="py-3 px-4 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                            {deliv.event_type}
                          </td>
                          <td className="py-3 px-4 truncate max-w-xs" title={deliv.endpoint_name}>
                            <span className="font-semibold text-slate-900 dark:text-white">{deliv.endpoint_name}</span>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                              deliv.response_status === 200 || deliv.response_status === 201
                                ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
                                : 'bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300'
                            }`}>
                              HTTP {deliv.response_status || 'ERR'}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-500">
                            {deliv.duration_ms}ms
                          </td>
                          <td className="py-3 px-4 text-slate-400 text-[11px]">
                            {new Date(deliv.created_at).toLocaleTimeString()}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Delivery Inspector Panel */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
              <Code2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Payload & Header Inspector</span>
            </h4>

            {inspectingDelivery ? (
              <div className="space-y-4 text-xs">
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-2 border border-slate-100 dark:border-slate-800">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Idempotency Key:</span>
                    <span className="font-mono text-slate-900 dark:text-white truncate max-w-40 font-bold">
                      {inspectingDelivery.idempotency_key}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Delivery Status:</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 uppercase">{inspectingDelivery.status}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Target URL:</span>
                    <span className="font-mono text-slate-900 dark:text-white truncate max-w-44">
                      {inspectingDelivery.target_url}
                    </span>
                  </div>
                </div>

                {/* Headers */}
                <div>
                  <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    HTTP Request Headers (§31 HMAC Signature):
                  </span>
                  <pre className="p-3 bg-slate-950 text-emerald-400 rounded-xl font-mono text-[11px] overflow-x-auto max-h-40">
                    {JSON.stringify(inspectingDelivery.request_headers, null, 2)}
                  </pre>
                </div>

                {/* Body */}
                <div>
                  <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Dispatched JSON Payload Body:
                  </span>
                  <pre className="p-3 bg-slate-950 text-sky-300 rounded-xl font-mono text-[11px] overflow-x-auto max-h-56">
                    {JSON.stringify(inspectingDelivery.payload, null, 2)}
                  </pre>
                </div>

                {/* Remote Response */}
                <div>
                  <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Remote Target Response:
                  </span>
                  <pre className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-xl font-mono text-[11px] overflow-x-auto">
                    {inspectingDelivery.response_body || 'Empty'}
                  </pre>
                </div>
              </div>
            ) : (
              <div className="py-16 text-center text-slate-400 dark:text-slate-500 space-y-2">
                <FileCode className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600" />
                <p>Select any webhook delivery on the left to inspect headers, HMAC signature, and full JSON payload.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: DEVELOPER API KEYS                                                 */}
      {/* ========================================================================= */}
      {activeTab === 'apikeys' && (
        <div className="space-y-6">
          {/* Key Generation Success Banner */}
          {generatedKeyResult && (
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-2xl space-y-2 animate-in fade-in duration-200">
              <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold text-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>API Key Generated Successfully!</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Please copy your secret key right now. <strong>You will not be able to see it again!</strong>
              </p>
              <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 rounded-xl p-2.5">
                <code className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 flex-1 truncate">
                  {generatedKeyResult.keySecret}
                </code>
                <button
                  onClick={() => copyToClipboard(generatedKeyResult.keySecret)}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1 transition-colors"
                >
                  {copiedKey ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey ? 'Copied!' : 'Copy Key'}</span>
                </button>
              </div>
            </div>
          )}

          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Active Developer API Keys</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Scoped keys for programmatic access via HTTP Bearer Authentication. Keys are SHA-256 hashed at rest.
                </p>
              </div>
              <button
                onClick={() => setShowApiKeyModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New API Key</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase">
                  <tr>
                    <th className="py-3 px-4">Key Name</th>
                    <th className="py-3 px-4">Prefix</th>
                    <th className="py-3 px-4">Granted Scopes</th>
                    <th className="py-3 px-4">Rate Limit</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Last Used</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                  {apiKeys.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">No developer API keys active.</td>
                    </tr>
                  ) : (
                    apiKeys.map((key) => {
                      const scopes = typeof key.scopes_json === 'string' ? JSON.parse(key.scopes_json) : key.scopes_json;
                      const isRevoked = key.status === 'revoked';

                      return (
                        <tr key={key.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                            {key.name}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-slate-500">
                            {key.key_prefix}••••••••
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex flex-wrap gap-1 max-w-xs">
                              {(scopes || []).map((sc) => (
                                <span key={sc} className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60">
                                  {sc}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 font-mono text-slate-600 dark:text-slate-300">
                            {key.rate_limit_per_minute}/min
                          </td>
                          <td className="py-3.5 px-4">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              key.status === 'active'
                                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                                : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300'
                            }`}>
                              {key.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                            {key.last_used_at ? new Date(key.last_used_at).toLocaleDateString() : 'Never'}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            {!isRevoked && (
                              <button
                                onClick={() => handleRevokeApiKey(key.id)}
                                className="px-2 py-1 rounded bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 text-[11px] font-semibold transition-colors"
                              >
                                Revoke
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: NEW API KEY BUILDER                                              */}
      {/* ========================================================================= */}
      {showApiKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Key className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Generate Developer API Key</h3>
              </div>
              <button onClick={() => setShowApiKeyModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateApiKeySubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Key Name / Identifier *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Zapier Production Sync, Stripe Bridge"
                  value={newKeyData.name}
                  onChange={(e) => setNewKeyData({ ...newKeyData, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Expiration</label>
                <select
                  value={newKeyData.expiresDays}
                  onChange={(e) => setNewKeyData({ ...newKeyData, expiresDays: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                >
                  <option value="30">30 Days</option>
                  <option value="90">90 Days (Recommended)</option>
                  <option value="365">1 Year</option>
                  <option value="">Never Expires</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Rate Limit (Requests / Minute)</label>
                <input
                  type="number"
                  min="10"
                  max="1000"
                  value={newKeyData.rateLimit}
                  onChange={(e) => setNewKeyData({ ...newKeyData, rateLimit: parseInt(e.target.value, 10) || 60 })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Granted Permission Scopes</label>
                <div className="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto p-2 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                  {availableScopes.map((scope) => {
                    const isChecked = newKeyData.scopes.includes(scope.id);
                    return (
                      <label key={scope.id} className="flex items-center gap-1.5 text-[11px] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setNewKeyData({ ...newKeyData, scopes: [...newKeyData.scopes, scope.id] });
                            } else {
                              setNewKeyData({ ...newKeyData, scopes: newKeyData.scopes.filter(s => s !== scope.id) });
                            }
                          }}
                          className="rounded text-indigo-600"
                        />
                        <span className="font-mono">{scope.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowApiKeyModal(false)}
                  className="px-3.5 py-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-xs"
                >
                  Generate Key
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: NEW WEBHOOK ENDPOINT BUILDER                                     */}
      {/* ========================================================================= */}
      {showWebhookModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Webhook className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Register Webhook Endpoint</h3>
              </div>
              <button onClick={() => setShowWebhookModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateWebhookSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Endpoint Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Zapier Deal Won Hook, Slack Webhook"
                  value={newWebhookData.name}
                  onChange={(e) => setNewWebhookData({ ...newWebhookData, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Target HTTPS URL *</label>
                <input
                  type="url"
                  required
                  placeholder="https://your-server.com/api/webhooks/crm"
                  value={newWebhookData.targetUrl}
                  onChange={(e) => setNewWebhookData({ ...newWebhookData, targetUrl: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">HMAC Secret Token (Optional)</label>
                <input
                  type="text"
                  placeholder="Leave blank to auto-generate secure secret"
                  value={newWebhookData.secretToken}
                  onChange={(e) => setNewWebhookData({ ...newWebhookData, secretToken: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono text-[11px]"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Subscribed Events</label>
                <div className="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto p-2 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                  {availableEvents.map((ev) => {
                    const isChecked = newWebhookData.events.includes(ev.id);
                    return (
                      <label key={ev.id} className="flex items-center gap-1.5 text-[11px] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setNewWebhookData({ ...newWebhookData, events: [...newWebhookData.events, ev.id] });
                            } else {
                              setNewWebhookData({ ...newWebhookData, events: newWebhookData.events.filter(eId => eId !== ev.id) });
                            }
                          }}
                          className="rounded text-indigo-600"
                        />
                        <span className="font-mono">{ev.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowWebhookModal(false)}
                  className="px-3.5 py-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-xs"
                >
                  Register Endpoint
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
