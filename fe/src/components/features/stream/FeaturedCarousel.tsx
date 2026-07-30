"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, ChevronLeft, ChevronRight, Eye, Play, Radio } from "lucide-react";
import { Card } from "@/components/ui";
import type { Room } from "@/services/rooms.service";

const GRADIENTS = [
  "from-violet-950 via-zinc-950 to-zinc-900",
  "from-rose-950 via-zinc-950 to-zinc-900",
  "from-cyan-950 via-zinc-950 to-zinc-900",
  "from-amber-950 via-zinc-950 to-zinc-900",
];

interface FeaturedCarouselProps {
  rooms?: Room[];
}

export function FeaturedCarousel({ rooms = [] }: FeaturedCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isAutoPlay, setIsAutoPlay] = useState(true);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const validRooms = useMemo(() => (Array.isArray(rooms) ? rooms : []).filter(Boolean), [rooms]);

  useEffect(() => {
    if (!isAutoPlay || validRooms.length < 2) return;
    const interval = setInterval(() => {
      setActiveIndex((current) => (current + 1) % validRooms.length);
    }, 9000);
    return () => clearInterval(interval);
  }, [isAutoPlay, validRooms.length]);

  const safeIndex = activeIndex < validRooms.length ? activeIndex : 0;
  const activeRoom = validRooms[safeIndex];

  useEffect(() => {
    const video = videoRef.current;
    const source = activeRoom?.playback_url;
    if (!video || !source) return;

    let hls: { destroy: () => void } | undefined;
    let disposed = false;

    import("hls.js").then(({ default: Hls }) => {
      if (disposed) return;

      if (Hls.isSupported()) {
        const player = new Hls({
          maxBufferLength: 30,
          liveSyncDurationCount: 3,
          liveMaxLatencyDurationCount: 6,
          backBufferLength: 30,
          fragLoadingMaxRetry: 6,
          enableWorker: true,
        });
        hls = player;
        player.loadSource(source);
        player.attachMedia(video);
        player.on(Hls.Events.MANIFEST_PARSED, () => {
          void video.play().catch(() => undefined);
        });
        player.on(Hls.Events.ERROR, (_event, data) => {
          if (!data.fatal) return;
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
            player.startLoad();
          } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
            player.recoverMediaError();
          } else {
            player.loadSource(source);
            player.startLoad();
          }
        });
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = source;
        video.onloadedmetadata = () => {
          void video.play().catch(() => undefined);
        };
      }
    });

    return () => {
      disposed = true;
      hls?.destroy();
      video.removeAttribute("src");
      video.load();
    };
  }, [activeRoom?.playback_url]);

  if (validRooms.length === 0) {
    return (
      <Card variant="glass" padding="lg" className="flex min-h-56 items-center justify-center">
        <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Chưa có stream nào đang phát trực tiếp.</p>
      </Card>
    );
  }

  if (!activeRoom) return null;

  const gradient = GRADIENTS[safeIndex % GRADIENTS.length];
  const viewerLabel = activeRoom.viewer_count >= 1000
    ? `${(activeRoom.viewer_count / 1000).toFixed(1)}K`
    : activeRoom.viewer_count.toString();
  const selectSlide = (index: number) => {
    setActiveIndex(index);
    setIsAutoPlay(false);
  };

  return (
    <section
      className="overflow-hidden rounded-[2rem] border border-white/10 bg-zinc-950 shadow-[0_32px_100px_rgba(0,0,0,0.35)]"
      onMouseEnter={() => setIsAutoPlay(false)}
      onMouseLeave={() => setIsAutoPlay(true)}
      aria-label="Kênh nổi bật"
    >
      <div className="relative isolate aspect-[16/10] min-h-[28rem] overflow-hidden sm:aspect-[16/8] sm:min-h-0">
        <Link href={`/live/${activeRoom.host?.slug}`} className="absolute inset-0 z-0 block" aria-label={`Xem ${activeRoom.title}`}>
          {activeRoom.playback_url ? (
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="h-full w-full scale-[1.01] object-cover opacity-80 transition duration-700 group-hover:scale-105"
            />
          ) : activeRoom.thumbnail ? (
            <img
              src={activeRoom.thumbnail}
              alt={activeRoom.title}
              className="h-full w-full object-cover opacity-80 transition duration-700 hover:scale-105"
            />
          ) : (
            <div className={`h-full w-full bg-gradient-to-br ${gradient}`} />
          )}
        </Link>

        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(9,9,11,0.9)_0%,rgba(9,9,11,0.42)_48%,rgba(9,9,11,0.12)_100%)]" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-black/25" />

        <div className="absolute left-5 top-5 flex items-center gap-2 sm:left-7 sm:top-7">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500 px-3 py-1.5 text-[10px] font-black tracking-[0.16em] text-white shadow-[0_0_20px_rgba(244,63,94,0.45)]">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" /> LIVE
          </span>
          {activeRoom.category && (
            <span className="hidden items-center gap-1.5 rounded-full border border-white/10 bg-black/35 px-3 py-1.5 text-[10px] font-semibold text-zinc-100 backdrop-blur-md sm:inline-flex">
              <Radio className="h-3 w-3" /> {activeRoom.category.name}
            </span>
          )}
        </div>

        <div className="absolute bottom-7 left-5 right-5 max-w-3xl text-left sm:bottom-9 sm:left-8 sm:right-auto">
          <Link href={`/live/${activeRoom.host?.slug}`} className="group block">
            <div className="mb-3 flex items-center gap-2 text-xs font-semibold text-zinc-200">
              <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-white/20 bg-white/10 text-sm font-black text-white backdrop-blur-md">
                {activeRoom.host?.avatar ? (
                  <img src={activeRoom.host.avatar} alt="" className="h-full w-full object-cover" />
                ) : (
                  activeRoom.host?.name?.charAt(0) ?? "?"
                )}
              </span>
              {activeRoom.host?.name ?? "Streamer"}
            </div>
            <h1 className="line-clamp-2 max-w-3xl text-3xl font-black leading-[0.96] tracking-[-0.045em] text-white transition-colors group-hover:text-neon-primary sm:text-5xl lg:text-6xl">
              {activeRoom.title}
            </h1>
          </Link>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Link
              href={`/live/${activeRoom.host?.slug}`}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-zinc-950 transition hover:-translate-y-0.5 hover:bg-neon-primary hover:text-white"
            >
              Xem trực tiếp <ArrowRight className="h-4 w-4" />
            </Link>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-200">
              <Eye className="h-4 w-4" /> {viewerLabel} đang xem
            </span>
          </div>
        </div>

        <div className="absolute bottom-7 right-5 z-10 flex items-center gap-2 sm:bottom-9 sm:right-8">
          <button
            type="button"
            onClick={() => selectSlide((safeIndex - 1 + validRooms.length) % validRooms.length)}
            aria-label="Kênh nổi bật trước"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-black/30 text-white backdrop-blur-md transition hover:bg-white hover:text-zinc-950"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => selectSlide((safeIndex + 1) % validRooms.length)}
            aria-label="Kênh nổi bật tiếp theo"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-black/30 text-white backdrop-blur-md transition hover:bg-white hover:text-zinc-950"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      {validRooms.length > 1 && (
        <div className="flex gap-2 overflow-x-auto border-t border-white/5 bg-zinc-950 p-3 scrollbar-none sm:p-4">
          {validRooms.map((room, index) => {
            const isActive = index === safeIndex;
            return (
              <button
                key={room.id}
                type="button"
                onClick={() => selectSlide(index)}
                className={`group flex min-w-[11rem] flex-1 items-center gap-3 rounded-xl border p-2 text-left transition sm:min-w-0 ${
                  isActive ? "border-neon-primary/45 bg-neon-primary/10" : "border-transparent bg-white/[0.025] hover:bg-white/[0.06]"
                }`}
              >
                <div className={`relative h-12 w-20 shrink-0 overflow-hidden rounded-lg bg-gradient-to-br ${GRADIENTS[index % GRADIENTS.length]}`}>
                  {room.thumbnail && <img src={room.thumbnail} alt="" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />}
                  {isActive && <div className="absolute inset-0 flex items-center justify-center bg-black/25"><Play className="h-4 w-4 fill-white text-white" /></div>}
                </div>
                <div className="min-w-0">
                  <p className={`truncate text-[11px] font-bold ${isActive ? "text-neon-primary" : "text-zinc-400"}`}>{room.host?.name ?? "Streamer"}</p>
                  <p className="mt-0.5 line-clamp-2 text-xs font-semibold leading-snug text-zinc-100">{room.title}</p>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default FeaturedCarousel;
