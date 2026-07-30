"use client";

import React, { useRef, useState } from "react";
import { FeatureCard } from "@/components/features/card";
import { ContentRail, type ContentRailHandle } from "@/components/features/contentRail";
import { Card } from "@/components/ui";
import { SectionHeader } from "@/components/sections/SectionHeader";
import type { Room } from "@/services/rooms.service";

interface ActiveStreamsSectionProps {
  rooms: Room[];
}

export function ActiveStreamsSection({ rooms }: ActiveStreamsSectionProps) {
  const railRef = useRef<ContentRailHandle>(null);
  const [availability, setAvailability] = useState({ canScrollLeft: false, canScrollRight: false });

  return (
    <section className="space-y-3" aria-label="Kênh đang trực tiếp">
      <SectionHeader
        title="Kênh đang trực tiếp"
        slug="/browse"
        moreLabel="Xem tất cả ›"
        actions={
          (availability.canScrollLeft || availability.canScrollRight) && (
            <div className="hidden items-center gap-1 sm:flex" aria-label="Điều hướng kênh trực tiếp">
              <button
                type="button"
                onClick={() => railRef.current?.scroll("left")}
                disabled={!availability.canScrollLeft}
                aria-label="Xem kênh trực tiếp trước"
                className="flex h-7 w-7 items-center justify-center rounded-md border border-zinc-200 text-zinc-500 transition hover:border-zinc-300 hover:bg-zinc-100 hover:text-zinc-900 disabled:cursor-default disabled:opacity-35 dark:border-zinc-800 dark:text-zinc-400 dark:hover:border-zinc-700 dark:hover:bg-zinc-900 dark:hover:text-white"
              >
                <span aria-hidden="true">‹</span>
              </button>
              <button
                type="button"
                onClick={() => railRef.current?.scroll("right")}
                disabled={!availability.canScrollRight}
                aria-label="Xem kênh trực tiếp tiếp theo"
                className="flex h-7 w-7 items-center justify-center rounded-md border border-zinc-200 text-zinc-500 transition hover:border-zinc-300 hover:bg-zinc-100 hover:text-zinc-900 disabled:cursor-default disabled:opacity-35 dark:border-zinc-800 dark:text-zinc-400 dark:hover:border-zinc-700 dark:hover:bg-zinc-900 dark:hover:text-white"
              >
                <span aria-hidden="true">›</span>
              </button>
            </div>
          )
        }
      />

      {rooms.length > 0 ? (
        <ContentRail ref={railRef} onAvailabilityChange={setAvailability}>
          {rooms.map((room) => (
            <FeatureCard
              key={room.id}
              variant="stream"
              title={room.title}
              imageUrl={room.thumbnail ?? ""}
              href={`/live/${room.host?.slug}`}
              streamer={room.host?.name ?? "Streamer"}
              viewers={room.viewer_count}
            />
          ))}
        </ContentRail>
      ) : (
        <Card variant="glass" padding="lg" className="flex min-h-40 items-center justify-center text-center">
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
            Hiện chưa có kênh nào đang phát sóng trực tiếp.
          </p>
        </Card>
      )}
    </section>
  );
}

export default ActiveStreamsSection;
