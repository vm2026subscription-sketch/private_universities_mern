import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, Clock, ExternalLink, ShieldAlert, CheckCircle, Info, AlertTriangle } from 'lucide-react';
import api from '../utils/api';

const getCategoryBadgeClass = (category) => {
  switch (category) {
    case 'approval':
      return 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800';
    case 'payment':
      return 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
    case 'subscription':
      return 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800';
    default:
      return 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700';
  }
};

const getTypeIcon = (type) => {
  switch (type) {
    case 'success':
      return <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />;
    case 'warning':
      return <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />;
    case 'error':
      return <ShieldAlert className="w-4 h-4 text-red-500 shrink-0" />;
    default:
      return <Info className="w-4 h-4 text-link shrink-0" />;
  }
};

const formatTimeAgo = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  return date.toLocaleDateString();
};

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  const fetchNotifications = useCallback(async () => {
    try {
      const { data } = await api.get('/notifications');
      if (data?.success) {
        setNotifications(data.data || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // Poll every 30 seconds
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAsRead = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((item) => (item._id === id ? { ...item, isRead: true } : item))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      setLoading(true);
      await api.put('/notifications/read-all');
      setNotifications((prev) => prev.map((item) => ({ ...item, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationClick = async (item) => {
    if (!item.isRead) {
      await handleMarkAsRead(item._id);
    }
    if (item.link) {
      setIsOpen(false);
      navigate(item.link);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl text-light-muted hover:text-light-text dark:hover:text-dark-text hover:bg-light-card dark:hover:bg-dark-card transition-colors focus:outline-none"
        aria-label="Notifications"
        title="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-orange-500 rounded-full animate-pulse shadow-sm">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notifications Popover */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-dark-card border border-light-border dark:border-dark-border rounded-2xl shadow-xl z-50 overflow-hidden flex flex-col max-h-[85vh]">
          {/* Header */}
          <div className="p-3.5 border-b border-light-border dark:border-dark-border flex items-center justify-between bg-light-bg/50 dark:bg-dark-bg/50">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm text-light-text dark:text-dark-text">Notifications</h3>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                disabled={loading}
                className="text-xs font-medium text-primary hover:underline flex items-center gap-1 transition-colors disabled:opacity-50"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Mark all as read
              </button>
            )}
          </div>

          {/* Notification List */}
          <div className="overflow-y-auto flex-1 divide-y divide-light-border/60 dark:divide-dark-border/60 scrollbar-thin">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-light-muted dark:text-dark-muted">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm font-medium">No notifications yet</p>
              </div>
            ) : (
              notifications.map((item) => (
                <div
                  key={item._id}
                  onClick={() => handleNotificationClick(item)}
                  className={`p-3.5 transition-colors cursor-pointer flex gap-3 ${
                    !item.isRead
                      ? 'bg-orange-500/5 dark:bg-orange-500/10 hover:bg-orange-500/10'
                      : 'hover:bg-light-bg/60 dark:hover:bg-dark-bg/60'
                  }`}
                >
                  <div className="mt-0.5 shrink-0">{getTypeIcon(item.type)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="font-semibold text-xs text-light-text dark:text-dark-text truncate">
                        {item.title}
                      </span>
                      <span className="text-[10px] text-light-muted dark:text-dark-muted shrink-0 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatTimeAgo(item.createdAt)}
                      </span>
                    </div>
                    <p className="text-xs text-light-muted dark:text-dark-muted line-clamp-2 leading-relaxed">
                      {item.message}
                    </p>
                    <div className="mt-2 flex items-center justify-between">
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${getCategoryBadgeClass(
                          item.category
                        )}`}
                      >
                        {item.category || 'general'}
                      </span>
                      {item.link && (
                        <span className="text-[11px] font-medium text-primary flex items-center gap-0.5 hover:underline">
                          View details <ExternalLink className="w-3 h-3" />
                        </span>
                      )}
                    </div>
                  </div>
                  {!item.isRead && (
                    <div className="flex flex-col items-center justify-between shrink-0">
                      <span className="w-2 h-2 rounded-full bg-orange-500" title="Unread" />
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-2 border-t border-light-border dark:border-dark-border text-center bg-light-bg/30 dark:bg-dark-bg/30">
            <span className="text-[11px] text-light-muted dark:text-dark-muted">
              Notifications auto-refresh every 30s
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
