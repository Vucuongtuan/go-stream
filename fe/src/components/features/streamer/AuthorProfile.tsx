"use client";

import React, { useState, useRef, useCallback } from "react";
import Link from "next/link";
import { MainLayout } from "@/components/layouts";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/hooks/useAuth";
import { EditProfileModal } from "./EditProfileModal";
import { formatNumber } from "@/utils/format";

/* ─────────────────────────────────────────────
   Types
───────────────────────────────────────────── */
export type Category = { id: number; name: string; slug: string; };
export type Host = {
  id: number; name: string; slug: string;
  avatar?: string; role?: string; bio?: string;
  follower_count?: number; total_views?: number; created_at?: string;
  cover_url?: string;
};
export type Room = {
  id: number; host_id: number; title: string;
  description?: string; thumbnail?: string;
  status: "offline" | "live" | "ended";
  visibility: "public" | "private" | "unlisted";
  viewer_count: number; playback_url?: string;
  host: Host; category?: Category;
};

type AuthorProfileProps = { slug: string; };

/* ─────────────────────────────────────────────
   Main AuthorProfile component
───────────────────────────────────────────── */
export function AuthorProfile({ slug }: AuthorProfileProps) {
  const [activeTab, setActiveTab] = useState<"streams" | "about">("streams");
  const [showEditModal, setShowEditModal] = useState(false);
  const [localOverrides, setLocalOverrides] = useState<Partial<Host & { cover_url: string }>>({});
  const { user: currentUser } = useAuth();

  const { data: room, isLoading, error } = useQuery<Room>({
    queryKey: ["streamer-profile", slug],
    queryFn: () => apiClient.get<Room>(`/api/streamers/${slug}`),
    enabled: !!slug,
    retry: 1,
  });

  // Merge server data with any local optimistic overrides after save
  const host: Host | undefined = room?.host
    ? { ...room.host, ...localOverrides }
    : undefined;

  const coverUrl: string | null =
    (localOverrides.cover_url as string | undefined) ??
    (host as any)?.cover_url ??
    null;

  const hostName = host?.name ?? slug;
  const isCurrentlyLive = room?.status === "live";

  // Is the logged-in user the owner of this profile?
  const isOwner =
    !!currentUser &&
    !!host &&
    (currentUser.slug === slug || currentUser.id === host.id);

  /* ── Loading ── */
  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex h-[calc(100vh-8rem)] items-center justify-center">
          <div className="text-center space-y-4">
            <div className="h-10 w-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mx-auto" />
            <p className="text-sm text-zinc-400 font-medium animate-pulse">Đang tải trang cá nhân...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  /* ── Error / Not found ── */
  if (error || !room || !host) {
    return (
      <MainLayout>
        <div className="flex h-[calc(100vh-8rem)] items-center justify-center p-4">
          <div className="max-w-md w-full rounded-3xl border border-white/5 bg-zinc-900/40 backdrop-blur-2xl p-8 text-center shadow-2xl space-y-6">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-800 text-zinc-400">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">Không tìm thấy streamer</h2>
            <p className="text-sm leading-relaxed text-zinc-400">
              Trang cá nhân này không tồn tại hoặc đã bị xóa khỏi hệ thống.
            </p>
            <Link href="/" className="w-full inline-flex justify-center rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition-all hover:from-emerald-500 hover:to-teal-500">
              Quay lại trang chủ
            </Link>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="w-full mx-auto max-w-6xl pb-16">

        {/* ── Cover Banner ── */}
        <div className="relative h-44 md:h-60 w-full rounded-2xl overflow-hidden bg-gradient-to-tr from-emerald-950 via-zinc-950 to-teal-950 group">
          {/* Background blobs */}
          {!coverUrl && (
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute -top-20 -left-20 w-96 h-96 rounded-full bg-emerald-500/10 blur-[80px]" />
              <div className="absolute -bottom-10 right-10 w-72 h-72 rounded-full bg-teal-500/8 blur-[60px]" />
            </div>
          )}
          {/* Cover image */}
          {coverUrl && (
            <img src={coverUrl} alt="Cover" className="absolute inset-0 w-full h-full object-cover" />
          )}
          {/* Overlay for readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/60 via-transparent to-transparent" />

          {/* Owner: change cover button */}
          {isOwner && (
            <button
              onClick={() => setShowEditModal(true)}
              className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-xl bg-zinc-950/70 hover:bg-zinc-950/90 backdrop-blur border border-white/10 px-3 py-2 text-[11px] font-semibold text-zinc-300 hover:text-white transition-all cursor-pointer opacity-0 group-hover:opacity-100"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-3.5 h-3.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
              </svg>
              Đổi ảnh bìa
            </button>
          )}

          {/* Live badge */}
          {isCurrentlyLive && (
            <div className="absolute top-4 right-4 flex items-center gap-1.5 rounded-full bg-red-600 px-3 py-1.5 text-[10px] font-bold tracking-wider text-white shadow-lg border border-red-500/20">
              <span className="h-1.5 w-1.5 rounded-full bg-white animate-ping" />
              ĐANG LIVE
            </div>
          )}
        </div>

        {/* ── Profile Header ── */}
        <div className="relative px-4 md:px-6 -mt-14 mb-8">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4">

            {/* Avatar — owner: click to edit */}
            <div className="relative shrink-0 group/avatar">
              <div className="h-24 w-24 md:h-28 md:w-28 rounded-full bg-zinc-900 border-4 border-zinc-950 ring-2 ring-emerald-500/30 flex items-center justify-center text-emerald-400 text-4xl font-extrabold uppercase overflow-hidden shadow-2xl">
                {host.avatar ? (
                  <img src={host.avatar} alt={hostName} className="w-full h-full object-cover" />
                ) : (
                  hostName.charAt(0)
                )}
              </div>
              {isOwner && (
                <button
                  onClick={() => setShowEditModal(true)}
                  className="absolute inset-0 rounded-full bg-zinc-950/60 flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity cursor-pointer"
                  title="Đổi ảnh đại diện"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-6 h-6 text-white">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
                  </svg>
                </button>
              )}
              {isCurrentlyLive && (
                <span className="absolute bottom-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 ring-2 ring-zinc-950">
                  <span className="h-2 w-2 rounded-full bg-white animate-ping" />
                </span>
              )}
            </div>

            {/* Name + meta */}
            <div className="flex-1 min-w-0 pb-1">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
                  {hostName}
                </h1>
                {host.role === "admin" && (
                  <span className="rounded-full bg-red-500/10 border border-red-500/30 px-2 py-0.5 text-[10px] font-bold text-red-400 uppercase tracking-wider">Admin</span>
                )}
                <span className="rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Streamer</span>
                {isOwner && (
                  <span className="rounded-full bg-zinc-700/60 border border-zinc-600/40 px-2 py-0.5 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Bạn</span>
                )}
              </div>
              <p className="text-sm text-zinc-400">@{slug}</p>
              {host.bio && (
                <p className="mt-1.5 text-xs text-zinc-400 leading-relaxed max-w-md line-clamp-2">{host.bio}</p>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2 shrink-0">
              {isCurrentlyLive && (
                <Link
                  href={`/live/${slug}`}
                  className="flex items-center gap-1.5 rounded-xl bg-red-600 hover:bg-red-500 px-4 py-2.5 text-xs font-bold text-white shadow-lg transition-all border border-red-500/20"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-white animate-ping" />
                  Xem Live
                </Link>
              )}
              {isOwner ? (
                <button
                  onClick={() => setShowEditModal(true)}
                  className="flex items-center gap-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 px-4 py-2.5 text-xs font-bold text-zinc-300 hover:text-white transition-all border border-zinc-700/50 cursor-pointer"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-3.5 h-3.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                  </svg>
                  Chỉnh sửa
                </button>
              ) : (
                <button className="rounded-xl bg-emerald-600 hover:bg-emerald-500 px-5 py-2.5 text-xs font-bold text-white shadow-lg transition-all border border-emerald-500/20 cursor-pointer">
                  Theo dõi
                </button>
              )}
              <button className="rounded-xl bg-zinc-800 hover:bg-zinc-700 px-3 py-2.5 text-zinc-400 hover:text-white transition-all border border-zinc-700/50 cursor-pointer">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
                </svg>
              </button>
            </div>
          </div>

          {/* Stats row */}
          <div className="mt-5 flex flex-wrap gap-6">
            <div className="space-y-0.5 text-center">
              <p className="text-lg font-black text-white">{formatNumber(host.follower_count)}</p>
              <p className="text-[11px] text-zinc-500 font-medium">Người theo dõi</p>
            </div>
            <div className="space-y-0.5 text-center">
              <p className="text-lg font-black text-white">{formatNumber(host.total_views)}</p>
              <p className="text-[11px] text-zinc-500 font-medium">Lượt xem</p>
            </div>
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className="px-4 md:px-6 border-b border-zinc-800/60 mb-8">
          <div className="flex">
            {(["streams", "about"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`relative px-5 py-3 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  activeTab === tab ? "text-emerald-400" : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {tab === "streams" ? "Streams & Live" : "Giới thiệu"}
                {activeTab === tab && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500 rounded-full" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* ── Tab Content ── */}
        <div className="px-4 md:px-6">
          {activeTab === "streams" && (
            <div className="space-y-6">
              {isCurrentlyLive ? (
                <div className="space-y-3">
                  <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-400">
                    <span className="h-2 w-2 rounded-full bg-red-500 animate-ping" />
                    Đang phát trực tiếp
                  </h2>
                  <Link
                    href={`/live/${slug}`}
                    className="group flex flex-col sm:flex-row gap-4 rounded-2xl border border-red-500/20 bg-red-950/10 hover:bg-red-950/20 p-4 transition-all"
                  >
                    <div className="relative aspect-video sm:w-56 shrink-0 rounded-xl overflow-hidden bg-gradient-to-tr from-emerald-900 to-zinc-950 flex items-center justify-center">
                      {room.thumbnail ? (
                        <img src={room.thumbnail} alt={room.title} className="absolute inset-0 w-full h-full object-cover" />
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1" stroke="currentColor" className="w-12 h-12 text-emerald-500/30">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
                        </svg>
                      )}
                      <div className="absolute top-2 left-2 flex items-center gap-1 rounded bg-red-600 px-1.5 py-0.5 text-[9px] font-bold tracking-wider text-white">
                        <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                        LIVE
                      </div>
                      <div className="absolute bottom-2 right-2 rounded bg-black/70 px-1.5 py-0.5 text-[9px] text-zinc-300">
                        👁️ {formatNumber(room.viewer_count)}
                      </div>
                    </div>
                    <div className="flex flex-col justify-center space-y-2">
                      <h3 className="text-base font-bold text-white group-hover:text-emerald-300 transition-colors">{room.title}</h3>
                      {room.description && (
                        <p className="text-xs text-zinc-400 leading-relaxed line-clamp-2">{room.description}</p>
                      )}
                      {room.category && (
                        <span className="self-start rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-[10px] font-medium text-emerald-400">
                          📂 {room.category.name}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1.5 text-xs text-red-400 font-bold">
                        <span className="h-1.5 w-1.5 rounded-full bg-red-400 animate-ping" />
                        Nhấn để xem ngay →
                      </span>
                    </div>
                  </Link>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-24 text-zinc-500 gap-4">
                  <div className="h-16 w-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-8 h-8 text-zinc-700">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
                    </svg>
                  </div>
                  <div className="text-center space-y-1">
                    <p className="text-sm font-semibold text-zinc-400">Kênh hiện đang ngoại tuyến</p>
                    <p className="text-xs text-zinc-600">
                      {isOwner
                        ? "Bắt đầu stream để xuất hiện ở đây."
                        : `Theo dõi để nhận thông báo khi ${hostName} bắt đầu stream tiếp theo.`}
                    </p>
                  </div>
                  {isOwner && (
                    <Link
                      href="/streamer"
                      className="flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-5 py-2.5 text-xs font-bold text-white transition-all"
                    >
                      🎙️ Bắt đầu stream ngay
                    </Link>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === "about" && (
            <div className="max-w-2xl space-y-6">
              <div className="rounded-2xl border border-white/5 bg-zinc-900/30 p-6 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Giới thiệu</h3>
                  {isOwner && (
                    <button
                      onClick={() => setShowEditModal(true)}
                      className="text-[10px] font-semibold text-zinc-500 hover:text-emerald-400 transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-3.5 h-3.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z" />
                      </svg>
                      Chỉnh sửa
                    </button>
                  )}
                </div>
                <p className="text-sm text-zinc-300 leading-relaxed">
                  {host.bio || (isOwner ? "Bạn chưa cập nhật giới thiệu. Nhấn \"Chỉnh sửa\" để thêm." : "Streamer này chưa cập nhật thông tin giới thiệu.")}
                </p>
              </div>

              <div className="rounded-2xl border border-white/5 bg-zinc-900/30 p-6 space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Thông tin</h3>
                <div className="space-y-3">
                  {[
                    { icon: "M17.982 18.725A7.488 7.488 0 0 0 12 15.75a7.488 7.488 0 0 0-5.982 2.975m11.963 0a9 9 0 1 0-11.963 0m11.963 0A8.966 8.966 0 0 1 12 21a8.966 8.966 0 0 1-5.982-2.275M15 9.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z", label: "Tên", value: hostName },
                    { icon: "M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244", label: "Slug", value: `@${slug}`, mono: true, emerald: true },
                  ].map((row) => (
                    <div key={row.label} className="flex items-center gap-3">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4 text-zinc-500 shrink-0">
                        <path strokeLinecap="round" strokeLinejoin="round" d={row.icon} />
                      </svg>
                      <span className="text-zinc-400 text-xs">{row.label}:</span>
                      <span className={`text-xs ${row.mono ? "font-mono" : "font-medium"} ${row.emerald ? "text-emerald-400" : "text-zinc-200"}`}>{row.value}</span>
                    </div>
                  ))}
                  {host.created_at && (
                    <div className="flex items-center gap-3">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4 text-zinc-500 shrink-0">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
                      </svg>
                      <span className="text-zinc-400 text-xs">Tham gia:</span>
                      <span className="text-zinc-200 text-xs font-medium">
                        {new Date(host.created_at).toLocaleDateString("vi-VN", { year: "numeric", month: "long", day: "numeric" })}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Người theo dõi", value: formatNumber(host.follower_count), icon: "👥" },
                  { label: "Tổng lượt xem", value: formatNumber(host.total_views), icon: "👁️" },
                ].map((s) => (
                  <div key={s.label} className="flex flex-col items-center gap-1.5 rounded-2xl border border-white/5 bg-zinc-900/40 p-4">
                    <span className="text-xl">{s.icon}</span>
                    <span className="text-lg font-black text-white">{s.value}</span>
                    <span className="text-[10px] text-zinc-500 text-center font-medium">{s.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Edit Profile Modal ── */}
      {showEditModal && (
        <EditProfileModal
          host={host}
          coverUrl={coverUrl}
          slug={slug}
          onClose={() => setShowEditModal(false)}
          onSaved={(updated) => {
            setLocalOverrides((prev) => ({ ...prev, ...updated }));
          }}
        />
      )}
    </MainLayout>
  );
}
