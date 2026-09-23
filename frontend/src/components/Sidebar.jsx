import React from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Building2, 
  Briefcase, 
  Bot, 
  Workflow, 
  Settings, 
  Database,
  BarChart3,
  Calendar
} from 'lucide-react';

const navItems = [
  { id: 'dashboard', label: 'Architecture & DB', icon: LayoutDashboard },
  { id: 'contacts', label: 'Contacts', icon: Users, badge: 'Spec §6' },
  { id: 'companies', label: 'Companies', icon: Building2, badge: 'Spec §7' },
  { id: 'deals', label: 'Deals & Pipelines', icon: Briefcase, badge: 'Spec §9' },
  { id: 'activities', label: 'Activities & Tasks', icon: Calendar, badge: 'Spec §10, §12' },
  { id: 'custom_objects', label: 'Custom Objects', icon: Database, badge: 'Spec §2' },
  { id: 'automation', label: 'Automation Engine', icon: Workflow, badge: 'Spec §15' },
  { id: 'reports', label: 'Reports & Analytics', icon: BarChart3, badge: 'Spec §26-§30' },
  { id: 'ai', label: 'AI Copilot & Agents', icon: Bot, badge: 'Spec §16, §20' },
  { id: 'settings', label: 'Admin Settings', icon: Settings, disabled: true },
];

export default function Sidebar({ activeTab = 'dashboard', onSelectTab }) {
  return (
    <aside className="w-64 border-r border-slate-200 bg-white flex flex-col justify-between h-[calc(100vh-4rem)] p-4 shrink-0">
      <div className="space-y-1">
        <div className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Workspace Modules
        </div>
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                disabled={item.disabled}
                onClick={() => onSelectTab && onSelectTab(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                  isActive
                    ? 'bg-purple-50 text-purple-700 shadow-2xs font-semibold'
                    : item.disabled
                    ? 'text-slate-400 opacity-60 cursor-not-allowed'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-purple-600' : 'text-slate-500'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                    item.badge.includes('16') || item.badge === 'AI'
                      ? 'bg-purple-100 text-purple-700' 
                      : isActive
                      ? 'bg-indigo-100 text-indigo-700'
                      : 'bg-slate-100 text-slate-600'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
          <span className="text-xs font-semibold text-slate-700">Phase 1: Step 10 Active</span>
        </div>
        <p className="text-[11px] text-slate-500 mt-1">
          AI Copilot, Smart Summaries & Autonomous Agents live.
        </p>
      </div>
    </aside>
  );
}
