"use client";

import React, { useState } from "react";

interface StreamKeyCardProps {
  streamKey: string;
  showKey: boolean;
  setShowKey: (show: boolean) => void;
  isCopied: boolean;
  handleCopyKey: () => void;
  handlePopOutChat: () => void;
}

export function StreamKeyCard({
  streamKey,
  showKey,
  setShowKey,
  isCopied,
  handleCopyKey,
  handlePopOutChat,
}: StreamKeyCardProps) {
  const [isUrlCopied, setIsUrlCopied] = useState(false);

  const streamUrl = typeof window !== "undefined" 
    ? `rtmp://${window.location.hostname}:1935/src` 
    : "rtmp://localhost:1935/src";

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(streamUrl);
    setIsUrlCopied(true);
    setTimeout(() => setIsUrlCopied(false), 2000);
  };

  return (
    <div className="rounded-3xl border border-zinc-200 dark:border-white/5 bg-zinc-50 dark:bg-zinc-900/40 backdrop-blur-xl p-5 shadow-lg text-left space-y-4">
      <h2 className="text-sm font-bold text-zinc-900 dark:text-white border-b border-zinc-200 dark:border-zinc-800/80 pb-2.5">
        Cấu hình phần mềm phát sóng (OBS / Streamlabs)
      </h2>
      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
        Sao chép Máy chủ phát sóng và Khóa luồng bên dưới rồi dán vào cài đặt Stream của phần mềm phát sóng của bạn (ví dụ: OBS Studio).
      </p>

      <div className="space-y-3.5">
        {/* Stream URL (Server) */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            Máy chủ phát sóng (Stream URL)
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={streamUrl}
              readOnly
              className="flex-1 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2 text-xs font-mono text-zinc-800 dark:text-zinc-300 focus:outline-none"
            />
            <button
              onClick={handleCopyUrl}
              className="bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 px-3.5 rounded-xl text-xs text-zinc-650 dark:text-zinc-300 transition-colors cursor-pointer font-semibold"
              title="Sao chép địa chỉ máy chủ"
            >
              {isUrlCopied ? "Đã chép" : "Sao chép"}
            </button>
          </div>
        </div>

        {/* Stream Key */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            Khóa luồng (Stream Key)
          </label>
          <div className="flex gap-2">
            <input
              type={showKey ? "text" : "password"}
              value={streamKey || "Đang lấy khoá..."}
              readOnly
              className="flex-1 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2 text-xs font-mono text-zinc-800 dark:text-zinc-300 focus:outline-none"
            />
            <button
              onClick={() => setShowKey(!showKey)}
              className="bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 px-3 rounded-xl text-xs text-zinc-650 dark:text-zinc-300 transition-colors cursor-pointer font-medium"
              title={showKey ? "Ẩn" : "Hiện"}
            >
              {showKey ? "Ẩn" : "Hiện"}
            </button>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleCopyKey}
            className="flex-1 inline-flex justify-center items-center gap-1.5 rounded-xl bg-emerald-600/10 dark:bg-emerald-600/20 border border-emerald-500/20 py-2.5 text-xs font-semibold text-emerald-650 dark:text-emerald-450 shadow-sm hover:bg-emerald-600/20 dark:hover:bg-emerald-600/30 transition-all cursor-pointer"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.8}
              stroke="currentColor"
              className="w-4 h-4"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8.25 7.5V6.108c0-1.135.845-2.098 1.976-2.192.373-.03.748-.057 1.123-.08M15.75 18H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08M15.75 18.75v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5a1.125 1.125 0 0 1-1.125-1.125v-1.5A3.375 3.375 0 0 0 6.375 7.5H5.25m11.9-3.664A2.251 2.251 0 0 0 15 2.25h-1.5a2.251 2.251 0 0 0-2.15 1.586m5.8 0c.065.21.1.433.1.664v.75h-6V4.5c0-.231.035-.454.1-.664M6.75 7.5H4.875c-.621 0-1.125.504-1.125 1.125v12c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V16.5a9 9 0 0 0-9-9Z"
              />
            </svg>
            {isCopied ? "Đã sao chép!" : "Sao chép mã"}
          </button>

          <button
            onClick={handlePopOutChat}
            className="inline-flex justify-center items-center gap-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3.5 py-2.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-all cursor-pointer shadow-sm"
            title="Mở chat trong cửa sổ trình duyệt nổi riêng biệt"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.8}
              stroke="currentColor"
              className="w-4 h-4"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
              />
            </svg>
            Tách Chat
          </button>
        </div>
      </div>
    </div>
  );
}
