"use client";

import React, { useState } from "react";

interface ScheduledStream {
  id: string;
  title: string;
  date: string;
  time: string;
  category: string;
}

interface StreamScheduleProps {
  scheduledStreams: ScheduledStream[];
  setScheduledStreams: React.Dispatch<React.SetStateAction<ScheduledStream[]>>;
}

export function StreamSchedule({
  scheduledStreams,
  setScheduledStreams,
}: StreamScheduleProps) {
  const [newTitle, setNewTitle] = useState("");
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("");
  const [newCategory, setNewCategory] = useState("League of Legends");

  const handleAddSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDate || !newTime) return;

    const stream: ScheduledStream = {
      id: `s-mock-${Date.now()}`,
      title: newTitle,
      date: newDate,
      time: newTime,
      category: newCategory,
    };

    setScheduledStreams((prev) => [stream, ...prev]);
    setNewTitle("");
    setNewDate("");
    setNewTime("");
  };

  const handleDeleteSchedule = (id: string) => {
    setScheduledStreams((prev) => prev.filter((item) => item.id !== id));
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start text-left">
      {/* Schedule Form */}
      <div className="lg:col-span-4 p-6 rounded-3xl border border-zinc-200 dark:border-white/5 bg-white dark:bg-zinc-900/40 backdrop-blur-xl shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-zinc-900 dark:text-white border-b border-zinc-200 dark:border-zinc-800 pb-2.5">
          Tạo Lịch Livestream Mới
        </h3>
        
        <form onSubmit={handleAddSchedule} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
              Tiêu đề buổi stream
            </label>
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Ví dụ: Leo Rank cuối tuần..."
              className="w-full rounded-xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 px-3.5 py-2.5 text-xs text-zinc-800 dark:text-zinc-350 focus:outline-none focus:border-emerald-500"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Ngày</label>
              <input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="w-full rounded-xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 px-3 py-2 text-xs text-zinc-850 dark:text-zinc-300 focus:outline-none"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Giờ</label>
              <input
                type="time"
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
                className="w-full rounded-xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 px-3 py-2 text-xs text-zinc-850 dark:text-zinc-300 focus:outline-none"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
              Danh mục (Category)
            </label>
            <select
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              className="w-full rounded-xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 px-3 py-2.5 text-xs text-zinc-800 dark:text-zinc-350 focus:outline-none focus:border-emerald-500"
            >
              <option value="League of Legends">League of Legends</option>
              <option value="Grand Theft Auto V">Grand Theft Auto V</option>
              <option value="Counter-Strike 2">Counter-Strike 2</option>
              <option value="Just Chatting">Just Chatting</option>
            </select>
          </div>

          <button
            type="submit"
            className="w-full rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 py-2.5 text-xs font-bold transition-all duration-200 hover:bg-zinc-800 dark:hover:bg-zinc-200 cursor-pointer shadow-sm border-none"
          >
            Lên Lịch Phát Sóng
          </button>
        </form>
      </div>

      {/* Schedule List */}
      <div className="lg:col-span-8 p-6 rounded-3xl border border-zinc-200 dark:border-white/5 bg-white dark:bg-zinc-900/40 backdrop-blur-xl shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-zinc-900 dark:text-white border-b border-zinc-200 dark:border-zinc-800 pb-2.5">
          Danh Sách Lịch Stream Đã Lên ({scheduledStreams.length})
        </h3>

        <div className="space-y-3">
          {scheduledStreams.length === 0 ? (
            <p className="text-xs text-zinc-500 text-center py-8">Không có lịch phát sóng nào.</p>
          ) : (
            scheduledStreams.map((stream) => (
              <div
                key={stream.id}
                className="p-4 rounded-2xl bg-zinc-50/50 dark:bg-zinc-950/20 border border-zinc-200 dark:border-white/5 flex items-center justify-between gap-4 shadow-sm"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      {stream.category}
                    </span>
                    <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400">
                      📅 {stream.date} lúc {stream.time}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-zinc-850 dark:text-white leading-snug">
                    {stream.title}
                  </h4>
                </div>

                <button
                  onClick={() => handleDeleteSchedule(stream.id)}
                  className="rounded-xl border border-red-200 hover:bg-red-50 dark:border-red-950/30 text-red-550 dark:text-red-400 px-3 py-1.5 text-[10px] font-bold transition-all cursor-pointer"
                >
                  Xóa Lịch
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
