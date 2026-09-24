import React, { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { 
  Users, 
  Building2, 
  Briefcase, 
  Receipt, 
  FileText, 
  Calendar, 
  Headphones, 
  Send, 
  Bot, 
  Workflow, 
  Database, 
  BarChart3, 
  Webhook, 
  LayoutDashboard, 
  Settings, 
  Plus, 
  ChevronDown, 
  ChevronLeft, 
  ChevronRight, 
  Search, 
  X, 
  LogOut, 
  LogIn, 
  Sparkles,
  Sun,
  Moon
} from 'lucide-react';

/**
 * UI.md §5.1 Sidebar (ChatGPT-style)
 * - Width 260px, collapsible to 64px (icons only)
 * - Background --bg-sidebar (#171717 dark / #f9f9f9 light)
 * - No right border in dark mode; 1px solid var(--border-subtle) in light mode
 * - Top: Workspace switcher + prominent "+ New" button
 * - Nav groups with 12px/500 --text-tertiary headers
 * - Nav item: 36px height, 8px radius, --bg-hover, active: --bg-selected + --text-primary (no colored bar)
 * - Bottom: User profile row (avatar 32px, name, plan badge)
 */
export default function Sidebar({
  activeTab = 'contacts',
  onSelectTab,
  isMobileOpen = false,
  onCloseMobile,
  counts = {},
  onOpenLogin
}) {
  const { user, organization, workspace, isAuthenticated, logout } = useAuth();
  const { theme, isDark, toggleTheme } = useTheme();

  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      return localStorage.getItem('crm_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [showNewMenu, setShowNewMenu] = useState(false);

  const toggleCollapsed = () => {
    setIsCollapsed(prev => {
      const next = !prev;
      try {
        localStorage.setItem('crm_sidebar_collapsed', String(next));
      } catch {}
      return next;
    });
  };

  // Human-friendly navigation sections adhering to UI.md §5.1
  const navigationSections = useMemo(() => [
    {
      title: 'Sales',
      items: [
        {
          id: 'contacts',
          label: 'Contacts',
          icon: Users,
          count: counts?.contacts || 4,
          description: 'Leads, customers & stakeholders'
        },
        {
          id: 'companies',
          label: 'Companies',
          icon: Building2,
          count: counts?.companies || 3,
          description: 'Organizations & accounts'
        },
        {
          id: 'deals',
          label: 'Deals & Pipeline',
          icon: Briefcase,
          count: counts?.deals || 4,
          description: 'Opportunities & visual Kanban'
        },
        {
          id: 'cpq',
          label: 'Quotes & CPQ',
          icon: Receipt,
          count: counts?.quotes || 2,
          description: 'Configure, price & generate quotes'
        },
        {
          id: 'forms',
          label: 'Forms & Pages',
          icon: FileText,
          count: (counts?.forms || 2) + (counts?.landingPages || 2),
          description: 'Lead capture forms & routing'
        }
      ]
    },
    {
      title: 'Activity & Support',
      items: [
        {
          id: 'activities',
          label: 'Tasks & Activities',
          icon: Calendar,
          count: counts?.tasks || 4,
          description: 'Calls, meetings & to-dos'
        },
        {
          id: 'tickets',
          label: 'Support Tickets',
          icon: Headphones,
          count: counts?.tickets || 4,
          description: 'Service desk, SLA & tickets'
        },
        {
          id: 'sequences',
          label: 'Outreach & Sequences',
          icon: Send,
          count: counts?.sequences || 2,
          description: 'Cadences & multi-touch campaigns'
        }
      ]
    },
    {
      title: 'AI & Automations',
      items: [
        {
          id: 'ai',
          label: 'AI Copilot',
          icon: Bot,
          badge: 'AI',
          isAi: true,
          description: 'Conversational CRM assistant'
        },
        {
          id: 'automation',
          label: 'Workflows Engine',
          icon: Workflow,
          count: counts?.workflows || 2,
          description: 'Triggers, actions & rules'
        }
      ]
    },
    {
      title: 'Data & Architecture',
      items: [
        {
          id: 'custom_objects',
          label: 'Custom Objects',
          icon: Database,
          count: counts?.customObjects || 2,
          description: 'Dynamic schema & custom entities'
        },
        {
          id: 'reports',
          label: 'Reports & Analytics',
          icon: BarChart3,
          count: counts?.reports || 7,
          description: 'KPI charts & pipeline reporting'
        },
        {
          id: 'integrations',
          label: 'Webhooks & APIs',
          icon: Webhook,
          count: (counts?.webhooks || 3) + (counts?.integrations || 5),
          description: 'REST API, webhooks & sync'
        },
        {
          id: 'dashboard',
          label: 'Schema Architecture',
          icon: LayoutDashboard,
          count: '68 Tables',
          description: 'Database models & documentation'
        }
      ]
    }
  ], [counts]);

  // Search filter
  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return navigationSections;
    const q = searchQuery.toLowerCase();
    return navigationSections.map(section => ({
      ...section,
      items: section.items.filter(item =>
        item.label.toLowerCase().includes(q) ||
        (item.description && item.description.toLowerCase().includes(q))
      )
    })).filter(section => section.items.length > 0);
  }, [navigationSections, searchQuery]);

  const handleQuickCreate = (tabId) => {
    if (onSelectTab) onSelectTab(tabId);
    setShowNewMenu(false);
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isMobileOpen && (
        <div 
          onClick={onCloseMobile}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 md:hidden animate-in fade-in duration-150"
          aria-hidden="true"
        />
      )}

      {/* Main Sidebar Shell */}
      <aside 
        className={`
          fixed inset-y-0 left-0 z-50 md:static md:h-full md:max-h-screen
          bg-[var(--bg-sidebar)] border-r border-[var(--border-subtle)] dark:border-r-0
          flex flex-col justify-between shrink-0 transition-[width] duration-200 ease-out select-none
          ${isCollapsed ? 'w-[64px]' : 'w-[260px]'}
          ${isMobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full md:translate-x-0'}
        `}
      >
        {/* Top: Workspace Switcher & + New Button */}
        <div className="p-3 border-b border-[var(--border-subtle)] shrink-0 space-y-2.5">
          {/* Workspace Switcher */}
          <div className="flex items-center justify-between">
            <div className={`flex items-center ${isCollapsed ? 'justify-center w-full' : 'gap-2.5 min-w-0'} cursor-pointer py-1`}>
              <div className="w-8 h-8 rounded-[var(--radius-sm)] bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] flex items-center justify-center font-bold text-xs text-[var(--text-primary)] shrink-0">
                <Sparkles className="w-4 h-4 text-[var(--accent)]" />
              </div>
              {!isCollapsed && (
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1">
                    <h2 className="text-xs font-semibold text-[var(--text-primary)] truncate">
                      {organization?.name || 'Nexus CRM'}
                    </h2>
                    <ChevronDown className="w-3.5 h-3.5 text-[var(--text-tertiary)] shrink-0" />
                  </div>
                  <p className="text-[11px] text-[var(--text-tertiary)] truncate flex items-center gap-1.5 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] shrink-0"></span>
                    {workspace?.name || 'Main Workspace'}
                  </p>
                </div>
              )}
            </div>

            {/* Mobile Close Button */}
            <button
              onClick={onCloseMobile}
              className="md:hidden p-1 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] rounded-[var(--radius-sm)] hover:bg-[var(--bg-hover)]"
              title="Close menu"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Prominent "+ New" Action Button (§5.1) */}
          {!isCollapsed ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowNewMenu(prev => !prev)}
                className="w-full h-9 px-3 flex items-center justify-center gap-2 rounded-[var(--radius-sm)] border border-[var(--btn-secondary-border)] bg-[var(--btn-secondary-bg)] hover:bg-[var(--btn-secondary-bg-hover)] text-[var(--text-primary)] text-xs font-medium transition-colors shadow-2xs"
              >
                <Plus className="w-4 h-4 text-[var(--text-primary)]" />
                <span>+ New Record</span>
                <ChevronDown className="w-3 h-3 text-[var(--text-tertiary)] ml-auto" />
              </button>

              {/* Quick Create Dropdown Menu */}
              {showNewMenu && (
                <div className="absolute left-0 right-0 top-10 z-50 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-[var(--radius-md)] shadow-[var(--shadow-md)] p-1.5 text-xs space-y-0.5">
                  <button
                    onClick={() => handleQuickCreate('contacts')}
                    className="w-full text-left px-2.5 py-1.5 rounded-[var(--radius-sm)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] flex items-center gap-2"
                  >
                    <Users className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                    <span>New Contact</span>
                  </button>
                  <button
                    onClick={() => handleQuickCreate('deals')}
                    className="w-full text-left px-2.5 py-1.5 rounded-[var(--radius-sm)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] flex items-center gap-2"
                  >
                    <Briefcase className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                    <span>New Deal</span>
                  </button>
                  <button
                    onClick={() => handleQuickCreate('companies')}
                    className="w-full text-left px-2.5 py-1.5 rounded-[var(--radius-sm)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] flex items-center gap-2"
                  >
                    <Building2 className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                    <span>New Company</span>
                  </button>
                  <button
                    onClick={() => handleQuickCreate('activities')}
                    className="w-full text-left px-2.5 py-1.5 rounded-[var(--radius-sm)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] flex items-center gap-2"
                  >
                    <Calendar className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                    <span>New Task / Activity</span>
                  </button>
                  <button
                    onClick={() => handleQuickCreate('tickets')}
                    className="w-full text-left px-2.5 py-1.5 rounded-[var(--radius-sm)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] flex items-center gap-2"
                  >
                    <Headphones className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                    <span>New Support Ticket</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => onSelectTab('contacts')}
                className="w-9 h-9 rounded-[var(--radius-sm)] border border-[var(--btn-secondary-border)] flex items-center justify-center text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
                title="Quick Add"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Quick Filter (Expanded only) */}
          {!isCollapsed && (
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[var(--text-tertiary)] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter views..."
                className="w-full pl-8 pr-7 h-8 text-xs bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] rounded-[var(--radius-sm)] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:border-[var(--border-focus)] transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Scrollable Navigation List (§5.1) */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 px-2 py-2 space-y-4">
          {searchQuery && filteredSections.length === 0 ? (
            <div className="py-8 px-2 text-center text-xs text-[var(--text-tertiary)]">
              No views matching "{searchQuery}"
            </div>
          ) : (
            filteredSections.map((section, sIdx) => (
              <div key={section.title || sIdx} className="space-y-0.5">
                {/* Section Header */}
                {!isCollapsed ? (
                  <div className="px-2 pt-1 pb-1 text-[11px] font-medium text-[var(--text-tertiary)] tracking-wider">
                    {section.title}
                  </div>
                ) : (
                  sIdx > 0 && <div className="h-px bg-[var(--border-subtle)] my-2 mx-1" />
                )}

                {/* Section Nav Items */}
                <div className="space-y-0.5">
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;

                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          if (onSelectTab) onSelectTab(item.id);
                          if (onCloseMobile) onCloseMobile();
                        }}
                        title={isCollapsed ? `${item.label} (${item.count || item.badge || ''})` : item.description}
                        className={`
                          w-full h-9 flex items-center rounded-[var(--radius-sm)] transition-colors text-xs font-normal
                          ${isCollapsed ? 'justify-center px-0' : 'justify-between px-2.5'}
                          ${
                            isActive
                              ? 'bg-[var(--bg-selected)] text-[var(--text-primary)] font-medium'
                              : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
                          }
                        `}
                      >
                        {/* Icon & Label */}
                        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-2.5 min-w-0'}`}>
                          <Icon 
                            className={`w-4 h-4 shrink-0 ${
                              item.isAi ? 'text-[var(--accent)]' : isActive ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'
                            }`} 
                          />

                          {!isCollapsed && (
                            <span className="truncate">{item.label}</span>
                          )}
                        </div>

                        {/* Counter Pill or Badge */}
                        {!isCollapsed && (
                          item.badge ? (
                            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-[var(--accent-soft)] text-[var(--accent-text)] border border-[var(--accent)]/20 shrink-0">
                              {item.badge}
                            </span>
                          ) : item.count !== undefined ? (
                            <span className={`text-[11px] font-normal px-1.5 py-0.2 rounded-md shrink-0 ${
                              isActive 
                                ? 'text-[var(--text-primary)]' 
                                : 'text-[var(--text-tertiary)]'
                            }`}>
                              {item.count}
                            </span>
                          ) : null
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Bottom Section: Profile, Theme, and Collapse (§5.1) */}
        <div className="p-2.5 border-t border-[var(--border-subtle)] space-y-1.5 shrink-0 bg-[var(--bg-sidebar)]">
          {/* User Profile Bar */}
          {!isCollapsed ? (
            <div className="flex items-center justify-between p-1.5 rounded-[var(--radius-sm)] hover:bg-[var(--bg-hover)] transition-colors">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-full bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] flex items-center justify-center text-xs font-semibold text-[var(--text-primary)] shrink-0">
                  {user?.firstName ? user.firstName[0].toUpperCase() : (isAuthenticated ? 'U' : 'G')}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-[var(--text-primary)] truncate">
                    {user?.fullName || (isAuthenticated ? 'Active User' : 'Guest Account')}
                  </p>
                  <p className="text-[11px] text-[var(--text-tertiary)] truncate">
                    {user?.role || (isAuthenticated ? 'Admin' : 'Visitor')}
                  </p>
                </div>
              </div>

              {isAuthenticated ? (
                <button
                  type="button"
                  onClick={logout}
                  className="p-1.5 text-[var(--text-tertiary)] hover:text-[var(--danger)] rounded-[var(--radius-xs)] hover:bg-[var(--danger-soft)] transition-colors"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onOpenLogin}
                  className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-[var(--radius-xs)] hover:bg-[var(--bg-hover)] transition-colors"
                  title="Sign In"
                >
                  <LogIn className="w-4 h-4" />
                </button>
              )}
            </div>
          ) : (
            <div className="flex justify-center py-1">
              <div 
                className="w-8 h-8 rounded-full bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] flex items-center justify-center text-xs font-semibold text-[var(--text-primary)] cursor-pointer"
                title={`${user?.fullName || 'User'} (${user?.role || 'Guest'})`}
                onClick={isAuthenticated ? logout : onOpenLogin}
              >
                {user?.firstName ? user.firstName[0].toUpperCase() : 'U'}
              </div>
            </div>
          )}

          {/* Theme & Collapse Controls */}
          <div className="flex items-center justify-between pt-1 text-xs text-[var(--text-tertiary)]">
            {!isCollapsed ? (
              <>
                <button
                  type="button"
                  onClick={toggleTheme}
                  className="flex items-center gap-1.5 px-2 py-1 rounded-[var(--radius-xs)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition-colors"
                  title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
                >
                  {isDark ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5" />}
                  <span className="capitalize">{theme}</span>
                </button>

                <button
                  type="button"
                  onClick={toggleCollapsed}
                  className="p-1 rounded-[var(--radius-xs)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition-colors"
                  title="Collapse sidebar"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </>
            ) : (
              <div className="flex flex-col items-center gap-1 w-full">
                <button
                  type="button"
                  onClick={toggleTheme}
                  className="p-1.5 rounded-[var(--radius-xs)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition-colors"
                  title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
                >
                  {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
                </button>
                <button
                  type="button"
                  onClick={toggleCollapsed}
                  className="p-1.5 rounded-[var(--radius-xs)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition-colors"
                  title="Expand sidebar"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
