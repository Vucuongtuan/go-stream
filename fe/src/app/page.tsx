"use client";

import React from "react";
import Link from "next/link";
import { MainLayout } from "@/components/layouts";

interface StreamCardProps {
  title: string;
  streamer: string;
  category: string;
  viewers: string;
  avatarChar: string;
  gradientFrom: string;
  gradientTo: string;
}

function StreamCard({
  title,
  streamer,
  category,
  viewers,
  avatarChar,
  gradientFrom,
  gradientTo,
}: StreamCardProps) {
  return (
    <div className="group relative flex flex-col rounded-2xl border border-white/5 bg-zinc-900/40 backdrop-blur-xl overflow-hidden hover:border-emerald-500/30 hover:bg-zinc-900/80 transition-all duration-300 shadow-lg hover:shadow-emerald-500/5 cursor-pointer">
      {/* Stream Thumbnail Box */}
      <div className="relative aspect-video w-full bg-zinc-950 flex items-center justify-center overflow-hidden">
        {/* Decorative dynamic gradient bg representing stream */}
        <div
          className={`absolute inset-0 opacity-40 group-hover:opacity-60 transition-opacity duration-300 bg-gradient-to-tr ${gradientFrom} ${gradientTo}`}
        />

        {/* Streaming Logo / Play icon */}
        <div className="relative z-10 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-900/90 border border-white/10 group-hover:scale-110 group-hover:border-emerald-500/40 group-hover:text-emerald-400 transition-all duration-300 text-zinc-400">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="h-5 w-5 ml-0.5"
          >
            <path d="M8 5.14v14l11-7-11-7z" />
          </svg>
        </div>

        {/* Live Badge & Viewers count */}
        <div className="absolute top-3 left-3 flex items-center gap-1.5 rounded bg-zinc-950/80 backdrop-blur px-2 py-0.8 text-[10px] font-bold tracking-wider text-emerald-400 border border-emerald-500/20">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          TRỰC TIẾP
        </div>

        <div className="absolute bottom-3 right-3 rounded bg-zinc-950/80 backdrop-blur px-2 py-0.8 text-[10px] font-semibold text-zinc-300">
          {viewers} người xem
        </div>
      </div>

      {/* Streamer Detail Info */}
      <div className="flex gap-3 p-4">
        {/* Streamer Avatar */}
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-800 border border-zinc-700 text-sm font-bold text-emerald-400 uppercase ring-2 ring-emerald-500/10 group-hover:ring-emerald-500/20 transition-all">
          {avatarChar}
        </div>

        {/* Text Details */}
        <div className="flex-1 min-w-0 text-left">
          <h3 className="text-sm font-semibold text-white group-hover:text-emerald-400 transition-colors truncate">
            {title}
          </h3>
          <p className="mt-1 text-xs font-medium text-zinc-300 truncate">
            {streamer}
          </p>
          <span className="mt-2 inline-block rounded-full bg-zinc-800/80 border border-zinc-700/50 px-2.5 py-0.5 text-[10px] font-medium text-zinc-400">
            {category}
          </span>
        </div>
      </div>
    </div>
  );
}

interface CategoryCardProps {
  name: string;
  viewers: string;
  gradient: string;
}

function CategoryCard({ name, viewers, gradient }: CategoryCardProps) {
  return (
    <div className="group relative flex flex-col rounded-2xl border border-white/5 bg-zinc-900/40 p-5 hover:border-emerald-500/30 hover:bg-zinc-900/80 transition-all duration-300 overflow-hidden cursor-pointer">
      <div
        className={`absolute -top-12 -right-12 h-32 w-32 rounded-full bg-gradient-to-tr ${gradient} blur-3xl opacity-10 group-hover:opacity-25 transition-opacity duration-300`}
      />
      <span className="text-xs font-bold text-emerald-400 tracking-wider uppercase mb-1.5">
        Trò chơi
      </span>
      <h4 className="text-base font-bold text-white group-hover:text-emerald-300 transition-colors">
        {name}
      </h4>
      <p className="mt-2 text-xs font-medium text-zinc-400">{viewers} người xem</p>
    </div>
  );
}

export default function HomePage() {
  return (
    <MainLayout>
      <div className="space-y-10 pb-16">
        {/* Banner Section / Featured Hero */}
        <section className="relative rounded-3xl border border-white/5 bg-zinc-900/30 backdrop-blur-xl p-6 sm:p-8 lg:p-10 overflow-hidden shadow-2xl">
          {/* Radial Neon background aura */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-emerald-600/10 blur-[100px]" />
            <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-teal-600/10 blur-[100px]" />
          </div>

          <div className="relative z-10 flex flex-col gap-8 lg:flex-row lg:items-center">
            {/* Mock Video Stream frame */}
            <div className="relative aspect-video w-full lg:w-[480px] shrink-0 rounded-2xl overflow-hidden bg-zinc-950 shadow-lg border border-white/5 group cursor-pointer flex items-center justify-center">
              <div className="absolute inset-0 bg-gradient-to-tr from-emerald-950 via-zinc-950 to-teal-950 opacity-80" />
              <div className="relative z-10 flex h-16 w-16 items-center justify-center rounded-full bg-zinc-900/90 border border-emerald-500/30 text-emerald-400 group-hover:scale-115 group-hover:bg-emerald-500 group-hover:text-white transition-all duration-300">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="h-6 w-6 ml-0.5"
                >
                  <path d="M8 5.14v14l11-7-11-7z" />
                </svg>
              </div>

              {/* LIVE indicator */}
              <div className="absolute top-4 left-4 flex items-center gap-1.5 rounded-full bg-zinc-950/80 px-3 py-1 text-[10px] font-bold tracking-wider text-emerald-400 border border-emerald-500/20 shadow-md">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                ĐANG PHÁT TRỰC TIẾP
              </div>
            </div>

            {/* Banner Text description */}
            <div className="flex-1 text-left space-y-4">
              <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400 border border-emerald-500/20">
                Kênh nổi bật hôm nay
              </span>
              <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                [VCS 2026 Mùa Xuân] Trận Chung Kết Tổng: GAM vs VKE - Ai là nhà vô địch?
              </h2>
              <p className="text-sm leading-relaxed text-zinc-300 max-w-xl">
                Giải đấu Liên Minh Huyền Thoại lớn nhất Việt Nam đã đi tới chặng cuối cùng. Hãy cùng xem ai sẽ giành được chiếc cúp vô địch và đại diện Việt Nam tham gia giải đấu thế giới!
              </p>

              <div className="flex flex-wrap items-center gap-4 pt-2">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-bold text-emerald-400">
                    V
                  </div>
                  <span className="text-sm font-semibold text-zinc-200">VCS LMHT</span>
                </div>
                <div className="h-1.5 w-1.5 rounded-full bg-zinc-700" />
                <span className="text-xs font-medium text-zinc-400">Liên Minh Huyền Thoại</span>
                <div className="h-1.5 w-1.5 rounded-full bg-zinc-700" />
                <span className="text-xs font-semibold text-emerald-400">82,450 người xem</span>
              </div>

              <div className="pt-4">
                <button className="rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg transition-all duration-200 hover:from-emerald-500 hover:to-teal-500 hover:shadow-emerald-600/15 cursor-pointer">
                  Xem ngay
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Section 2: Active streams grid */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2.5">
              <span className="h-4 w-1 rounded bg-emerald-500" />
              Các kênh nổi bật đang trực tiếp
            </h2>
            <Link
              href="/browse"
              className="text-xs font-bold text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              Xem tất cả &rarr;
            </Link>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <StreamCard
              title="GTA V Roleplay | Thành Phố MixiCity Mùa 5 | Cảnh sát bắt cướp!"
              streamer="MixiGaming"
              category="GTA V"
              viewers="125,430"
              avatarChar="M"
              gradientFrom="from-emerald-600"
              gradientTo="to-indigo-900"
            />
            <StreamCard
              title="[RANK HÀN] Leo Rank Thách Đấu - Tryhard cùng đồng đội"
              streamer="SofM"
              category="League of Legends"
              viewers="34,510"
              avatarChar="S"
              gradientFrom="from-teal-600"
              gradientTo="to-violet-950"
            />
            <StreamCard
              title="Đại chiến CS2 Matchmaking - Cùng tryhard lên 25k Elo"
              streamer="Bomman"
              category="CS2"
              viewers="18,920"
              avatarChar="B"
              gradientFrom="from-cyan-600"
              gradientTo="to-slate-900"
            />
            <StreamCard
              title="Chuyên mục Just Chatting & Cafe Sáng cùng anh em"
              streamer="PewPew"
              category="Just Chatting"
              viewers="8,700"
              avatarChar="P"
              gradientFrom="from-green-600"
              gradientTo="to-emerald-950"
            />
          </div>
        </section>

        {/* Section 3: Categories grid */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2.5">
              <span className="h-4 w-1 rounded bg-emerald-500" />
              Thể loại trò chơi hàng đầu
            </h2>
            <Link
              href="/categories"
              className="text-xs font-bold text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              Xem thêm &rarr;
            </Link>
          </div>

          <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
            <CategoryCard
              name="League of Legends"
              viewers="412.5K"
              gradient="from-emerald-500 to-green-600"
            />
            <CategoryCard
              name="Just Chatting"
              viewers="285.3K"
              gradient="from-teal-500 to-cyan-600"
            />
            <CategoryCard
              name="Grand Theft Auto V"
              viewers="192.4K"
              gradient="from-green-500 to-emerald-600"
            />
            <CategoryCard
              name="Counter-Strike 2"
              viewers="145.1K"
              gradient="from-emerald-400 to-teal-500"
            />
          </div>
        </section>
      </div>
    </MainLayout>
  );
}
