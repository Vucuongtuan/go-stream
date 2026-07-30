"use client";

import { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { apiClient } from "@/lib/api-client";

interface LiveRoom {
  id: number;
  title: string;
  host: { name: string; slug: string };
}

interface Notification {
  id: number;
  roomID: number;
  title: string;
  hostName: string;
  hostSlug: string;
  read: boolean;
}

export function NotificationMenu() {
  const { isAuthenticated } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const menuRef = useRef<HTMLDivElement>(null);
  const knownLiveRooms = useRef<Set<number>>(new Set());
  const hasInitialSnapshot = useRef(false);
  const unreadCount = notifications.filter((notification) => !notification.read).length;

  useEffect(() => {
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      knownLiveRooms.current = new Set();
      hasInitialSnapshot.current = false;
      const clearTimer = window.setTimeout(() => setNotifications([]), 0);
      return () => window.clearTimeout(clearTimer);
    }

    let active = true;
    const checkForNewStreams = async () => {
      try {
        const rooms = await apiClient.get<LiveRoom[]>("/api/rooms?status=live");
        if (!active) return;

        const latestRoomIDs = new Set(rooms.map((room) => room.id));
        if (hasInitialSnapshot.current) {
          const newNotifications = rooms
            .filter((room) => !knownLiveRooms.current.has(room.id))
            .map((room) => ({
              id: room.id,
              roomID: room.id,
              title: room.title,
              hostName: room.host.name,
              hostSlug: room.host.slug,
              read: false,
            }));
          if (newNotifications.length > 0) {
            setNotifications((current) => [...newNotifications, ...current].slice(0, 20));
          }
        }

        knownLiveRooms.current = latestRoomIDs;
        hasInitialSnapshot.current = true;
      } catch {
        // A failed check should not clear the previous live-room snapshot.
      }
    };

    void checkForNewStreams();
    const interval = window.setInterval(() => void checkForNewStreams(), 20_000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [isAuthenticated]);

  if (!isAuthenticated) return null;

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-white"
        aria-label="Thông báo"
        aria-expanded={isOpen}
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-red-500" />}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-11 z-50 w-72 rounded-lg bg-white py-2 dark:bg-zinc-900">
          <div className="flex items-center justify-between px-3 pb-2 pt-1">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">Thông báo</h2>
            {unreadCount > 0 && (
              <button type="button" onClick={() => setNotifications((current) => current.map((notification) => ({ ...notification, read: true })))} className="text-xs text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200">
                Đánh dấu đã đọc
              </button>
            )}
          </div>
          {notifications.length === 0 ? (
            <div className="px-3 py-7 text-center">
              <Bell className="mx-auto h-5 w-5 text-zinc-300 dark:text-zinc-600" />
              <p className="mt-2 text-sm text-zinc-500">Bạn chưa có thông báo nào.</p>
            </div>
          ) : (
            <div className="max-h-80 overflow-y-auto">
              {notifications.map((notification) => (
                <Link
                  key={notification.id}
                  href={`/live/${notification.hostSlug}`}
                  onClick={() => {
                    setNotifications((current) => current.map((item) => item.id === notification.id ? { ...item, read: true } : item));
                    setIsOpen(false);
                  }}
                  className={`block px-3 py-3 hover:bg-zinc-100 dark:hover:bg-zinc-800 ${notification.read ? "" : "bg-zinc-50 dark:bg-zinc-900/70"}`}
                >
                  <p className="text-sm font-medium text-zinc-900 dark:text-white">{notification.hostName} đang live</p>
                  <p className="mt-0.5 truncate text-xs text-zinc-500">{notification.title}</p>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default NotificationMenu;
