import React from "react";
import Link from "next/link";
import { Card } from "@/components/ui";

interface StreamCardProps {
  title: string;
  streamer: string;
  streamerSlug?: string;
  category?: string;
  viewers: number | string;
  avatarChar?: string;
  avatar?: string;
  gradientFrom?: string;
  gradientTo?: string;
  thumbnailUrl?: string;
  playbackUrl?: string;
  roomId?: number;
}

export function StreamCard({
  title,
  streamer,
  streamerSlug,
  category,
  viewers,
  avatarChar,
  avatar,
  gradientFrom = "from-purple-900/50",
  gradientTo = "to-zinc-950",
  thumbnailUrl,
}: StreamCardProps) {
  const formattedViewers =
    typeof viewers === "number"
      ? viewers >= 1000
        ? `${(viewers / 1000).toFixed(1)}K`
        : viewers.toString()
      : viewers;

  const CardContent = (
    <Card variant="neonGlow" padding="none" className="group flex flex-col h-full cursor-pointer">
      {/* Stream Thumbnail Box */}
      <div className="relative aspect-video w-full bg-zinc-950 overflow-hidden">
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={title}
            className="absolute inset-0 w-full h-full object-cover transform transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div
            className={`absolute inset-0 opacity-40 group-hover:opacity-60 transition-opacity duration-500 bg-gradient-to-tr ${gradientFrom} ${gradientTo}`}
          />
        )}
        
        {/* Dark overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 opacity-90 transition-opacity duration-300" />

        {/* Hover Action Overlay Play Button */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-neon-primary text-white shadow-lg shadow-neon-primary/40 transform scale-90 group-hover:scale-100 transition-transform duration-300">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5 ml-0.5">
              <path d="M8 5.14v14l11-7-11-7z" />
            </svg>
          </div>
        </div>

        {/* Live Badge - Premium Red Glowing */}
        <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 rounded-full bg-rose-600 px-2.5 py-0.5 text-[9px] font-black tracking-widest text-white shadow-[0_0_10px_rgba(225,29,72,0.4)]">
          <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
          LIVE
        </div>

        {/* Viewers tag */}
        <div className="absolute bottom-3 left-3 z-10 rounded-lg bg-black/65 backdrop-blur-md px-2 py-0.5 text-[10px] font-bold text-zinc-350 font-mono">
          ⚡ {formattedViewers} xem
        </div>
      </div>

      {/* Streamer Detail Info */}
      <div className="flex gap-3 p-4 flex-1">
        {/* Streamer Avatar */}
        <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-800 border border-zinc-700 text-xs font-black text-neon-accent uppercase overflow-hidden ring-2 ring-transparent group-hover:ring-neon-primary/30 transition-all duration-300">
          {avatar ? (
            <img src={avatar} alt={streamer} className="w-full h-full object-cover" />
          ) : (
            avatarChar || streamer.charAt(0)
          )}
        </div>

        {/* Stream metadata */}
        <div className="flex-1 min-w-0 text-left flex flex-col justify-between">
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-neon-primary dark:group-hover:text-neon-primary transition-colors truncate leading-snug">
              {title}
            </h3>
            <p className="mt-0.5 text-[11px] font-semibold text-zinc-550 dark:text-zinc-400 truncate">{streamer}</p>
          </div>
          {category && (
            <div className="mt-2.5">
              <span className="inline-block rounded-md bg-neon-primary/5 dark:bg-neon-primary/10 border border-neon-primary/10 px-2 py-0.5 text-[9px] font-extrabold text-neon-primary uppercase tracking-wider">
                {category}
              </span>
            </div>
          )}
        </div>
      </div>
    </Card>
  );

  if (streamerSlug) {
    return <Link href={`/live/${streamerSlug}`} className="h-full block">{CardContent}</Link>;
  }
  return CardContent;
}

export default StreamCard;
