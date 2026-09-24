import React from 'react';
import { Sparkles } from 'lucide-react';

/**
 * UI.md §6.5 Badges, chips, tags
 * Height 22px, padding 0 8px, radius --radius-full (999px), 12px/500 weight
 * Variants: neutral, success, warning, danger, info, ai
 */
export function Badge({
  children,
  variant = 'neutral',
  className = '',
  icon: Icon,
  confidence,
  ...props
}) {
  const baseClasses = 'inline-flex items-center gap-1.5 h-[22px] px-2 text-xs font-medium rounded-full select-none whitespace-nowrap';

  const variantClasses = {
    neutral: 'bg-[var(--bg-active)] text-[var(--text-secondary)]',
    success: 'bg-[var(--success-soft)] text-[var(--success)]',
    warning: 'bg-[var(--warning-soft)] text-[var(--warning)]',
    danger: 'bg-[var(--danger-soft)] text-[var(--danger)]',
    info: 'bg-[var(--info-soft)] text-[var(--info)]',
    ai: 'bg-[var(--accent-soft)] text-[var(--accent-text)] border border-[var(--accent)]/20',
  }[variant] || 'bg-[var(--bg-active)] text-[var(--text-secondary)]';

  if (variant === 'ai') {
    return (
      <span
        title={confidence ? `AI-generated · confidence ${confidence}%` : 'AI-generated'}
        className={`${baseClasses} ${variantClasses} ${className}`}
        {...props}
      >
        <Sparkles className="w-3 h-3 text-[var(--accent-text)] shrink-0" />
        <span>{children || 'AI'}</span>
      </span>
    );
  }

  return (
    <span className={`${baseClasses} ${variantClasses} ${className}`} {...props}>
      {Icon && <Icon className="w-3 h-3 shrink-0" />}
      {children}
    </span>
  );
}

export default Badge;
