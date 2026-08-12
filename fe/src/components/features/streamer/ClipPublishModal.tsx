"use client";

import { FormEvent, useState } from "react";
import { FileText, UploadCloud, X } from "lucide-react";

export type ClipRange = { startedAt: Date; endedAt: Date; durationSeconds: number };
export type ClipPublishDraft = ClipRange & { title: string; description: string; publishToAuthor: boolean };

type ClipPublishModalProps = { authorName: string; range: ClipRange; submitting?: boolean; onClose: () => void; onConfirm: (draft: ClipPublishDraft) => void; };

const formatTime = (value: Date) => value.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

export function ClipPublishModal({ authorName, range, submitting = false, onClose, onConfirm }: ClipPublishModalProps) {
  const [title, setTitle] = useState(`Khoảnh khắc từ ${authorName} · ${formatTime(range.endedAt)}`);
  const [description, setDescription] = useState("");
  const [publishToAuthor, setPublishToAuthor] = useState(true);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!title.trim()) return;
    onConfirm({ ...range, title: title.trim(), description: description.trim(), publishToAuthor });
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-end justify-center bg-black/80 p-0 backdrop-blur-sm sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label="Xác nhận đăng clip">
      <form onSubmit={submit} className="w-full max-w-2xl overflow-hidden rounded-t-[2rem] border border-white/10 bg-zinc-950 shadow-[0_28px_100px_rgba(0,0,0,0.72)] animate-in fade-in slide-in-from-bottom-3 duration-200 sm:rounded-[2rem]">
        <div className="flex items-start justify-between border-b border-white/10 px-5 py-5 sm:px-7">
          <div><div className="flex items-center gap-2 text-emerald-400"><UploadCloud className="h-4 w-4" /><span className="text-xs font-bold tracking-wide">Hoàn tất clip</span></div><h2 className="mt-2 text-xl font-black tracking-tight text-white">Xác nhận nội dung trước khi đăng</h2></div>
          <button type="button" disabled={submitting} onClick={onClose} className="rounded-xl p-2 text-zinc-400 transition hover:bg-white/5 hover:text-white disabled:opacity-50" aria-label="Đóng xác nhận đăng clip"><X className="h-5 w-5" /></button>
        </div>

        <div className="space-y-5 p-5 sm:p-7">
          <div className="grid grid-cols-2 overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/50 text-center text-xs">
            <div className="border-r border-white/10 p-3"><p className="text-zinc-500">Đoạn bắt đầu</p><p className="mt-1 font-bold text-white">{formatTime(range.startedAt)}</p></div>
            <div className="p-3"><p className="text-zinc-500">Độ dài</p><p className="mt-1 font-bold text-emerald-300">{range.durationSeconds} giây</p></div>
          </div>
          <div><label htmlFor="clip-title" className="mb-2 block text-xs font-bold text-zinc-300">Tiêu đề</label><input id="clip-title" required maxLength={255} value={title} onChange={(event) => setTitle(event.target.value)} className="w-full rounded-xl border border-white/10 bg-zinc-900 px-3.5 py-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-emerald-400" /></div>
          <div><label htmlFor="clip-description" className="mb-2 block text-xs font-bold text-zinc-300">Mô tả <span className="font-medium text-zinc-500">(không bắt buộc)</span></label><textarea id="clip-description" value={description} onChange={(event) => setDescription(event.target.value)} maxLength={2000} rows={3} placeholder="Chia sẻ điều thú vị trong khoảnh khắc này..." className="w-full resize-none rounded-xl border border-white/10 bg-zinc-900 px-3.5 py-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-emerald-400" /></div>
          <label className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition ${publishToAuthor ? "border-emerald-400/50 bg-emerald-400/10" : "border-white/10 bg-zinc-900/60"}`}><input type="checkbox" checked={publishToAuthor} onChange={(event) => setPublishToAuthor(event.target.checked)} className="mt-0.5 h-4 w-4 accent-emerald-400" /><span><span className="block text-sm font-bold text-white">Đăng vào kênh {authorName}</span><span className="mt-1 block text-xs leading-relaxed text-zinc-400">Clip sẽ xuất hiện trong tab Video ngắn của kênh sau khi hệ thống xử lý xong.</span></span></label>
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-white/10 bg-black/20 p-5 sm:flex-row sm:justify-end sm:px-7"><button type="button" disabled={submitting} onClick={onClose} className="rounded-xl px-4 py-2.5 text-xs font-bold text-zinc-300 transition hover:bg-white/5 hover:text-white disabled:opacity-50">Quay lại</button><button disabled={submitting} type="submit" className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-emerald-950/40 transition hover:bg-emerald-400 disabled:cursor-wait disabled:opacity-60"><FileText className="h-4 w-4" />{submitting ? "Đang render clip..." : publishToAuthor ? "Xác nhận đăng clip" : "Lưu lựa chọn"}</button></div>
      </form>
    </div>
  );
}
