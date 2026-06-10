import React from "react";
import Link from "next/link";
import { MainLayout } from "@/components/layouts";
import { StreamCard, CategoryCard, FeaturedCarousel } from "@/components/features";
import { Card } from "@/components/ui";
import { roomsService } from "@/services/rooms.service";
import { analyticsService } from "@/services/analytics.service";

export const dynamic = "force-dynamic";

const GRADIENT_PALETTE = [
  { from: "from-purple-900/50", to: "to-zinc-950" },
  { from: "from-rose-900/50", to: "to-zinc-950" },
  { from: "from-cyan-900/50", to: "to-zinc-950" },
  { from: "from-amber-900/50", to: "to-zinc-950" },
  { from: "from-violet-900/50", to: "to-zinc-950" },
];

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
      {/* Cyber grid decorative background */}
      <div className="fixed inset-0 cyber-grid pointer-events-none opacity-60 z-0" />
      
      <div className="w-full mx-auto space-y-14 pb-20 relative z-10">
        {/* Banner Section / Featured Hero */}
        <FeaturedCarousel rooms={liveRooms} />

        {/* Active Streams */}
        <section className="space-y-6">
          <div className="flex items-center justify-between border-b border-zinc-200/60 pb-3.5 dark:border-zinc-900/60">
            <h2 className="flex items-center gap-2.5 text-base font-extrabold tracking-tight text-zinc-900 dark:text-white uppercase">
              <span className="h-4 w-1 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]" />
              Kênh đang trực tiếp
              {liveRooms.length > 0 && (
                <span className="ml-1 text-[9px] font-black bg-rose-650/10 text-rose-500 border border-rose-500/20 rounded-full px-2.5 py-0.5">
                  {liveRooms.length} LIVE
                </span>
              )}
            </h2>

            <Link
              href="/browse"
              className="text-xs font-bold text-zinc-500 transition-colors hover:text-neon-primary dark:text-zinc-400 dark:hover:text-neon-primary"
            >
              Xem tất cả &rarr;
            </Link>
          </div>

          {liveRooms.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {liveRooms.slice(0, 8).map((room, idx) => {
                const g = GRADIENT_PALETTE[idx % GRADIENT_PALETTE.length];
                return (
                  <StreamCard
                    key={room.id}
                    roomId={room.id}
                    title={room.title}
                    streamer={room.host?.name ?? "Streamer"}
                    streamerSlug={room.host?.slug}
                    category={room.category?.name}
                    viewers={room.viewer_count}
                    avatar={room.host?.avatar}
                    avatarChar={room.host?.name?.charAt(0).toUpperCase()}
                    thumbnailUrl={room.thumbnail}
                    gradientFrom={g.from}
                    gradientTo={g.to}
                  />
                );
              })}
            </div>
          ) : (
            <Card variant="glass" padding="lg" className="flex flex-col items-center justify-center py-20 text-zinc-450 gap-4">
              <span className="text-5xl">📡</span>
              <p className="text-sm font-bold tracking-wide">Hiện chưa có kênh nào đang phát sóng trực tiếp.</p>
            </Card>
          )}
        </section>

        {/* Top Donate Streamers (leaderboard) */}
        {topDonateStreamers.length > 0 && (
          <section className="space-y-6">
            <div className="flex items-center justify-between border-b border-zinc-200/60 pb-3.5 dark:border-zinc-900/60">
              <h2 className="flex items-center gap-2.5 text-base font-extrabold tracking-tight text-zinc-900 dark:text-white uppercase">
                <span className="h-4 w-1 rounded-full bg-neon-yellow shadow-[0_0_8px_rgba(250,204,21,0.6)]" />
                Bảng xếp hạng Streamer hôm nay
              </h2>
            </div>
            
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {topDonateStreamers.map((entry, idx) => {
                const isTop1 = idx === 0;
                const isTop2 = idx === 1;
                const isTop3 = idx === 2;
                
                return (
                  <Card
                    key={entry.streamer_id}
                    variant={isTop1 ? "cyberpunk" : "glass"}
                    padding="sm"
                    className={`flex items-center gap-4.5 border transition-all duration-300 ${
                      isTop1
                        ? "shadow-[0_0_15px_rgba(250,204,21,0.15)]"
                        : isTop2
                        ? "hover:border-zinc-400/40 dark:hover:border-zinc-700/50"
                        : "hover:border-neon-primary/20"
                    }`}
                  >
                    {/* Rank Badge */}
                    <div
                      className={`h-9 w-9 shrink-0 rounded-xl flex items-center justify-center text-sm font-black font-mono shadow-inner ${
                        isTop1
                          ? "bg-neon-yellow/15 text-neon-yellow border border-neon-yellow/35"
                          : isTop2
                          ? "bg-zinc-200/50 dark:bg-zinc-800/60 text-zinc-500 dark:text-zinc-400 border border-zinc-350/30 dark:border-zinc-700/30"
                          : isTop3
                          ? "bg-amber-700/10 text-amber-600 border border-amber-600/30"
                          : "bg-zinc-100 dark:bg-zinc-900 text-zinc-450 dark:text-zinc-650"
                      }`}
                    >
                      #{entry.rank}
                    </div>

                    <div className="min-w-0 text-left">
                      <p className="text-xs font-extrabold text-zinc-800 dark:text-zinc-250 truncate">
                        Streamer #{entry.streamer_id}
                      </p>
                      <p className="text-[10px] text-neon-yellow font-mono font-bold mt-0.5">
                        {entry.score.toLocaleString()} coins
                      </p>
                    </div>
                  </Card>
                );
              })}
            </div>
          </section>
        )}

        {/* Categories */}
        <section className="space-y-6">
          <div className="flex items-center justify-between border-b border-zinc-200/60 pb-3.5 dark:border-zinc-900/60">
            <h2 className="flex items-center gap-2.5 text-base font-extrabold tracking-tight text-zinc-900 dark:text-white uppercase">
              <span className="h-4 w-1 rounded-full bg-neon-primary shadow-[0_0_8px_rgba(168,85,247,0.6)]" />
              Thể loại hàng đầu
            </h2>
            <Link
              href="/categories"
              className="text-xs font-bold text-zinc-500 transition-colors hover:text-neon-primary dark:text-zinc-400 dark:hover:text-neon-primary"
            >
              Xem thêm &rarr;
            </Link>
          </div>

          {liveCategories.length > 0 ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {liveCategories.slice(0, 8).map((cat) => (
                <CategoryCard
                  key={cat.id}
                  name={cat.name}
                  viewers=""
                />
              ))}
            </div>
          ) : (
            /* Fallback static categories */
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {["League of Legends", "Just Chatting", "Grand Theft Auto V", "Counter-Strike 2"].map((name) => (
                <CategoryCard key={name} name={name} viewers="" />
              ))}
            </div>
          )}
        </section>
      </div>
    </MainLayout>
  );
}
