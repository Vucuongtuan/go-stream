"use client";

import React, { useState } from "react";

interface StreamerMock {
  id: string;
  name: string;
  avatar: string;
  category: string;
  viewers: string;
  isLive: boolean;
}

const FOLLOWED_CHANNELS: StreamerMock[] = [
  {
    id: "1",
    name: "MixiGaming",
    avatar: "M",
    category: "GTA V Roleplay",
    viewers: "125.4K",
    isLive: true,
  },
  {
    id: "2",
    name: "Thay Giao Ba",
    avatar: "B",
    category: "League of Legends",
    viewers: "15.2K",
    isLive: true,
  },
  {
    id: "3",
    name: "PewPew",
    avatar: "P",
    category: "Just Chatting",
    viewers: "8.7K",
    isLive: true,
  },
  {
    id: "4",
    name: "ViruSs",
    avatar: "V",
    category: "Tavern Brawl",
    viewers: "2.3K",
    isLive: false,
  },
];

const RECOMMENDED_CHANNELS: StreamerMock[] = [
  {
    id: "5",
    name: "Bomman",
    avatar: "B",
    category: "CS2 Matchmaking",
    viewers: "18.9K",
    isLive: true,
  },
  {
    id: "6",
    name: "SofM",
    avatar: "S",
    category: "League of Legends",
    viewers: "34.5K",
    isLive: true,
  },
  {
    id: "7",
    name: "Dung CT",
    avatar: "D",
    category: "Resident Evil 4",
    viewers: "11.1K",
    isLive: true,
  },
];

export function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <aside
      className={`sticky left-0 top-16 z-30 flex h-[calc(100vh-4rem)] flex-col border-r border-zinc-800 bg-zinc-900 transition-all duration-300 ${
        isCollapsed ? "w-16" : "w-64"
      }`}
    >
      {/* Sidebar header / Toggle */}
      <div className="flex h-12 items-center justify-between px-4 border-b border-zinc-800/50">
        {!isCollapsed && (
          <span className="text-xs font-bold tracking-wider text-zinc-400 uppercase">
            Dành cho bạn
          </span>
        )}
        <button
          onClick={() => setIsCollapsed((prev) => !prev)}
          className="rounded-lg p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all ml-auto cursor-pointer"
          title={isCollapsed ? "Mở rộng" : "Thu gọn"}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.8}
            stroke="currentColor"
            className={`h-4.5 w-4.5 transition-transform duration-300 ${
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
      <div className="flex-1 overflow-y-auto py-4 space-y-6 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
        {/* Section 1: Followed Channels */}
        <div className="space-y-2">
          {!isCollapsed && (
            <h3 className="px-4 text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
              Kênh đang theo dõi
            </h3>
          )}
          <div className="space-y-1">
            {FOLLOWED_CHANNELS.map((streamer) => (
              <div
                key={streamer.id}
                className="group flex items-center justify-between px-3 py-2 mx-2 rounded-xl hover:bg-zinc-800/50 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  {/* Channel Avatar */}
                  <div className="relative flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800 border border-zinc-700 text-zinc-300 font-bold text-xs group-hover:border-zinc-600 transition-colors">
                    {streamer.avatar}
                    {streamer.isLive && (
                      <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-zinc-900" />
                    )}
                  </div>

                  {/* Channel details (expanded mode only) */}
                  {!isCollapsed && (
                    <div className="flex flex-col text-left truncate max-w-[120px]">
                      <span className="text-xs font-semibold text-zinc-200 group-hover:text-white truncate">
                        {streamer.name}
                      </span>
                      <span className="text-[10px] text-zinc-500 truncate">
                        {streamer.category}
                      </span>
                    </div>
                  )}
                </div>

                {/* Live indicators / Viewers */}
                {!isCollapsed && (
                  <div className="flex items-center gap-1.5 text-[10px]">
                    {streamer.isLive ? (
                      <>
                        <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                        <span className="font-semibold text-zinc-300">
                          {streamer.viewers}
                        </span>
                      </>
                    ) : (
                      <span className="text-zinc-600 font-medium">Ngoại tuyến</span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Section 2: Recommended Channels */}
        <div className="space-y-2">
          {!isCollapsed && (
            <h3 className="px-4 text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
              Kênh được gợi ý
            </h3>
          )}
          <div className="space-y-1">
            {RECOMMENDED_CHANNELS.map((streamer) => (
              <div
                key={streamer.id}
                className="group flex items-center justify-between px-3 py-2 mx-2 rounded-xl hover:bg-zinc-800/50 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="relative flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800 border border-zinc-700 text-zinc-300 font-bold text-xs group-hover:border-zinc-600 transition-colors">
                    {streamer.avatar}
                    <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-zinc-900" />
                  </div>

                  {!isCollapsed && (
                    <div className="flex flex-col text-left truncate max-w-[120px]">
                      <span className="text-xs font-semibold text-zinc-200 group-hover:text-white truncate">
                        {streamer.name}
                      </span>
                      <span className="text-[10px] text-zinc-500 truncate">
                        {streamer.category}
                      </span>
                    </div>
                  )}
                </div>

                {!isCollapsed && (
                  <div className="flex items-center gap-1.5 text-[10px]">
                    <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                    <span className="font-semibold text-zinc-300">
                      {streamer.viewers}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
