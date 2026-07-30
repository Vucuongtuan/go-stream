"use client";

import { useEffect, useRef, useState } from "react";

type Position = "top-left" | "top-center" | "top-right" | "center" | "bottom-left" | "bottom-center" | "bottom-right";
type Theme = "neon" | "gold" | "minimal";

interface GiftMessage {
  id: string;
  user_name: string;
  avatar?: string;
  content: string;
  type: string;
  coin?: number;
}

const placement: Record<Position, string> = {
  "top-left": "left-12 top-12 items-start",
  "top-center": "left-1/2 top-12 -translate-x-1/2 items-center",
  "top-right": "right-12 top-12 items-end",
  center: "left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 items-center",
  "bottom-left": "bottom-12 left-12 items-start",
  "bottom-center": "bottom-12 left-1/2 -translate-x-1/2 items-center",
  "bottom-right": "bottom-12 right-12 items-end",
};

const themeClass: Record<Theme, string> = {
  neon: "border-fuchsia-300/70 bg-zinc-950/90 text-white shadow-[0_0_54px_rgba(217,70,239,.58)]",
  gold: "border-amber-300/70 bg-amber-950/90 text-amber-50 shadow-[0_0_54px_rgba(251,191,36,.46)]",
  minimal: "border-white/30 bg-black/75 text-white shadow-2xl",
};

export function DonationOverlay({ roomId, position, theme, duration }: { roomId: number; position: Position; theme: Theme; duration: number }) {
  const [alert, setAlert] = useState<GiftMessage | null>(null);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    document.documentElement.classList.add("overlay-transparent");
    document.body.classList.add("overlay-transparent");
    return () => {
      document.documentElement.classList.remove("overlay-transparent");
      document.body.classList.remove("overlay-transparent");
    };
  }, []);

  useEffect(() => {
    const baseURL = process.env.NEXT_PUBLIC_API_URL || "http://localhost";
    const source = new EventSource(`${baseURL}/api/rooms/${roomId}/chat/stream`);
    source.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as GiftMessage;
        if (message.type !== "gift") return;
        if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
        setAlert(message);
        timeoutRef.current = window.setTimeout(() => setAlert(null), duration * 1000);
      } catch {
        // Ignore malformed SSE payloads and keep the overlay connected.
      }
    };
    return () => {
      source.close();
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    };
  }, [roomId, duration]);

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-transparent font-sans">
      {alert && (
        <div className={`absolute flex max-w-[min(88vw,42rem)] animate-in fade-in zoom-in-95 duration-300 ${placement[position]}`}>
          <div className={`flex min-w-[22rem] items-center gap-4 rounded-3xl border p-5 backdrop-blur-xl ${themeClass[theme]}`}>
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white/15 text-2xl font-black uppercase">
              {alert.avatar ? <img src={alert.avatar} alt="" className="h-full w-full object-cover" /> : alert.user_name.charAt(0)}
            </div>
            <div className="min-w-0">
              <p className="text-base font-black">{alert.user_name} vừa donate</p>
              <p className="mt-0.5 text-2xl font-black text-amber-300">{(alert.coin ?? 0).toLocaleString()} coins</p>
              {alert.content && <p className="mt-1 line-clamp-2 text-sm text-white/80">{alert.content}</p>}
            </div>
            <span className="text-3xl">🎁</span>
          </div>
        </div>
      )}
    </main>
  );
}
