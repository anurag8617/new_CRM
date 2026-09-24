import React from 'react';

/**
 * UI.md §6.6 Tabs Primitive
 * Underline style: 40px height, active text --text-primary with 2px bottom border
 * Segmented style: container --bg-surface-raised, radius --radius-sm, active pill --bg-active
 */
export function Tabs({
  tabs,
  activeTab,
  onChange,
  variant = 'underline', // 'underline' | 'segmented'
  className = '',
}) {
  if (variant === 'segmented') {
    return (
      <div className={`inline-flex items-center p-1 bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] rounded-[var(--radius-sm)] ${className}`}>
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-[var(--radius-xs)] transition-all ${
                isActive
                  ? 'bg-[var(--bg-active)] text-[var(--text-primary)] shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
              }`}
            >
              {Icon && <Icon className="w-3.5 h-3.5" />}
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--bg-active)] text-[var(--text-tertiary)]">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  // Underline style (default)
  return (
    <div className={`flex items-center gap-6 border-b border-[var(--border-subtle)] ${className}`}>
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`flex items-center gap-2 h-10 px-1 text-sm font-medium transition-all relative border-b-2 -mb-px ${
              isActive
                ? 'border-[var(--text-primary)] text-[var(--text-primary)] font-semibold'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-default)]'
            }`}
          >
            {Icon && <Icon className="w-4 h-4" />}
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span className={`text-xs px-2 py-0.2 rounded-full ${
                isActive
                  ? 'bg-[var(--bg-active)] text-[var(--text-primary)]'
                  : 'bg-[var(--bg-surface-raised)] text-[var(--text-tertiary)]'
              }`}>
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export default Tabs;
