import React from 'react';

/**
 * UI.md §6.3 Cards & panels
 * Dark: bg --bg-surface-raised, border --border-subtle
 * Light: bg --bg-surface, border --border-default
 * Radius: --radius-lg (16px)
 * No drop shadow at rest; borders over shadows
 */
export function Card({
  children,
  className = '',
  hoverable = false,
  sunken = false,
  onClick,
  ...props
}) {
  const bgClass = sunken ? 'bg-[var(--bg-surface-sunken)]' : 'bg-[var(--bg-surface-raised)]';
  const borderClass = 'border border-[var(--border-subtle)]';
  const interactiveClasses = (hoverable || onClick)
    ? 'cursor-pointer hover:border-[var(--border-strong)] hover:bg-[var(--bg-hover)] transition-all'
    : '';

  return (
    <div
      onClick={onClick}
      className={`rounded-[var(--radius-lg)] p-5 ${bgClass} ${borderClass} ${interactiveClasses} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ title, description, action, className = '' }) {
  return (
    <div className={`flex items-start justify-between gap-4 mb-4 ${className}`}>
      <div>
        {title && <h3 className="text-base font-semibold text-[var(--text-primary)]">{title}</h3>}
        {description && <p className="text-xs text-[var(--text-secondary)] mt-0.5">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export default Card;
