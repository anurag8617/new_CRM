import React, { forwardRef } from 'react';
import { X } from 'lucide-react';

/**
 * UI.md §6.2 Inputs Primitive
 * Height 36px (md) / 44px (lg), radius md (12px)
 * bg --bg-input, border --border-default, text --text-primary
 * Focus: border --border-focus, ring --bg-active
 */
export const Input = forwardRef(function Input(
  {
    label,
    error,
    helperText,
    size = 'md',
    icon: Icon,
    onClear,
    value,
    className = '',
    inputClassName = '',
    ...props
  },
  ref
) {
  const sizeClass = size === 'lg' ? 'h-11 text-base px-3.5' : 'h-9 text-sm px-3';
  const hasLeadingIcon = Boolean(Icon);
  const showClear = Boolean(onClear && value && String(value).length > 0);

  return (
    <div className={`flex flex-col gap-1.5 w-full ${className}`}>
      {label && (
        <label className="text-[13px] font-medium text-[var(--text-primary)]">
          {label}
        </label>
      )}
      <div className="relative flex items-center w-full">
        {hasLeadingIcon && (
          <div className="absolute left-3 flex items-center pointer-events-none text-[var(--text-tertiary)]">
            <Icon className="w-4 h-4" />
          </div>
        )}
        <input
          ref={ref}
          value={value}
          className={`w-full bg-[var(--bg-input)] hover:bg-[var(--bg-input-hover)] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] border ${
            error ? 'border-[var(--danger)] focus:border-[var(--danger)]' : 'border-[var(--border-default)] focus:border-[var(--border-focus)]'
          } rounded-[var(--radius-md)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--bg-active)] disabled:opacity-50 disabled:cursor-not-allowed ${sizeClass} ${
            hasLeadingIcon ? 'pl-9' : ''
          } ${showClear ? 'pr-9' : ''} ${inputClassName}`}
          {...props}
        />
        {showClear && (
          <button
            type="button"
            onClick={onClear}
            className="absolute right-2.5 p-1 rounded-full text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      {error ? (
        <span className="text-xs text-[var(--danger)]">{error}</span>
      ) : helperText ? (
        <span className="text-xs text-[var(--text-tertiary)]">{helperText}</span>
      ) : null}
    </div>
  );
});

export default Input;
