"use client";

import { useEffect, useMemo, useState } from "react";
import { Clock3, Scissors, X } from "lucide-react";

type LiveClipEditorProps = {
  openedAt: number;
  onClose: () => void;
  onConfirm: (range: { startedAt: Date; endedAt: Date; durationSeconds: number }) => void;
};

const formatClipTime = (value: Date) => value.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

export function LiveClipEditor({ openedAt, onClose, onConfirm }: LiveClipEditorProps) {
  const [durationSeconds, setDurationSeconds] = useState(30);
  const range = useMemo(() => ({ startedAt: new Date(openedAt - durationSeconds * 1000), endedAt: new Date(openedAt), durationSeconds }), [durationSeconds, openedAt]);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/75 p-0 backdrop-blur-sm sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label="Cắt đoạn livestream">
      <div className="w-full max-w-2xl overflow-hidden rounded-t-[2rem] border border-white/10 bg-zinc-950 shadow-[0_28px_100px_rgba(0,0,0,0.7)] animate-in fade-in zoom-in-95 duration-200 sm:rounded-[2rem]">
        <div className="flex items-start justify-between border-b border-white/10 px-5 py-5 sm:px-7">
          <div>
            <div className="flex items-center gap-2 text-emerald-400"><Scissors className="h-4 w-4" /><span className="text-xs font-bold tracking-wide">Cắt khoảnh khắc</span></div>
            <h2 className="mt-2 text-xl font-black tracking-tight text-white">Chọn đoạn vừa phát trên live</h2>
            <p className="mt-1 text-xs leading-relaxed text-zinc-400">Mặc định lấy 30 giây trước lúc bạn bấm nút đến thời điểm hiện tại.</p>
          </div>
          <button onClick={onClose} className="rounded-xl p-2 text-zinc-400 transition hover:bg-white/5 hover:text-white" aria-label="Đóng trình cắt"><X className="h-5 w-5" /></button>
        </div>

        <div className="space-y-6 p-5 sm:p-7">
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-[linear-gradient(115deg,#052e25,#0b111a_48%,#172554)] p-5">
            <div className="mb-8 flex items-center justify-between text-[11px] font-semibold text-zinc-300"><span>{formatClipTime(range.startedAt)}</span><span>{formatClipTime(range.endedAt)}</span></div>
            <div className="relative h-12 rounded-xl border border-white/10 bg-black/30">
              <div className="absolute inset-y-0 left-0 rounded-xl bg-emerald-400/20" style={{ width: `${(durationSeconds / 60) * 100}%` }} />
              {Array.from({ length: 7 }).map((_, index) => <span key={index} className="absolute top-0 h-full w-px bg-white/10" style={{ left: `${(index / 6) * 100}%` }} />)}
              <div className="absolute -top-2 bottom-[-0.5rem] left-0 w-1 rounded-full bg-emerald-300 shadow-[0_0_16px_rgba(110,231,183,0.75)]" />
              <div className="absolute -top-2 bottom-[-0.5rem] w-1 rounded-full bg-white shadow-[0_0_16px_rgba(255,255,255,0.75)]" style={{ left: `calc(${(durationSeconds / 60) * 100}% - 0.25rem)` }} />
            </div>
          </div>

          <div>
            <div className="mb-3 flex items-center justify-between"><label htmlFor="clip-duration" className="flex items-center gap-2 text-xs font-semibold text-zinc-300"><Clock3 className="h-4 w-4 text-emerald-400" />Độ dài đoạn cắt</label><span className="rounded-lg bg-emerald-400/10 px-2.5 py-1 text-xs font-bold text-emerald-300">{durationSeconds}s</span></div>
            <input id="clip-duration" type="range" min="10" max="60" step="5" value={durationSeconds} onChange={(event) => setDurationSeconds(Number(event.target.value))} className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-zinc-700 accent-emerald-400" />
            <div className="mt-2 flex justify-between text-[10px] font-medium text-zinc-500"><span>10 giây</span><span>60 giây</span></div>
          </div>
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-white/10 bg-black/20 p-5 sm:flex-row sm:justify-end sm:px-7">
          <button onClick={onClose} className="rounded-xl px-4 py-2.5 text-xs font-bold text-zinc-300 transition hover:bg-white/5 hover:text-white">Hủy</button>
          <button onClick={() => onConfirm(range)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-emerald-950/40 transition hover:bg-emerald-400"><Scissors className="h-4 w-4" />Xác nhận đoạn cắt</button>
        </div>
      </div>
    </div>
  );
}
