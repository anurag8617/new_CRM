import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import LoginModal from './components/LoginModal';
import ContactsView from './components/ContactsView';
import CompaniesView from './components/CompaniesView';
import DealsView from './components/DealsView';
import CustomObjectsView from './components/CustomObjectsView';
import WorkflowsView from './components/WorkflowsView';
import ActivitiesTasksView from './components/ActivitiesTasksView';
import AnalyticsReportsView from './components/AnalyticsReportsView';
import AiCopilotView from './components/AiCopilotView';
import CpqView from './components/CpqView';
import TicketsView from './components/TicketsView';
import { AuthProvider, useAuth } from './context/AuthContext';
import { checkHealth, getDbStatus } from './services/api';
import { 
  Server, 
  Database, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Layers, 
  Cpu, 
  ShieldCheck,
  ArrowRight,
  Key,
  Building,
  Users,
  Shield,
  FileText,
  Lock,
  Unlock,
  Check,
  Sparkles,
  LayoutDashboard,
  Building2,
  Briefcase,
  Workflow,
  Zap,
  Calendar,
  BarChart3,
  Bot,
  Receipt,
  Headphones
} from 'lucide-react';

function DashboardContent() {
  const { user, organization, workspace, permissions, isAuthenticated, token, logout } = useAuth();
  const [healthData, setHealthData] = useState(null);
  const [dbData, setDbData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [showPermissions, setShowPermissions] = useState(false);
  const [activeTab, setActiveTab] = useState('contacts'); // Default to contacts to showcase Step 4!

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [health, db] = await Promise.all([
        checkHealth().catch(err => ({ status: 'error', message: err.message })),
        getDbStatus().catch(err => null)
      ]);
      setHealthData(health);
      setDbData(db);
    } catch (err) {
      setError(err.message || 'Failed to connect to backend API');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const schemaCategories = [
    {
      title: 'Tenant Foundation (§0)',
      icon: Building,
      tables: ['organizations', 'workspaces', 'organization_settings', 'organization_features'],
      description: 'Shared database multi-tenancy model with organization_id isolation.'
    },
    {
      title: 'Identity & Teams (§0)',
      icon: Users,
      tables: ['users', 'teams', 'team_members', 'user_sessions', 'user_roles'],
      description: 'User authentication, password hashing, sessions, and hierarchical teams.'
    },
    {
      title: 'RBAC & Field Permissions (§1)',
      icon: Shield,
      tables: ['roles', 'permissions', 'role_permissions', 'field_permissions'],
      description: 'Granular permissions, system & custom roles, field-level access control.'
    },
    {
      title: 'Standard CRM Objects & Timeline (§6, §7, §10)',
      icon: Users,
      tables: ['companies', 'contacts', 'activities'],
      description: 'Companies, contact records, parent-child hierarchies, and unified activity timeline.'
    },
    {
      title: 'Sales Pipelines & Deals (§9)',
      icon: Briefcase,
      tables: ['pipelines', 'pipeline_stages', 'deals', 'deal_line_items'],
      description: 'Multiple sales pipelines, stage win probabilities, opportunities, and product line items.'
    },
    {
      title: 'Custom Objects & Dynamic Schema (§2)',
      icon: Database,
      tables: ['custom_objects', 'custom_fields', 'custom_records', 'object_relationships', 'relationship_links'],
      description: 'Dynamic schema builder, hybrid JSON datastore, and cross-object relational graph links.'
    },
    {
      title: 'Workflow Automation Engine (§15)',
      icon: Workflow,
      tables: ['workflows', 'workflow_conditions', 'workflow_actions', 'workflow_executions', 'workflow_execution_steps'],
      description: 'Event-driven triggers, conditional logic evaluators, and step-by-step automated execution logs.'
    },
    {
      title: 'Communication Center & Tasks (§10, §12, §13, §23)',
      icon: Calendar,
      tables: ['tasks', 'notifications', 'email_messages', 'email_templates', 'calls_log'],
      description: 'Unified tasks, in-app notifications, bi-directional email tracking, templates, and call logging.'
    },
    {
      title: 'Analytics, Reports & Dashboards (§26-§30)',
      icon: BarChart3,
      tables: ['reports', 'dashboards', 'dashboard_widgets'],
      description: 'Visual query builder, conversion funnels, executive dashboards, and parameterized reporting.'
    },
    {
      title: 'AI Copilot & Autonomous Agents (§16, §20, §47, §56)',
      icon: Bot,
      tables: ['agents', 'agent_runs', 'ai_conversations', 'ai_messages'],
      description: 'Autonomous sales agents, evaluation runs, conversational memory, and LLM-powered sales auditing.'
    },
    {
      title: 'Products, Pricebooks & CPQ Engine (§24, §25)',
      icon: Receipt,
      tables: ['products', 'price_books', 'price_book_entries', 'quotes', 'quote_line_items'],
      description: 'Product catalog, multi-currency pricebooks, volume discount matrices, quote lifecycles, and DocuSign e-signatures.'
    },
    {
      title: 'Support & Ticketing Engine (Spec §23, §26)',
      icon: Headphones,
      tables: ['sla_policies', 'tickets', 'ticket_messages', 'canned_responses', 'kb_articles'],
      description: 'Multi-channel support tickets, SLA policy timers, omnichannel conversation threads, canned replies, and knowledge base.'
    },
    {
      title: 'Governance & Auditing (§40)',
      icon: FileText,
      tables: ['audit_logs'],
      description: 'Full immutable audit trail with before/after state diffing and actor tracking.'
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Navbar onOpenLogin={() => setIsLoginOpen(true)} />

      <div className="flex flex-1">
        <Sidebar activeTab={activeTab} onSelectTab={(tab) => setActiveTab(tab)} />

        <main className="flex-1 p-6 md:p-8 overflow-y-auto max-w-7xl">
          {/* Module Switcher Tabs Header */}
          <div className="flex items-center gap-2 border-b border-slate-200 pb-4 mb-6">
            <button
              onClick={() => setActiveTab('contacts')}
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'contacts'
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Contacts ({dbData?.counts?.contacts || 4})</span>
            </button>

            <button
              onClick={() => setActiveTab('companies')}
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'companies'
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Companies ({dbData?.counts?.companies || 3})</span>
            </button>

            <button
              onClick={() => setActiveTab('deals')}
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'deals'
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Briefcase className="w-3.5 h-3.5" />
              <span>Deals ({dbData?.counts?.deals || 4})</span>
            </button>

            <button
              onClick={() => setActiveTab('custom_objects')}
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'custom_objects'
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              <span>Custom Objects ({dbData?.counts?.customObjects || 2})</span>
            </button>

            <button
              onClick={() => setActiveTab('automation')}
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'automation'
                  ? 'bg-amber-600 text-white shadow-sm shadow-amber-200'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
              <span>Automations ({dbData?.counts?.workflows || 2})</span>
            </button>

            <button
              onClick={() => setActiveTab('activities')}
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'activities'
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Tasks & Comms ({dbData?.counts?.tasks || 4})</span>
            </button>

            <button
              onClick={() => setActiveTab('reports')}
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'reports'
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Reports & Analytics ({dbData?.counts?.reports || 7})</span>
            </button>

            <button
              onClick={() => setActiveTab('ai')}
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'ai'
                  ? 'bg-purple-600 text-white shadow-sm shadow-purple-200'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Bot className="w-3.5 h-3.5" />
              <span>AI Copilot & Agents ({dbData?.counts?.agents || 3})</span>
            </button>

            <button
              onClick={() => setActiveTab('cpq')}
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'cpq'
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>Quotes & CPQ ({dbData?.counts?.quotes || 2})</span>
            </button>

            <button
              onClick={() => setActiveTab('tickets')}
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'tickets'
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Headphones className="w-3.5 h-3.5" />
              <span>Tickets & Support ({dbData?.counts?.tickets || 4})</span>
            </button>

            <button
              onClick={() => setActiveTab('dashboard')}
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'dashboard'
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Architecture & MySQL Schema</span>
            </button>
          </div>

          {/* Active Tab View Rendering */}
          {activeTab === 'contacts' && (
            <div className="animate-in fade-in duration-150">
              <ContactsView />
            </div>
          )}

          {activeTab === 'companies' && (
            <div className="animate-in fade-in duration-150">
              <CompaniesView />
            </div>
          )}

          {activeTab === 'deals' && (
            <div className="animate-in fade-in duration-150">
              <DealsView />
            </div>
          )}

          {activeTab === 'cpq' && (
            <div className="animate-in fade-in duration-150">
              <CpqView />
            </div>
          )}

          {activeTab === 'tickets' && (
            <div className="animate-in fade-in duration-150">
              <TicketsView />
            </div>
          )}

          {activeTab === 'custom_objects' && (
            <div className="animate-in fade-in duration-150">
              <CustomObjectsView />
            </div>
          )}

          {activeTab === 'automation' && (
            <div className="animate-in fade-in duration-150">
              <WorkflowsView />
            </div>
          )}

          {activeTab === 'activities' && (
            <div className="animate-in fade-in duration-150">
              <ActivitiesTasksView />
            </div>
          )}

          {activeTab === 'reports' && (
            <div className="animate-in fade-in duration-150">
              <AnalyticsReportsView />
            </div>
          )}

          {activeTab === 'ai' && (
            <div className="animate-in fade-in duration-150">
              <AiCopilotView />
            </div>
          )}

          {activeTab === 'dashboard' && (
            <div className="space-y-8 animate-in fade-in duration-150">
              {/* Header Banner */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 mb-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>Step 12 Complete: Omnichannel Support, Ticketing & SLA Engine Live</span>
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                    CRM Platform Schema & Core Modules
                  </h2>
                  <p className="text-sm text-slate-600 mt-1">
                    InnoDB Engine · Multi-Tenancy · 53 Tables · Support Tickets, SLA Policies, Omnichannel Threads & Knowledge Base.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  {!isAuthenticated ? (
                    <button
                      onClick={() => setIsLoginOpen(true)}
                      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-sm shadow-indigo-200 transition-all"
                    >
                      <Key className="w-4 h-4" />
                      <span>Test Sign In</span>
                    </button>
                  ) : (
                    <button
                      onClick={logout}
                      className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg hover:bg-rose-100 transition-all"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  )}

                  <button
                    onClick={fetchData}
                    disabled={loading}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 shadow-sm transition-all disabled:opacity-50"
                  >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    <span>Refresh</span>
                  </button>
                </div>
              </div>

              {/* Active Session & Auth State Banner */}
              <div>
                {isAuthenticated && user ? (
                  <div className="p-6 bg-gradient-to-r from-emerald-900 via-slate-900 to-indigo-950 text-white rounded-2xl shadow-md border border-emerald-500/30">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center font-bold text-lg text-emerald-300">
                          {user.firstName[0]}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                              Active Authenticated Session
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                              JWT Valid
                            </span>
                          </div>
                          <h3 className="text-xl font-bold mt-0.5">{user.fullName}</h3>
                          <p className="text-xs text-slate-300">
                            {user.email} · {user.jobTitle || 'Team Member'} · Role:{' '}
                            <span className="text-emerald-300 font-semibold">{user.role}</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-3">
                        <div className="bg-white/10 px-3 py-2 rounded-lg text-xs backdrop-blur-xs">
                          <span className="text-slate-400 block text-[10px]">Tenant Organization</span>
                          <span className="font-semibold text-white">{organization?.name}</span>
                        </div>

                        <div className="bg-white/10 px-3 py-2 rounded-lg text-xs backdrop-blur-xs">
                          <span className="text-slate-400 block text-[10px]">Assigned Workspace</span>
                          <span className="font-semibold text-white">{workspace?.name || 'Default'}</span>
                        </div>

                        <button
                          onClick={() => setShowPermissions(!showPermissions)}
                          className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5"
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>{showPermissions ? 'Hide' : 'View'} Permissions ({permissions.length})</span>
                        </button>
                      </div>
                    </div>

                    {/* Collapsible Permissions List */}
                    {showPermissions && (
                      <div className="mt-6 pt-6 border-t border-white/10 animate-in fade-in duration-150">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-3">
                          Resolved Role Permissions (Scoped to Tenant {organization?.slug})
                        </h4>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                          {permissions.map((p, idx) => (
                            <div
                              key={idx}
                              className="bg-white/5 border border-white/10 p-2 rounded text-[11px] font-mono text-slate-200 flex items-center justify-between"
                            >
                              <span>{p.module}:{p.action}</span>
                              <span className="text-[9px] px-1 py-0.5 bg-emerald-500/20 text-emerald-300 rounded">
                                {p.scope}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                        <Unlock className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-slate-900">Sign in to Access Full Features</h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Use the demo admin account to explore tenant-scoped contacts and companies with full permissions.
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => setIsLoginOpen(true)}
                      className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm shadow-indigo-200 transition-all flex items-center gap-2"
                    >
                      <Key className="w-4 h-4" />
                      <span>One-Click Demo Sign In</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Quick Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
                  <span className="text-xs font-medium text-slate-500">Total MySQL Tables</span>
                  <p className="text-2xl font-bold text-slate-900 mt-1">
                    {dbData ? dbData.totalTables : '39'}
                  </p>
                  <span className="text-[11px] text-emerald-600 font-semibold mt-1 inline-block">39 InnoDB</span>
                </div>

                <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
                  <span className="text-xs font-medium text-slate-500">Contacts</span>
                  <p className="text-2xl font-bold text-slate-900 mt-1">
                    {dbData?.counts?.contacts || 4}
                  </p>
                  <span className="text-[11px] text-indigo-600 font-medium mt-1 inline-block">Standard Object §6</span>
                </div>

                <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
                  <span className="text-xs font-medium text-slate-500">Companies</span>
                  <p className="text-2xl font-bold text-slate-900 mt-1">
                    {dbData?.counts?.companies || 3}
                  </p>
                  <span className="text-[11px] text-blue-600 font-medium mt-1 inline-block">Standard Object §7</span>
                </div>

                <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
                  <span className="text-xs font-medium text-slate-500">Timeline Events</span>
                  <p className="text-2xl font-bold text-slate-900 mt-1">
                    {dbData?.counts?.activities || 3}
                  </p>
                  <span className="text-[11px] text-emerald-600 font-medium mt-1 inline-block">Activity Feed §10</span>
                </div>

                <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
                  <span className="text-xs font-medium text-slate-500">System Roles</span>
                  <p className="text-2xl font-bold text-slate-900 mt-1">
                    {dbData ? dbData.counts.roles : '6'}
                  </p>
                  <span className="text-[11px] text-purple-600 font-medium mt-1 inline-block">RBAC Foundation</span>
                </div>

                <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
                  <span className="text-xs font-medium text-slate-500">Permissions</span>
                  <p className="text-2xl font-bold text-slate-900 mt-1">
                    {dbData ? dbData.counts.permissions : '38'}
                  </p>
                  <span className="text-[11px] text-emerald-600 font-medium mt-1 inline-block">Granular Rules</span>
                </div>
              </div>

              {/* MySQL Schema Structure (The 17 Tables) */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      MySQL Schema Architecture: 53 Core Tables Active
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Organized according to Section 0, 1, 2, 6, 7, 9, 10, 12, 13, 15, 23, 24, 25, 26, 27, 28, 29, 30, 40, and 51 of the CRM specification.
                    </p>
                  </div>
                  <span className="text-xs font-mono bg-slate-100 px-2 py-1 rounded text-slate-600">
                    DB: crm_db
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {schemaCategories.map((cat) => {
                    const Icon = cat.icon;
                    return (
                      <div key={cat.title} className="p-4 rounded-xl border border-slate-100 bg-slate-50/70">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="p-1.5 rounded-lg bg-indigo-100 text-indigo-700">
                            <Icon className="w-4 h-4" />
                          </div>
                          <h4 className="text-sm font-bold text-slate-800">{cat.title}</h4>
                        </div>
                        <p className="text-xs text-slate-500 mb-3">{cat.description}</p>
                        <div className="flex flex-wrap gap-1.5">
                          {cat.tables.map((table) => (
                            <span 
                              key={table}
                              className="text-xs font-mono bg-white px-2 py-1 rounded border border-slate-200 text-slate-700 shadow-2xs"
                            >
                              {table}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Next Roadmap Step Banner */}
              <div className="p-6 bg-gradient-to-r from-purple-900 via-slate-900 to-indigo-950 rounded-xl text-white shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border border-purple-500/20">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-purple-300">
                    Next Step in Architecture Roadmap
                  </span>
                  <h3 className="text-lg font-bold mt-1">
                    Step 13: Customer Sequences, Multi-Channel Outreach & Email Campaigns (Spec §14, §23)
                  </h3>
                  <p className="text-xs text-slate-300 mt-1 max-w-xl">
                    Multi-step automated sales outreach sequences, scheduled email cadences, engagement tracking, and bounce management.
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs font-semibold bg-purple-600/80 hover:bg-purple-600 px-4 py-2.5 rounded-lg border border-purple-400/30 transition-colors">
                  <span>Ready for Step 13</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Login Modal Dialog */}
      <LoginModal isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <DashboardContent />
    </AuthProvider>
  );
}
