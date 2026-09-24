import React from 'react';
import { Loader2 } from 'lucide-react';

/**
 * UI.md §6.1 Button Primitive
 * Primary: Neutral high-contrast (White in dark / Black in light)
 * Secondary: Transparent, 1px border, text primary
 * Ghost: No border, hover bg-hover
 * Danger: bg danger, white text
 * Accent: bg accent (#10a37f), white text (AI-specific CTAs)
 */
export function Button({
  children,
  variant = 'secondary',
  size = 'md',
  pill = false,
  loading = false,
  disabled = false,
  className = '',
  icon: Icon,
  ...props
}) {
  const baseClasses = 'inline-flex items-center justify-center font-medium transition-all select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[var(--border-focus)] active:scale-[0.98] disabled:opacity-45 disabled:pointer-events-none disabled:cursor-not-allowed';

  // Size styling
  const sizeClasses = {
    sm: 'h-7 text-xs px-2.5 gap-1.5',
    md: 'h-9 text-sm px-3.5 gap-2',
    lg: 'h-11 text-base px-5 gap-2.5',
  }[size] || 'h-9 text-sm px-3.5 gap-2';

  // Radius
  const radiusClass = pill ? 'rounded-full' : 'rounded-[var(--radius-sm)]';

  // Variant styling matching UI.md §6.1
  const variantClasses = {
    primary: 'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] hover:bg-[var(--btn-primary-bg-hover)] shadow-sm font-semibold',
    secondary: 'bg-[var(--btn-secondary-bg)] border border-[var(--btn-secondary-border)] text-[var(--text-primary)] hover:bg-[var(--btn-secondary-bg-hover)]',
    ghost: 'bg-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]',
    danger: 'bg-[var(--danger)] text-white hover:opacity-90 shadow-sm',
    'ghost-danger': 'bg-transparent text-[var(--danger)] hover:bg-[var(--danger-soft)]',
    accent: 'bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] shadow-sm font-semibold',
    'accent-soft': 'bg-[var(--accent-soft)] text-[var(--accent-text)] hover:opacity-80 border border-[var(--accent)]/20',
  }[variant] || 'bg-[var(--btn-secondary-bg)] border border-[var(--btn-secondary-border)] text-[var(--text-primary)]';

  return (
    <button
      disabled={disabled || loading}
      className={`${baseClasses} ${sizeClasses} ${radiusClass} ${variantClasses} ${className}`}
      {...props}
    >
      {loading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin text-current" />
          <span>{children}</span>
        </>
      ) : (
        <>
          {Icon && <Icon className="w-4 h-4 shrink-0 text-current" />}
          {children}
        </>
      )}
    </button>
  );
}

export default Button;
