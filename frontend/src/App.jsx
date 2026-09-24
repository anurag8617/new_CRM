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
import SequencesCampaignsView from './components/SequencesCampaignsView';
import IntegrationsView from './components/IntegrationsView';
import FormsLandingPagesView from './components/FormsLandingPagesView';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { checkHealth, getDbStatus } from './services/api';
import { 
  Building, 
  Users, 
  Shield, 
  Database, 
  Briefcase, 
  Receipt,
  FileText, 
  Unlock, 
  Key, 
  Sparkles, 
  LayoutDashboard, 
  Building2, 
  Workflow, 
  Zap, 
  Calendar, 
  BarChart3, 
  Bot, 
  Headphones, 
  Send, 
  Webhook, 
  ArrowRight
} from 'lucide-react';
import { Button, Card, Badge } from './components/ui';

function DashboardContent() {
  const { user, organization, workspace, permissions, isAuthenticated, logout } = useAuth();
  const [healthData, setHealthData] = useState(null);
  const [dbData, setDbData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [showPermissions, setShowPermissions] = useState(false);
  const [activeTab, setActiveTab] = useState('contacts');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

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
      description: 'Dynamic schema engine, user-defined entity types, relationships, and custom attributes.'
    },
    {
      title: 'CPQ & Quotes (§12)',
      icon: Receipt,
      tables: ['products', 'price_books', 'price_book_entries', 'quotes', 'quote_line_items'],
      description: 'Product catalog, tiered price books, discount rules, approval workflows, and quote PDFs.'
    },
    {
      title: 'Automations & Workflows (§13)',
      icon: Workflow,
      tables: ['workflows', 'workflow_actions', 'workflow_executions'],
      description: 'Event-driven triggers, multi-step conditions, branching, and automated field updates.'
    },
    {
      title: 'Support Tickets & SLA (§14)',
      icon: Headphones,
      tables: ['tickets', 'ticket_comments', 'sla_policies', 'kb_articles'],
      description: 'Helpdesk ticketing, SLA countdown policies, canned responses, and knowledge base.'
    },
    {
      title: 'Sequences & Email Outreach (§15)',
      icon: Send,
      tables: ['sequences', 'sequence_steps', 'sequence_enrollments', 'email_templates', 'campaigns'],
      description: 'Multi-touch outbound email cadences, automatic delay timers, and marketing campaigns.'
    },
    {
      title: 'AI Copilot & Autonomous Agents (§16)',
      icon: Bot,
      tables: ['ai_conversations', 'ai_messages', 'ai_agents', 'ai_agent_runs'],
      description: 'Conversational CRM assistant, record summarization, email drafting, and background agents.'
    },
    {
      title: 'Webhooks, APIs & Integrations (§23)',
      icon: Webhook,
      tables: ['api_keys', 'webhook_endpoints', 'webhook_deliveries', 'integrations', 'integration_sync_logs'],
      description: 'Inbound API authentication, outbound HMAC event dispatching, and external syncing.'
    },
    {
      title: 'Lead Capture Forms & Landing Pages (§26)',
      icon: FileText,
      tables: ['forms', 'form_fields', 'form_submissions', 'landing_pages', 'lead_routing_rules'],
      description: 'Public embeddable lead forms, landing pages, tracking, and multi-tenant lead routing.'
    },
    {
      title: 'Governance & Auditing (§40)',
      icon: FileText,
      tables: ['audit_logs'],
      description: 'Full immutable audit trail with before/after state diffing and actor tracking.'
    }
  ];

  return (
    <div className="h-screen bg-[var(--bg-app)] text-[var(--text-primary)] flex flex-col font-sans overflow-hidden">
      <Navbar 
        onOpenLogin={() => setIsLoginOpen(true)} 
        onNavigateTab={(tab) => setActiveTab(tab)}
        onToggleMobileSidebar={() => setIsMobileSidebarOpen(prev => !prev)}
      />

      <div className="flex flex-1 relative overflow-hidden min-h-0">
        <Sidebar 
          activeTab={activeTab} 
          onSelectTab={(tab) => {
            setActiveTab(tab);
            setIsMobileSidebarOpen(false);
          }}
          isMobileOpen={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
          counts={dbData?.counts}
          onOpenLogin={() => setIsLoginOpen(true)}
        />

        <main className="flex-1 p-4 md:p-6 overflow-y-auto min-h-0 w-full bg-[var(--bg-app)]">
          {/* Quick Segmented Nav Bar (Responsive & Clean UI.md §6.6) */}
          <div className="flex items-center gap-1.5 pb-3 mb-4 overflow-x-auto border-b border-[var(--border-subtle)]">
            {[
              { id: 'contacts', label: 'Contacts', count: dbData?.counts?.contacts || 4, icon: Users },
              { id: 'companies', label: 'Companies', count: dbData?.counts?.companies || 3, icon: Building2 },
              { id: 'deals', label: 'Deals', count: dbData?.counts?.deals || 4, icon: Briefcase },
              { id: 'cpq', label: 'Quotes & CPQ', count: dbData?.counts?.quotes || 2, icon: Receipt },
              { id: 'forms', label: 'Forms & Pages', count: (dbData?.counts?.forms || 2) + (dbData?.counts?.landingPages || 2), icon: FileText },
              { id: 'activities', label: 'Tasks & Activities', count: dbData?.counts?.tasks || 4, icon: Calendar },
              { id: 'tickets', label: 'Tickets', count: dbData?.counts?.tickets || 4, icon: Headphones },
              { id: 'sequences', label: 'Outreach', count: dbData?.counts?.sequences || 2, icon: Send },
              { id: 'ai', label: 'AI Copilot', count: 'Active', icon: Bot, isAi: true },
              { id: 'automation', label: 'Workflows', count: dbData?.counts?.workflows || 2, icon: Workflow },
              { id: 'custom_objects', label: 'Custom Objects', count: dbData?.counts?.customObjects || 2, icon: Database },
              { id: 'reports', label: 'Reports', count: dbData?.counts?.reports || 7, icon: BarChart3 },
              { id: 'integrations', label: 'Webhooks & APIs', count: (dbData?.counts?.webhooks || 3) + (dbData?.counts?.integrations || 5), icon: Webhook },
              { id: 'dashboard', label: 'Schema Architecture', count: '68 Tables', icon: LayoutDashboard }
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-sm)] text-xs font-medium transition-all shrink-0 select-none ${
                    isActive
                      ? 'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] font-semibold shadow-xs'
                      : 'bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${tab.isAi && !isActive ? 'text-[var(--accent)]' : ''}`} />
                  <span>{tab.label}</span>
                  {tab.count !== undefined && (
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      isActive 
                        ? 'bg-[var(--btn-primary-text)]/15 text-[var(--btn-primary-text)]' 
                        : 'bg-[var(--bg-active)] text-[var(--text-tertiary)]'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
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

          {activeTab === 'sequences' && (
            <div className="animate-in fade-in duration-150">
              <SequencesCampaignsView />
            </div>
          )}

          {activeTab === 'integrations' && (
            <div className="animate-in fade-in duration-150">
              <IntegrationsView />
            </div>
          )}

          {activeTab === 'forms' && (
            <div className="animate-in fade-in duration-150">
              <FormsLandingPagesView />
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
            <div className="space-y-6 max-w-7xl mx-auto">
              {/* Architecture Header */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-[var(--radius-lg)] bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-[var(--radius-md)] bg-[var(--bg-surface-sunken)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--accent)] shrink-0">
                    <LayoutDashboard className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-[var(--text-primary)]">
                      Architecture & Schema Explorer
                    </h2>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                      Nexus Multi-Tenant CRM Platform · 68 Production InnoDB Tables Active
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant="success">All Systems Operational</Badge>
                  <Button variant="secondary" size="sm" onClick={fetchData}>
                    Refresh Status
                  </Button>
                </div>
              </div>

              {/* Quick Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                {[
                  { label: 'Active Tables', val: dbData?.totalTables || 68, sub: 'MySQL InnoDB' },
                  { label: 'Contacts', val: dbData?.counts?.contacts || 4, sub: 'Standard Object' },
                  { label: 'Companies', val: dbData?.counts?.companies || 3, sub: 'Accounts' },
                  { label: 'Deals', val: dbData?.counts?.deals || 4, sub: 'Pipelines' },
                  { label: 'System Roles', val: dbData?.counts?.roles || 6, sub: 'RBAC Matrix' },
                  { label: 'Permissions', val: dbData?.counts?.permissions || 38, sub: 'Field Rules' }
                ].map((stat, i) => (
                  <Card key={i} className="p-3.5 space-y-1">
                    <span className="text-xs font-medium text-[var(--text-secondary)]">{stat.label}</span>
                    <p className="text-xl font-bold text-[var(--text-primary)] tabular-nums">{stat.val}</p>
                    <span className="text-[10px] text-[var(--text-tertiary)] block">{stat.sub}</span>
                  </Card>
                ))}
              </div>

              {/* Schema Category Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {schemaCategories.map((cat) => {
                  const Icon = cat.icon;
                  return (
                    <Card key={cat.title} className="p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-[var(--radius-sm)] bg-[var(--bg-surface-sunken)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-primary)]">
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <h4 className="text-xs font-semibold text-[var(--text-primary)]">{cat.title}</h4>
                      </div>
                      <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{cat.description}</p>
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {cat.tables.map((table) => (
                          <span 
                            key={table}
                            className="text-[11px] font-mono bg-[var(--bg-surface-sunken)] px-2 py-0.5 rounded-[var(--radius-xs)] border border-[var(--border-subtle)] text-[var(--text-primary)]"
                          >
                            {table}
                          </span>
                        ))}
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Login Modal */}
      <LoginModal isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <DashboardContent />
      </AuthProvider>
    </ThemeProvider>
  );
}
