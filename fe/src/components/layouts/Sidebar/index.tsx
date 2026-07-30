"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { apiClient } from "@/lib/api-client";

interface Streamer {
  id: number;
  name: string;
  avatar: string;
  category: string;
  viewers: number;
  slug: string;
}

interface LiveRoomResponse {
  id: number;
  viewer_count: number;
  host: { name: string; slug: string; avatar?: string };
  category?: { name: string };
}

export function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [channels, setChannels] = useState<Streamer[]>([]);

  useEffect(() => {
    const loadLiveChannels = async () => {
      try {
        const rooms = await apiClient.get<LiveRoomResponse[]>("/api/rooms");
        setChannels(rooms.slice(0, 10).map((room) => ({
          id: room.id,
          name: room.host.name,
          avatar: room.host.avatar || room.host.name.charAt(0),
          category: room.category?.name || "Livestream",
          viewers: room.viewer_count,
          slug: room.host.slug,
        })));
      } catch {
        setChannels([]);
      }
    };
    void loadLiveChannels();
  }, []);

  return (
    <aside
      className={`sticky left-0 top-16 z-30 hidden h-[calc(100vh-4rem)] shrink-0 flex-col bg-zinc-50 transition-[width] duration-200 md:flex dark:bg-zinc-950 ${
        isCollapsed ? "w-16" : "w-64"
      }`}
    >
      {/* Sidebar header / Toggle */}
      <div className="flex h-12 items-center justify-between px-4">
        {!isCollapsed && (
          <span className="text-[10px] font-bold tracking-wider text-zinc-400 dark:text-zinc-500 uppercase">
              ĐANG TRỰC TIẾP
          </span>
        )}
        <button
          onClick={() => setIsCollapsed((prev) => !prev)}
          className="ml-auto rounded-lg p-1.5 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
          title={isCollapsed ? "Mở rộng" : "Thu gọn"}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.8}
            stroke="currentColor"
            className={`h-4 w-4 transition-transform duration-300 ${
              isCollapsed ? "rotate-180" : ""
            }`}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M18.75 19.5l-7.5-7.5 7.5-7.5m-6 15L5.25 12l7.5-7.5"
            />
          </svg>
        </button>
      </div>

      {/* Content wrapper with custom scrollbar */}
      <div className="flex-1 overflow-y-auto py-4 space-y-6 scrollbar-thin scrollbar-thumb-zinc-200 dark:scrollbar-thumb-zinc-900 scrollbar-track-transparent">
        <div className="space-y-2">
          {!isCollapsed && (
            <h3 className="px-4 text-[10px] font-bold text-zinc-400 dark:text-zinc-600 uppercase tracking-wider">
              KÊNH ĐANG LIVE
            </h3>
          )}
          <div className="space-y-0.5">
            {channels.map((streamer) => (
              <Link
                href={`/live/${streamer.slug}`}
                key={streamer.id}
                className="group mx-2 flex items-center justify-between rounded-lg px-3 py-2 hover:bg-zinc-200/60 dark:hover:bg-zinc-900/60"
              >
                <div className="flex items-center gap-3">
                  {/* Channel Avatar */}
                  <div className="relative flex h-7 w-7 items-center justify-center rounded-full bg-white text-[10px] font-bold text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
                    {streamer.avatar}
                    <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white dark:ring-zinc-950" />
                  </div>

                  {/* Channel details */}
                  {!isCollapsed && (
                    <div className="flex flex-col text-left truncate max-w-[120px]">
                      <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300 group-hover:text-zinc-950 dark:group-hover:text-white truncate">
                        {streamer.name}
                      </span>
                      <span className="text-[10px] text-zinc-450 dark:text-zinc-600 truncate">
                        {streamer.category}
                      </span>
                    </div>
                  )}
                </div>
 
                {/* Live indicators / Viewers */}
                {!isCollapsed && (
                  <div className="flex items-center gap-1.5 text-[10px]">
                    <span className="h-1 w-1 rounded-full bg-red-500 animate-pulse" />
                    <span className="font-semibold text-zinc-500 dark:text-zinc-400">
                      {streamer.viewers.toLocaleString()}
                    </span>
                  </div>
                )}
              </Link>
            ))}
            {!isCollapsed && channels.length === 0 && (
              <p className="px-4 py-3 text-xs text-zinc-500">Chưa có kênh nào đang phát.</p>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
