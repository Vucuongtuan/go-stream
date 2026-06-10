"use client";

import React from "react";

interface Category {
  id: number;
  name: string;
  slug: string;
}

interface StreamSettingsFormProps {
  title: string;
  setTitle: (val: string) => void;
  description: string;
  setDescription: (val: string) => void;
  categoryId: number | "";
  setCategoryId: (val: number | "") => void;
  categories: Category[];
  visibility: "public" | "private" | "unlisted";
  setVisibility: (val: "public" | "private" | "unlisted") => void;
  onSubmit: (e: React.FormEvent) => void;
  actionLoading: boolean;
}

export function StreamSettingsForm({
  title,
  setTitle,
  description,
  setDescription,
  categoryId,
  setCategoryId,
  categories,
  visibility,
  setVisibility,
  onSubmit,
  actionLoading,
}: StreamSettingsFormProps) {
  return (
    <div className="rounded-3xl border border-zinc-200 dark:border-white/5 bg-zinc-50 dark:bg-zinc-900/40 backdrop-blur-xl p-6 shadow-lg text-left space-y-6">
      <h2 className="text-sm font-bold text-zinc-900 dark:text-white border-b border-zinc-200 dark:border-zinc-800/80 pb-3">
        Cấu hình Phiên Live Stream
      </h2>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
            Tiêu đề Livestream
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Nhập tiêu đề hấp dẫn để thu hút khán giả..."
            className="w-full rounded-xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 px-4 py-2.5 text-xs text-zinc-800 dark:text-zinc-300 focus:outline-none focus:border-emerald-500 transition-colors"
            required
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
            Mô tả / Lời giới thiệu
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Viết một đoạn ngắn giới thiệu nội dung buổi stream hôm nay của bạn..."
            className="w-full h-24 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 px-4 py-2.5 text-xs text-zinc-800 dark:text-zinc-300 focus:outline-none focus:border-emerald-500 transition-colors resize-none"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
              Danh mục (Category)
            </label>
            <select
              value={categoryId}
              onChange={(e) =>
                setCategoryId(e.target.value === "" ? "" : Number(e.target.value))
              }
              className="w-full rounded-xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 px-4 py-2.5 text-xs text-zinc-800 dark:text-zinc-300 focus:outline-none focus:border-emerald-500"
            >
              <option value="">-- Không chọn danh mục --</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
              Chế độ hiển thị
            </label>
            <select
              value={visibility}
              onChange={(e) => setVisibility(e.target.value as any)}
              className="w-full rounded-xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 px-4 py-2.5 text-xs text-zinc-800 dark:text-zinc-300 focus:outline-none focus:border-emerald-500"
            >
              <option value="public">Công khai (Public)</option>
              <option value="unlisted">Không công khai (Unlisted)</option>
              <option value="private">Riêng tư (Private)</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={actionLoading}
            className="bg-zinc-900 hover:bg-zinc-850 dark:bg-zinc-850 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-750 text-white px-5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer"
          >
            {actionLoading ? "Đang lưu..." : "Lưu Thông Tin Kênh"}
          </button>
        </div>
      </form>
    </div>
  );
}
