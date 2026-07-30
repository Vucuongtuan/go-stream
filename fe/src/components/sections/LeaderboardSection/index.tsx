import React from "react";
import { Card } from "@/components/ui";
import { SectionHeader } from "@/components/sections/SectionHeader";
import type { LeaderboardEntry } from "@/services/analytics.service";

interface LeaderboardSectionProps {
  entries: LeaderboardEntry[];
}

export function LeaderboardSection({ entries }: LeaderboardSectionProps) {
  if (entries.length === 0) return null;

  return (
    <section className="space-y-3" aria-label="Bảng xếp hạng streamer hôm nay">
      <SectionHeader title="Bảng xếp hạng Streamer hôm nay" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {entries.map((entry, index) => {
          const isTop = index === 0;
          const isSecond = index === 1;
          const isThird = index === 2;

          return (
            <Card
              key={entry.streamer_id}
              variant={isTop ? "cyberpunk" : "glass"}
              padding="sm"
              className={`flex items-center gap-3 border ${
                isTop
                  ? "shadow-[0_0_15px_rgba(250,204,21,0.15)]"
                  : isSecond
                    ? "hover:border-zinc-400/40 dark:hover:border-zinc-700/50"
                    : "hover:border-neon-primary/20"
              }`}
            >
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border text-sm font-black font-mono shadow-inner ${
                  isTop
                    ? "border-neon-yellow/35 bg-neon-yellow/15 text-neon-yellow"
                    : isSecond
                      ? "border-zinc-350/30 bg-zinc-200/50 text-zinc-500 dark:border-zinc-700/30 dark:bg-zinc-800/60 dark:text-zinc-400"
                      : isThird
                        ? "border-amber-600/30 bg-amber-700/10 text-amber-600"
                        : "bg-zinc-100 text-zinc-450 dark:bg-zinc-900 dark:text-zinc-650"
                }`}
              >
                #{entry.rank}
              </div>
              <div className="min-w-0 text-left">
                <p className="truncate text-xs font-extrabold text-zinc-800 dark:text-zinc-250">
                  Streamer #{entry.streamer_id}
                </p>
                <p className="mt-0.5 font-mono text-[10px] font-bold text-neon-yellow">
                  {entry.score.toLocaleString()} coins
                </p>
              </div>
            </Card>
          );
        })}
      </div>
    </section>
  );
}

export default LeaderboardSection;
