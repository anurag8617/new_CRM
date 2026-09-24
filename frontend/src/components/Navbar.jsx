import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { getNotifications, markNotificationRead, markAllNotificationsRead, deleteNotification } from '../services/api';
import {
  Sparkles,
  Bell,
  Search,
  User,
  LogIn,
  LogOut,
  Zap,
  CheckSquare,
  AlertTriangle,
  Info,
  Check,
  CheckCheck,
  Trash2,
  Sun,
  Moon,
  Menu,
  Command,
  Bot
} from 'lucide-react';

/**
 * UI.md §5.2 Topbar
 * - Height 56px, background --bg-app, bottom border --border-subtle
 * - Left: page title / breadcrumb
 * - Center/Right: global search field (pill, --bg-surface-raised, ⌘K hint), notifications, Copilot shortcut, theme toggle, avatar
 */
export default function Navbar({ onOpenLogin, onNavigateTab, onToggleMobileSidebar }) {
  const { user, organization, isAuthenticated, logout } = useAuth();
  const { theme, toggleTheme, isDark } = useTheme();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchNotifs = async () => {
    if (!isAuthenticated) return;
    try {
      const res = await getNotifications({ limit: 15 });
      if (res.success) {
        setNotifications(res.data.notifications || []);
        setUnreadCount(res.data.unreadCount || 0);
      }
    } catch (err) {
      // quiet fail
    }
  };

  useEffect(() => {
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 20000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: 1 })));
      setUnreadCount(0);
    } catch (e) {
      console.error(e);
    }
  };

  const handleMarkOneRead = async (id) => {
    try {
      await markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: 1 } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteNotif = async (e, id) => {
    e.stopPropagation();
    try {
      await deleteNotification(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch (e) {
      console.error(e);
    }
  };

  const getNotifIcon = (type) => {
    switch (type) {
      case 'deal': return <Zap className="w-3.5 h-3.5 text-amber-500" />;
      case 'task': return <CheckSquare className="w-3.5 h-3.5 text-indigo-400" />;
      case 'warning': return <AlertTriangle className="w-3.5 h-3.5 text-[var(--danger)]" />;
      default: return <Info className="w-3.5 h-3.5 text-[var(--accent)]" />;
    }
  };

  return (
    <header className="h-[56px] shrink-0 border-b border-[var(--border-subtle)] bg-[var(--bg-app)] px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 transition-colors select-none">
      {/* Left: Mobile hamburger & Workspace Identifier */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleMobileSidebar}
          className="md:hidden p-1.5 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] rounded-[var(--radius-sm)] transition-colors"
          title="Toggle Navigation Menu"
          aria-label="Toggle navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-[var(--radius-sm)] bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--accent)]">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-[var(--text-primary)] leading-tight tracking-tight">
              Nexus CRM
            </h1>
          </div>
        </div>
      </div>

      {/* Center: Global Search Bar with ⌘K Pill (§5.2) */}
      <div className="hidden sm:flex items-center flex-1 max-w-md mx-6">
        <div className="relative w-full flex items-center">
          <Search className="w-4 h-4 text-[var(--text-tertiary)] absolute left-3.5 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search records, deals, contacts..."
            className="w-full h-9 pl-9 pr-14 text-xs bg-[var(--bg-surface-raised)] hover:bg-[var(--bg-input-hover)] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] rounded-full border border-transparent focus:border-[var(--border-focus)] focus:outline-none transition-colors"
          />
          <div className="absolute right-3 flex items-center gap-0.5 text-[10px] font-mono text-[var(--text-tertiary)] bg-[var(--bg-hover)] px-1.5 py-0.5 rounded border border-[var(--border-subtle)] pointer-events-none">
            <Command className="w-2.5 h-2.5" />
            <span>K</span>
          </div>
        </div>
      </div>

      {/* Right Actions: AI Copilot Quick Button, Bell, Theme Toggle, User */}
      <div className="flex items-center gap-2 sm:gap-2.5">
        {/* Copilot Quick Launch Button (§8) */}
        {onNavigateTab && (
          <button
            onClick={() => onNavigateTab('ai')}
            className="hidden sm:inline-flex items-center gap-1.5 h-8 px-2.5 rounded-full bg-[var(--accent-soft)] hover:bg-[var(--accent-soft)]/80 text-[var(--accent-text)] border border-[var(--accent)]/20 text-xs font-medium transition-colors"
            title="Open AI Copilot"
          >
            <Bot className="w-3.5 h-3.5" />
            <span>AI Copilot</span>
          </button>
        )}

        {/* Notifications Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors relative"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[var(--danger)]" />
            )}
          </button>

          {/* Notifications Flyout (§6.7, §6.9) */}
          {showDropdown && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-[var(--radius-md)] shadow-[var(--shadow-lg)] overflow-hidden z-50 animate-in fade-in duration-150">
              <div className="p-3 border-b border-[var(--border-subtle)] flex items-center justify-between bg-[var(--bg-surface-raised)]">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-[var(--text-primary)]">Notifications</span>
                  {unreadCount > 0 && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[var(--accent-soft)] text-[var(--accent-text)] font-medium">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-[11px] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] flex items-center gap-1 transition-colors"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    <span>Mark all read</span>
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-[var(--border-subtle)]">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-xs text-[var(--text-tertiary)]">
                    No recent notifications
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => !n.is_read && handleMarkOneRead(n.id)}
                      className={`p-3 text-xs flex items-start gap-2.5 hover:bg-[var(--bg-hover)] cursor-pointer transition-colors ${
                        !n.is_read ? 'bg-[var(--bg-surface-raised)]/50' : ''
                      }`}
                    >
                      <div className="mt-0.5 shrink-0">
                        {getNotifIcon(n.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <p className={`truncate text-xs ${!n.is_read ? 'font-semibold text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>
                            {n.title}
                          </p>
                          <span className="text-[10px] text-[var(--text-tertiary)] shrink-0">
                            {new Date(n.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-[11px] text-[var(--text-secondary)] line-clamp-2 mt-0.5">
                          {n.message}
                        </p>
                      </div>
                      <button
                        onClick={(e) => handleDeleteNotif(e, n.id)}
                        className="text-[var(--text-tertiary)] hover:text-[var(--danger)] p-1 rounded hover:bg-[var(--bg-hover)] shrink-0 transition-colors"
                        title="Delete notification"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Theme Toggle Button (§2) */}
        <button
          onClick={toggleTheme}
          className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
          title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
          aria-label="Toggle dark/light theme"
        >
          {isDark ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4" />
          )}
        </button>

        {/* Auth / Avatar status */}
        {isAuthenticated ? (
          <div className="flex items-center gap-2 pl-1">
            <div
              className="w-8 h-8 rounded-full bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] flex items-center justify-center text-xs font-semibold text-[var(--text-primary)] cursor-pointer"
              title={`${user?.fullName || 'User'} (${user?.role || 'Admin'})`}
              onClick={logout}
            >
              {user?.firstName ? user.firstName[0].toUpperCase() : 'U'}
            </div>
          </div>
        ) : (
          <button
            onClick={onOpenLogin}
            className="h-8 px-3 rounded-[var(--radius-sm)] border border-[var(--btn-secondary-border)] text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--btn-secondary-bg-hover)] transition-colors"
          >
            Sign In
          </button>
        )}
      </div>
    </header>
  );
}
