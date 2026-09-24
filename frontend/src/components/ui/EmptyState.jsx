import React from 'react';
import Button from './Button';

/**
 * UI.md §9.2 Empty state
 * Centered, max-width 360px, 40px icon in --text-tertiary, title 16px/600, description 14px --text-secondary, primary CTA.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  actionVariant = 'primary',
  children,
  className = '',
}) {
  return (
    <div className={`flex flex-col items-center justify-center text-center p-8 max-w-sm mx-auto my-8 ${className}`}>
      {Icon && (
        <div className="w-12 h-12 rounded-full bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-tertiary)] mb-4">
          <Icon className="w-6 h-6" />
        </div>
      )}
      {title && (
        <h4 className="text-base font-semibold text-[var(--text-primary)] mb-1.5">
          {title}
        </h4>
      )}
      {description && (
        <p className="text-sm text-[var(--text-secondary)] mb-5 leading-relaxed">
          {description}
        </p>
      )}
      {actionLabel && onAction && (
        <Button variant={actionVariant} onClick={onAction}>
          {actionLabel}
        </Button>
      )}
      {children}
    </div>
  );
}

/**
 * UI.md §9.1 Skeleton loading
 */
export function Skeleton({ className = '', rounded = 'rounded-[var(--radius-sm)]' }) {
  return (
    <div
      className={`animate-pulse bg-[var(--bg-surface-raised)] ${rounded} ${className}`}
    />
  );
}

export default EmptyState;
