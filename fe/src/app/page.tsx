import React from "react";
import { MainLayout } from "@/components/layouts";
import { FeaturedCarousel } from "@/components/features";
import { ActiveStreamsSection, CategorySection, LeaderboardSection } from "@/components/sections";
import { roomsService } from "@/services/rooms.service";
import { analyticsService } from "@/services/analytics.service";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [rooms, categories, leaderboard] = await Promise.all([
    roomsService.getLiveRooms(),
    roomsService.getCategories(),
    analyticsService.getLeaderboard("donate", "daily", 5),
  ]);

  const liveRooms = rooms ?? [];
  const liveCategories = categories ?? [];
  const topDonateStreamers = leaderboard?.entries ?? [];

  return (
    <MainLayout>
      <div className="fixed inset-0 cyber-grid pointer-events-none opacity-60 z-0" />
      
      <div className="w-full mx-auto space-y-14 pb-20 relative z-10">
        <FeaturedCarousel rooms={liveRooms} />

        <ActiveStreamsSection rooms={liveRooms} />

        <LeaderboardSection entries={topDonateStreamers} />

        <CategorySection title="Thể loại" slug={'/categories'} categories={liveCategories} />
      </div>
    </MainLayout>
  );
}
