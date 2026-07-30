"use client";

import { useEffect, useMemo, useState } from "react";

type Position = "top-left" | "top-center" | "top-right" | "center" | "bottom-left" | "bottom-center" | "bottom-right";
type Theme = "neon" | "gold" | "minimal";

const positions: { value: Position; label: string }[] = [
  { value: "top-left", label: "Trên trái" },
  { value: "top-center", label: "Trên giữa" },
  { value: "top-right", label: "Trên phải" },
  { value: "center", label: "Chính giữa" },
  { value: "bottom-left", label: "Dưới trái" },
  { value: "bottom-center", label: "Dưới giữa" },
  { value: "bottom-right", label: "Dưới phải" },
];

export function DonationOverlaySettings({ roomId }: { roomId?: number }) {
  const storageKey = roomId ? `gostream:overlay:${roomId}` : "";
  const [position, setPosition] = useState<Position>("bottom-center");
  const [theme, setTheme] = useState<Theme>("neon");
  const [duration, setDuration] = useState(7);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!storageKey) return;
    const saved = localStorage.getItem(storageKey);
    if (!saved) return;
    try {
      const value = JSON.parse(saved) as { position?: Position; theme?: Theme; duration?: number };
      if (value.position) setPosition(value.position);
      if (value.theme) setTheme(value.theme);
      if (value.duration) setDuration(value.duration);
    } catch {
      localStorage.removeItem(storageKey);
    }
  }, [storageKey]);

  useEffect(() => {
    if (!storageKey) return;
    localStorage.setItem(storageKey, JSON.stringify({ position, theme, duration }));
  }, [storageKey, position, theme, duration]);

  const overlayURL = useMemo(() => {
    if (!roomId || typeof window === "undefined") return "";
    const url = new URL(`/overlay/${roomId}`, window.location.origin);
    url.searchParams.set("position", position);
    url.searchParams.set("theme", theme);
    url.searchParams.set("duration", String(duration));
    return url.toString();
  }, [roomId, position, theme, duration]);

  const copyOverlayURL = async () => {
    if (!overlayURL) return;
    await navigator.clipboard.writeText(overlayURL);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  if (!roomId) return null;

  return (
    <section className="space-y-5 rounded-3xl border border-amber-400/15 bg-zinc-950/50 p-6 text-left shadow-xl">
      <div>
        <p className="text-sm font-bold text-white">Donation Alert cho OBS</p>
        <p className="mt-1 text-xs text-zinc-400">Mở URL này trong OBS Browser Source để hiện người donate, số coin và lời nhắn theo thời gian thực.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <label className="space-y-1.5 text-xs font-semibold text-zinc-300">
          Vị trí
          <select value={position} onChange={(event) => setPosition(event.target.value as Position)} className="w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2.5 text-xs text-white outline-none focus:border-amber-400">
            {positions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </label>
        <label className="space-y-1.5 text-xs font-semibold text-zinc-300">
          Giao diện
          <select value={theme} onChange={(event) => setTheme(event.target.value as Theme)} className="w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2.5 text-xs text-white outline-none focus:border-amber-400">
            <option value="neon">Neon</option>
            <option value="gold">Gold</option>
            <option value="minimal">Tối giản</option>
          </select>
        </label>
        <label className="space-y-1.5 text-xs font-semibold text-zinc-300">
          Thời lượng: {duration}s
          <input type="range" min="3" max="15" value={duration} onChange={(event) => setDuration(Number(event.target.value))} className="mt-2 w-full accent-amber-400" />
        </label>
      </div>

      <div className="rounded-xl border border-white/10 bg-black/40 p-3 font-mono text-[11px] text-emerald-300 break-all">{overlayURL}</div>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => void copyOverlayURL()} className="rounded-xl bg-amber-400 px-4 py-2.5 text-xs font-bold text-zinc-950 transition hover:bg-amber-300">{copied ? "Đã sao chép" : "Sao chép URL cho OBS"}</button>
        <a href={overlayURL} target="_blank" rel="noreferrer" className="rounded-xl border border-white/15 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-white/10">Xem trước overlay</a>
      </div>
      <p className="text-[11px] text-zinc-500">OBS: Add Source → Browser → dán URL → kích thước 1920 × 1080. Nền overlay trong suốt.</p>
    </section>
  );
}
