"use client";

import React, { useState } from "react";

interface RestreamVideo {
  id: string;
  title: string;
  duration: string;
  views: number;
  uploaded_at: string;
  status: "ready" | "processing";
  thumbnailColor: string;
}

interface RestreamManagerProps {
  restreams: RestreamVideo[];
  setRestreams: React.Dispatch<React.SetStateAction<RestreamVideo[]>>;
}

export function RestreamManager({ restreams, setRestreams }: RestreamManagerProps) {
  const [dragActive, setDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadingTitle, setUploadingTitle] = useState("");

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const simulateUpload = (title: string) => {
    setUploadProgress(0);
    setUploadingTitle(title);

    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev === null) return 0;
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            const newVideo: RestreamVideo = {
              id: `r-mock-${Date.now()}`,
              title: title || "Bản ghi Livestream mới",
              duration: "02:30:15",
              views: 0,
              uploaded_at: new Date().toISOString().split("T")[0],
              status: "processing",
              thumbnailColor: "from-blue-600 to-zinc-950",
            };
            setRestreams((prevList) => [newVideo, ...prevList]);
            setUploadProgress(null);
            setUploadingTitle("");

            // Simulate processing to ready state after 15 seconds
            setTimeout(() => {
              setRestreams((currentList) =>
                currentList.map((v) => (v.id === newVideo.id ? { ...v, status: "ready" } : v))
              );
            }, 15000);
          }, 1000);
          return 100;
        }
        return prev + 10;
      });
    }, 300);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      simulateUpload(file.name.replace(/\.[^/.]+$/, ""));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      simulateUpload(file.name.replace(/\.[^/.]+$/, ""));
    }
  };

  const handleDeleteRestream = (id: string) => {
    setRestreams((prev) => prev.filter((item) => item.id !== id));
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start text-left">
      {/* Upload Zone */}
      <div className="lg:col-span-5 p-6 rounded-3xl border border-zinc-200 dark:border-white/5 bg-white dark:bg-zinc-900/40 backdrop-blur-xl shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-zinc-900 dark:text-white border-b border-zinc-200 dark:border-zinc-800 pb-2.5">
          Tải Lên Bản Ghi Restream / VoDs
        </h3>

        {uploadProgress !== null ? (
          <div className="p-8 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl flex flex-col items-center justify-center text-center space-y-4">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
            <div className="space-y-1">
              <p className="text-xs font-bold text-zinc-800 dark:text-white truncate max-w-[220px]">
                {uploadingTitle}
              </p>
              <p className="text-[10px] text-zinc-400 font-semibold uppercase">
                Đang tải lên... {uploadProgress}%
              </p>
            </div>
            <div className="w-full bg-zinc-200 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden">
              <div
                style={{ width: `${uploadProgress}%` }}
                className="bg-emerald-500 h-full transition-all duration-300"
              />
            </div>
          </div>
        ) : (
          <div
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            className={`p-10 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center text-center space-y-4 transition-all ${
              dragActive
                ? "border-emerald-500 bg-emerald-500/5 dark:bg-emerald-500/10"
                : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
            }`}
          >
            <div className="h-12 w-12 rounded-full bg-zinc-100 dark:bg-zinc-950 flex items-center justify-center text-zinc-400 dark:text-zinc-500">
              📥
            </div>
            <div className="space-y-1">
              <p className="text-xs font-bold text-zinc-850 dark:text-zinc-300">
                Kéo thả file video vào đây hoặc
              </p>
              <label className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer font-bold">
                chọn từ thiết bị của bạn
                <input
                  type="file"
                  accept="video/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            </div>
            <p className="text-[9px] text-zinc-400 uppercase font-bold">
              Định dạng hỗ trợ: MP4, MKV, AVI (Tối đa 2GB)
            </p>
          </div>
        )}
      </div>

      {/* Restream List */}
      <div className="lg:col-span-7 p-6 rounded-3xl border border-zinc-200 dark:border-white/5 bg-white dark:bg-zinc-900/40 backdrop-blur-xl shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-zinc-900 dark:text-white border-b border-zinc-200 dark:border-zinc-800 pb-2.5">
          Danh Sách Video Restream / VoDs ({restreams.length})
        </h3>

        <div className="space-y-4">
          {restreams.length === 0 ? (
            <p className="text-xs text-zinc-500 text-center py-8">Chưa có video restream nào.</p>
          ) : (
            restreams.map((vod) => (
              <div
                key={vod.id}
                className="flex gap-4 p-3 rounded-2xl bg-zinc-50/50 dark:bg-zinc-950/20 border border-zinc-200 dark:border-white/5 shadow-sm hover:shadow-md transition-all"
              >
                {/* Thumbnail Preview Box */}
                <div className="relative aspect-video w-28 rounded-lg overflow-hidden bg-zinc-850 shrink-0 border border-zinc-200 dark:border-zinc-800">
                  <div className={`absolute inset-0 bg-gradient-to-tr ${vod.thumbnailColor} opacity-70`} />
                  <span className="absolute bottom-1 right-1 rounded bg-black/60 px-1 py-0.2 text-[8px] font-bold text-white font-mono">
                    {vod.duration}
                  </span>
                </div>

                {/* Video Info details */}
                <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                  <div>
                    <h4 className="text-xs font-bold text-zinc-850 dark:text-white line-clamp-2 leading-snug">
                      {vod.title}
                    </h4>
                    <p className="text-[10px] text-zinc-450 dark:text-zinc-500 mt-1 font-medium">
                      📅 Tải lên ngày {vod.uploaded_at} &bull; {vod.views.toLocaleString()} lượt xem
                    </p>
                  </div>

                  <div className="flex items-center justify-between gap-4 mt-2">
                    {vod.status === "processing" ? (
                      <span className="text-[9px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 font-bold animate-pulse">
                        ⚙️ ĐANG XỬ LÝ...
                      </span>
                    ) : (
                      <span className="text-[9px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-450 font-bold">
                        ✓ ĐÃ SẴN SÀNG
                      </span>
                    )}

                    <button
                      onClick={() => handleDeleteRestream(vod.id)}
                      className="rounded-xl border border-red-200 dark:border-red-950/30 text-red-550 dark:text-red-400 px-3 py-1.5 text-[9px] font-bold hover:bg-red-50 dark:hover:bg-red-950/20 transition-all cursor-pointer border-none"
                    >
                      Xóa
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
