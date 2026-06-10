"use client";

import React from "react";

interface ChatMessage {
  id: string;
  room_id: number;
  user_id: number;
  user_name: string;
  avatar?: string;
  content: string;
  type: string;
  created_at: string;
}

interface Donation {
  id: string;
  user_name: string;
  amount: number;
  message: string;
  created_at: string;
}
import { User } from "@/lib/types";

interface ChatDonatePanelProps {
  rightActiveTab: "chat" | "donate";
  setRightActiveTab: (tab: "chat" | "donate") => void;
  chatViewMode: "fixed" | "floating";
  setChatViewMode: (mode: "fixed" | "floating") => void;
  setFloatPos: (pos: { x: number; y: number }) => void;
  chatMessages: ChatMessage[];
  donations: Donation[];
  chatInput: string;
  setChatInput: (val: string) => void;
  handleSendChat: (e: React.FormEvent) => void;
  handlePopOutChat: () => void;
  handlePopOutDonations: () => void;
  user: User | null;
  chatEndRef: React.RefObject<HTMLDivElement | null>;
}

export function ChatDonatePanel({
  rightActiveTab,
  setRightActiveTab,
  chatViewMode,
  setChatViewMode,
  setFloatPos,
  chatMessages,
  donations,
  chatInput,
  setChatInput,
  handleSendChat,
  handlePopOutChat,
  handlePopOutDonations,
  user,
  chatEndRef,
}: ChatDonatePanelProps) {
  return (
    <div className="rounded-3xl border border-zinc-200 dark:border-white/5 bg-zinc-50 dark:bg-zinc-900/40 backdrop-blur-xl flex flex-col h-[520px] shadow-lg overflow-hidden">
      {/* Tab Header */}
      <div className="bg-zinc-100 dark:bg-zinc-900/80 border-b border-zinc-200 dark:border-zinc-800 px-4 py-2 flex items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={() => setRightActiveTab("chat")}
            className={`px-3 py-2 text-xs font-bold transition-all relative cursor-pointer ${
              rightActiveTab === "chat"
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
            }`}
          >
            💬 Kênh Chat
            {rightActiveTab === "chat" && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500 rounded-full" />
            )}
          </button>
          <button
            onClick={() => setRightActiveTab("donate")}
            className={`px-3 py-2 text-xs font-bold transition-all relative cursor-pointer ${
              rightActiveTab === "donate"
                ? "text-yellow-600 dark:text-yellow-500"
                : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
            }`}
          >
            💰 Donate
            {rightActiveTab === "donate" && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-yellow-500 rounded-full" />
            )}
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          {rightActiveTab === "chat" ? (
            <>
              <button
                onClick={handlePopOutChat}
                className="text-zinc-500 hover:text-emerald-600 dark:hover:text-emerald-450 p-1 text-[10px] font-bold uppercase transition-colors cursor-pointer"
                title="Undock/Tách kênh chat ra cửa sổ mới"
              >
                🗗 Tách Chat
              </button>
              <span className="text-zinc-300 dark:text-zinc-700">|</span>
              <button
                onClick={() => {
                  setChatViewMode(chatViewMode === "fixed" ? "floating" : "fixed");
                  setFloatPos({ x: window.innerWidth - 420, y: 150 });
                }}
                className="text-zinc-500 hover:text-emerald-600 dark:hover:text-emerald-450 p-1 text-[10px] font-bold uppercase transition-colors cursor-pointer"
              >
                {chatViewMode === "fixed" ? "🗗 Thu Nổi" : "📌 Ghim"}
              </button>
            </>
          ) : (
            <button
              onClick={handlePopOutDonations}
              className="text-zinc-500 hover:text-yellow-600 dark:hover:text-yellow-450 p-1 text-[10px] font-bold uppercase transition-colors cursor-pointer"
              title="Undock/Tách bảng donate ra cửa sổ mới"
            >
              🗗 Tách Donate
            </button>
          )}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-white dark:bg-zinc-950/20">
        {rightActiveTab === "chat" && chatViewMode === "fixed" && (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Chat Feed */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-zinc-200 dark:scrollbar-thumb-zinc-800 scrollbar-track-transparent">
              {chatMessages.map((msg) => {
                const isSystem = msg.user_id === 0;
                const isAdmin = msg.user_id === user?.id;

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col gap-0.5 text-left ${
                      isSystem ? "items-center opacity-70" : ""
                    }`}
                  >
                    {!isSystem && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-bold text-zinc-700 dark:text-zinc-200">
                          {msg.user_name}
                        </span>
                        {isAdmin && (
                          <span className="text-[8px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 uppercase">
                            Chủ kênh
                          </span>
                        )}
                      </div>
                    )}
                    <div
                      className={`text-xs ${
                        isSystem
                          ? "bg-zinc-200/50 dark:bg-zinc-800/40 px-3 py-1 rounded-full text-zinc-500 dark:text-zinc-400"
                          : "text-zinc-700 dark:text-zinc-300 bg-zinc-50 dark:bg-zinc-950/20 p-2 rounded-xl border border-zinc-150 dark:border-white/5"
                      }`}
                    >
                      {msg.content}
                    </div>
                  </div>
                );
              })}
              <div ref={chatEndRef} />
            </div>

            {/* Chat Input */}
            <form
              onSubmit={handleSendChat}
              className="p-3 bg-zinc-50 dark:bg-zinc-950/80 border-t border-zinc-200 dark:border-zinc-800 flex gap-2"
            >
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Gửi tin nhắn chat..."
                className="flex-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-800 dark:text-white focus:outline-none focus:border-emerald-500"
              />
              <button
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-555 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Gửi
              </button>
            </form>
          </div>
        )}

        {rightActiveTab === "chat" && chatViewMode === "floating" && (
          <div className="flex-1 flex items-center justify-center p-4 text-center">
            <p className="text-xs text-zinc-400 dark:text-zinc-500 font-medium">
              Khung chat đang hiển thị ở dạng cửa sổ nổi kéo thả trên trang.
            </p>
          </div>
        )}

        {rightActiveTab === "donate" && (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Donate Feed */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-zinc-200 dark:scrollbar-thumb-zinc-800 scrollbar-track-transparent">
              {donations.length === 0 ? (
                <p className="text-xs text-zinc-400 dark:text-zinc-500 text-center py-8">
                  Chưa có lượt donate nào trong phiên live này.
                </p>
              ) : (
                donations.map((d) => (
                  <div
                    key={d.id}
                    className="p-3 rounded-2xl bg-zinc-50/50 dark:bg-zinc-950/30 border border-zinc-200 dark:border-white/5 text-left space-y-1.5 shadow-sm"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-bold text-zinc-700 dark:text-zinc-200">
                        {d.user_name}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-yellow-500/10 text-yellow-600 dark:text-yellow-500 font-mono">
                        +{d.amount.toLocaleString("vi-VN")}đ
                      </span>
                    </div>
                    <p className="text-xs text-zinc-650 dark:text-zinc-400">{d.message}</p>
                    <div className="text-[9px] text-zinc-400 dark:text-zinc-650 text-right">
                      {new Date(d.created_at).toLocaleTimeString("vi-VN")}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
