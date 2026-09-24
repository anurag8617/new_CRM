import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import Button from './Button';

/**
 * UI.md §6.8 Modals & dialogs
 * Backdrop --bg-overlay with blur
 * Modal bg --bg-modal, radius --radius-lg, shadow --shadow-lg
 * Header 18px/600 with ghost close button
 */
export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  maxWidth = 'max-w-xl', // max-w-md (480), max-w-xl (640), max-w-4xl (900)
  className = '',
}) {
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape' && isOpen) {
        onClose?.();
      }
    }
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[var(--bg-overlay)] backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Surface */}
      <div
        className={`relative w-full ${maxWidth} bg-[var(--bg-modal)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] shadow-[var(--shadow-lg)] flex flex-col max-h-[90vh] overflow-hidden z-10 transition-transform ${className}`}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-[var(--border-subtle)]">
          <div>
            {title && (
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                {title}
              </h3>
            )}
            {description && (
              <p className="text-xs text-[var(--text-secondary)] mt-1">
                {description}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors -mr-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto flex-1">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-3 p-4 px-5 border-t border-[var(--border-subtle)] bg-[var(--bg-surface-sunken)]">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export default Modal;
