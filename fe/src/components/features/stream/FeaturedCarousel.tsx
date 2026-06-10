"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Card, Button } from "@/components/ui";
import type { Room } from "@/services/rooms.service";

const GRADIENTS = [
  "from-purple-650 to-zinc-950",
  "from-rose-650 to-zinc-950",
  "from-cyan-650 to-slate-950",
  "from-amber-650 to-zinc-900",
  "from-violet-650 to-zinc-950",
];

interface FeaturedCarouselProps {
  rooms?: Room[];
}

export function FeaturedCarousel({ rooms = [] }: FeaturedCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isAutoPlay, setIsAutoPlay] = useState(true);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const validRooms = React.useMemo(
    () => (Array.isArray(rooms) ? rooms : []).filter(Boolean),
    [rooms]
  );

  useEffect(() => {
    setActiveIndex(0);
  }, [validRooms.length]);

  // Auto play rotation (only active if mouse is not hovering and video is not playing / we want rotation)
  useEffect(() => {
    if (!isAutoPlay || validRooms.length === 0) return;
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % validRooms.length);
    }, 10000); // 10s per slide for better video viewing experience
    return () => clearInterval(interval);
  }, [isAutoPlay, validRooms.length]);

  const safeIndex = activeIndex < validRooms.length ? activeIndex : 0;
  const activeRoom = validRooms[safeIndex];

  // Load HLS Live Stream for the active slide video (Muted Autoplay like Twitch)
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !activeRoom || !activeRoom.playback_url) return;

    let hls: any;

    import("hls.js").then(({ default: Hls }) => {
      if (Hls.isSupported()) {
        hls = new Hls({
          maxBufferSize: 0,
          maxBufferLength: 4,
          liveSyncDuration: 2,
          enableWorker: true
        });
        hls.loadSource(activeRoom.playback_url!);
        hls.attachMedia(video);
        
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          video.play().catch((err) => {
            console.log("Autoplay carousel video prevented:", err);
          });
        });

        hls.on(Hls.Events.ERROR, function (event: any, data: any) {
          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                hls.startLoad();
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                hls.recoverMediaError();
                break;
              default:
                hls.destroy();
                break;
            }
          }
        });
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = activeRoom.playback_url!;
        video.addEventListener("loadedmetadata", () => {
          video.play().catch((err) => {
            console.log("Autoplay carousel video prevented:", err);
          });
        });
      }
    });

    return () => {
      if (hls) {
        hls.destroy();
      }
    };
  }, [activeRoom?.playback_url]);

  if (validRooms.length === 0) {
    return (
      <Card variant="glass" padding="lg" className="flex items-center justify-center min-h-[220px]">
        <div className="text-center text-zinc-500 space-y-3">
          <span className="text-4xl animate-bounce inline-block">📡</span>
          <p className="text-sm font-bold tracking-wide">Chưa có stream nào đang phát trực tiếp.</p>
        </div>
      </Card>
    );
  }

  if (!activeRoom) return null;

  const gradient = GRADIENTS[safeIndex % GRADIENTS.length];
  const formatViewers = (count: number) =>
    count >= 1000 ? `${(count / 1000).toFixed(1)}K` : count.toString();

  return (
    <Card
      variant="glass"
      padding="sm"
      hoverEffect={false}
      className="flex flex-col lg:flex-row gap-5 w-full overflow-hidden transition-all duration-300 z-10"
      onMouseEnter={() => setIsAutoPlay(false)}
      onMouseLeave={() => setIsAutoPlay(true)}
    >
      {/* LEFT SIDE: Big Player / Active Stream Showcase */}
      <div className="flex-1 flex flex-col gap-4">
        <Link href={`/live/${activeRoom.host?.slug}`} className="block">
          <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-zinc-950 border border-white/5 dark:border-white/5 group cursor-pointer shadow-2xl">
            {/* Live Autoplay Video Element */}
            {activeRoom.playback_url ? (
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="absolute inset-0 w-full h-full object-cover opacity-85 group-hover:opacity-100 transition-opacity duration-300 bg-black"
              />
            ) : activeRoom.thumbnail ? (
              <img
                src={activeRoom.thumbnail}
                alt={activeRoom.title}
                className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:opacity-95 transition-opacity duration-500"
              />
            ) : (
              <div className={`absolute inset-0 bg-gradient-to-tr ${gradient} opacity-50 group-hover:opacity-65 transition-opacity duration-500`} />
            )}

            {/* Dark gradient cover overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/25 pointer-events-none" />

            {/* Play overlay button on hover */}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <div className="relative z-10 flex h-14 w-14 items-center justify-center rounded-full bg-neon-primary text-white group-hover:scale-105 transition-all duration-300 shadow-xl shadow-neon-primary/30">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5 ml-0.5">
                  <path d="M8 5.14v14l11-7-11-7z" />
                </svg>
              </div>
            </div>

            {/* Live Badge */}
            <div className="absolute top-4 left-4 flex items-center gap-1.5 rounded-full bg-rose-650 px-3.5 py-1.5 text-[9px] font-black tracking-wider text-white shadow-md shadow-rose-650/30">
              <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
              ĐANG PHÁT TRỰC TIẾP
            </div>

            {/* Viewer count */}
            <div className="absolute bottom-4 left-4 rounded-lg bg-black/65 backdrop-blur-md px-3 py-1.5 text-xs font-bold text-zinc-200 font-mono">
              ⚡ {formatViewers(activeRoom.viewer_count)} đang xem
            </div>

            {/* Navigation arrows (Stop propagation to prevent page redirection) */}
            <div className="absolute right-4 bottom-4 flex items-center gap-2 z-20">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setActiveIndex((prev) => (prev - 1 + validRooms.length) % validRooms.length);
                }}
                className="p-2 rounded-lg bg-black/65 hover:bg-neon-primary text-white transition-all cursor-pointer shadow-md hover:scale-105 active:scale-95"
                aria-label="Previous stream"
              >
                &larr;
              </button>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setActiveIndex((prev) => (prev + 1) % validRooms.length);
                }}
                className="p-2 rounded-lg bg-black/65 hover:bg-neon-primary text-white transition-all cursor-pointer shadow-md hover:scale-105 active:scale-95"
                aria-label="Next stream"
              >
                &rarr;
              </button>
            </div>
          </div>
        </Link>

        {/* Active Stream Info */}
        <div className="flex gap-4 px-2 text-left">
          {/* Streamer Avatar */}
          <div className="h-12 w-12 rounded-full shrink-0 bg-zinc-900 border border-zinc-800 flex items-center justify-center text-neon-accent font-black text-md uppercase overflow-hidden ring-2 ring-neon-primary/20">
            {activeRoom.host?.avatar ? (
              <img src={activeRoom.host.avatar} alt={activeRoom.host.name} className="w-full h-full object-cover" />
            ) : (
              activeRoom.host?.name?.charAt(0) ?? "?"
            )}
          </div>
          
          <div className="space-y-1.5 flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-extrabold text-neon-primary uppercase tracking-wider">
                {activeRoom.host?.name}
              </span>
              {activeRoom.category && (
                <>
                  <span className="h-1.5 w-1.5 rounded-full bg-zinc-350 dark:bg-zinc-800" />
                  <span className="inline-flex items-center rounded-md bg-neon-primary/5 dark:bg-neon-primary/10 border border-neon-primary/10 px-2 py-0.5 text-[9px] font-black text-neon-primary uppercase tracking-wider">
                    {activeRoom.category.name}
                  </span>
                </>
              )}
            </div>
            <h2 className="text-md sm:text-lg font-bold tracking-tight text-zinc-900 dark:text-white line-clamp-2 leading-snug">
              {activeRoom.title}
            </h2>
            {activeRoom.description && (
              <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 pt-0.5 font-medium leading-relaxed">
                {activeRoom.description}
              </p>
            )}
          </div>

          <div className="shrink-0 hidden sm:flex items-center">
            <Link href={`/live/${activeRoom.host?.slug}`}>
              <Button variant="glow" size="md">
                Xem ngay
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* RIGHT SIDE: Mini-Playlist Sidebar */}
      <div className="w-full lg:w-[320px] flex flex-col gap-2 border-t lg:border-t-0 lg:border-l border-zinc-200/60 dark:border-zinc-900/40 pt-4 lg:pt-0 lg:pl-4">
        <div className="px-2 pb-2 text-left">
          <span className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 tracking-widest uppercase">
            KÊNH NỔI BẬT HÔM NAY ({validRooms.length})
          </span>
        </div>

        <div className="flex flex-row lg:flex-col gap-2 overflow-x-auto lg:overflow-x-visible lg:overflow-y-auto max-h-[460px] pb-2 scrollbar-thin scrollbar-thumb-zinc-200 dark:scrollbar-thumb-zinc-900 scrollbar-track-transparent">
          {validRooms.map((room, index) => {
            const isActive = index === activeIndex;
            const g = GRADIENTS[index % GRADIENTS.length];
            return (
              <button
                key={room.id}
                onClick={(e) => {
                  e.preventDefault();
                  setActiveIndex(index);
                  setIsAutoPlay(false);
                }}
                className={`flex items-center text-left gap-3.5 p-2 rounded-xl transition-all duration-300 shrink-0 w-[240px] lg:w-full select-none cursor-pointer border ${
                  isActive
                    ? "bg-neon-primary/5 dark:bg-neon-primary/10 border-neon-primary/20 dark:border-neon-primary/20 shadow-sm"
                    : "border-transparent bg-transparent hover:bg-zinc-100/40 dark:hover:bg-zinc-900/30"
                }`}
              >
                {/* Mini Preview */}
                <div className="relative aspect-video w-20 rounded-lg overflow-hidden bg-zinc-950 shrink-0 border border-zinc-200 dark:border-zinc-800">
                  {room.thumbnail ? (
                    <img src={room.thumbnail} alt={room.title} className="absolute inset-0 w-full h-full object-cover" />
                  ) : (
                    <div className={`absolute inset-0 bg-gradient-to-tr ${g} opacity-50`} />
                  )}
                  {isActive && (
                    <div className="absolute inset-0 bg-neon-primary/10 flex items-center justify-center">
                      <div className="h-2 w-2 rounded-full bg-neon-primary animate-ping" />
                    </div>
                  )}
                </div>

                {/* Stream brief metadata */}
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <span className={`text-[10px] font-extrabold truncate ${isActive ? "text-neon-primary" : "text-zinc-500"}`}>
                    {room.host?.name}
                  </span>
                  <h4 className={`text-xs font-bold truncate leading-snug mt-0.5 ${isActive ? "text-zinc-900 dark:text-white" : "text-zinc-700 dark:text-zinc-300"}`}>
                    {room.title}
                  </h4>
                  <span className="text-[9px] text-zinc-450 dark:text-zinc-550 truncate mt-1 font-mono">
                    {room.category?.name ?? "Livestream"} · {formatViewers(room.viewer_count)} viewers
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </Card>
  );
}

export default FeaturedCarousel;
