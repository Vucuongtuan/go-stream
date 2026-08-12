"use client";

import { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { apiClient } from "@/lib/api-client";

interface InboxNotification {
  id: number;
  title: string;
  body: string;
  action_url?: string;
  read_at?: string;
}

interface InboxResponse {
  notifications: InboxNotification[];
  unread_count: number;
}

export function NotificationMenu() {
  const { isAuthenticated } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<InboxNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      const clearTimer = window.setTimeout(() => {
        setNotifications([]);
        setUnreadCount(0);
      }, 0);
      return () => window.clearTimeout(clearTimer);
    }
    let active = true;
    const loadInbox = async () => {
      try {
        const inbox = await apiClient.get<InboxResponse>("/api/notifications?limit=30");
        if (!active) return;
        setNotifications(inbox.notifications);
        setUnreadCount(inbox.unread_count);
      } catch {
        // Preserve the last successful inbox while an intermittent request fails.
      }
    };
    void loadInbox();
    const interval = window.setInterval(() => void loadInbox(), 20_000);
    return () => { active = false; window.clearInterval(interval); };
  }, [isAuthenticated]);

  const markRead = async (id: number) => {
    setNotifications((current) => current.map((item) => item.id === id ? { ...item, read_at: new Date().toISOString() } : item));
    setUnreadCount((count) => Math.max(0, count - 1));
    try { await apiClient.put(`/api/notifications/${id}/read`); } catch { /* next refresh restores server state */ }
  };

  const markAllRead = async () => {
    setNotifications((current) => current.map((item) => ({ ...item, read_at: item.read_at || new Date().toISOString() })));
    setUnreadCount(0);
    try { await apiClient.put("/api/notifications/read-all"); } catch { /* next refresh restores server state */ }
  };

  if (!isAuthenticated) return null;

  return (
    <div className="relative" ref={menuRef}>
      <button type="button" onClick={() => setIsOpen((open) => !open)} className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-white" aria-label="Thông báo" aria-expanded={isOpen}>
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-red-500" />}
      </button>
      {isOpen && (
        <div className="absolute right-0 top-11 z-50 w-72 rounded-lg bg-white py-2 dark:bg-zinc-900">
          <div className="flex items-center justify-between px-3 pb-2 pt-1">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">Thông báo</h2>
            {unreadCount > 0 && <button type="button" onClick={() => void markAllRead()} className="text-xs text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200">Đánh dấu đã đọc</button>}
          </div>
          {notifications.length === 0 ? <div className="px-3 py-7 text-center"><Bell className="mx-auto h-5 w-5 text-zinc-300 dark:text-zinc-600" /><p className="mt-2 text-sm text-zinc-500">Bạn chưa có thông báo nào.</p></div> : (
            <div className="max-h-80 overflow-y-auto">{notifications.map((notification) => (
              <Link key={notification.id} href={notification.action_url || "#"} onClick={() => { if (!notification.read_at) void markRead(notification.id); setIsOpen(false); }} className={`block px-3 py-3 hover:bg-zinc-100 dark:hover:bg-zinc-800 ${notification.read_at ? "" : "bg-zinc-50 dark:bg-zinc-900/70"}`}>
                <p className="text-sm font-medium text-zinc-900 dark:text-white">{notification.title}</p>
                <p className="mt-0.5 line-clamp-2 text-xs text-zinc-500">{notification.body}</p>
              </Link>
            ))}</div>
          )}
        </div>
      )}
    </div>
  );
}

export default NotificationMenu;
