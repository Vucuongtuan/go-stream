"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { MainLayout } from "@/components/layouts";
import { useAuth } from "@/hooks/useAuth";
import { apiClient } from "@/lib/api-client";
import Link from "next/link";

interface Tag {
  id: number;
  name: string;
  slug: string;
}

interface Category {
  id: number;
  name: string;
  slug: string;
}

interface User {
  id: number;
  name: string;
  email?: string;
  avatar?: string;
  role?: string;
}

interface Room {
  id: number;
  host_id: number;
  category_id?: number;
  game_id?: number;
  title: string;
  description?: string;
  status: "offline" | "live" | "ended";
  visibility: "public" | "private" | "unlisted";
  playback_url?: string;
  viewer_count: number;
  started_at?: string;
  host: User;
  category?: Category;
  tags?: Tag[];
}

interface ChatMessage {
  id: string;
  room_id: number;
  user_id: number;
  user_name: string;
  avatar?: string;
  content: string;
  type: string;
  created_at: string;
}

export default function PublicStreamPage() {
  const { slug } = useParams();
  const { user: currentUser, isAuthenticated } = useAuth();
  
  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatSending, setChatSending] = useState(false);

  const sseRef = useRef<EventSource | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // 1.5 Load HLS live video using hls.js on client-side
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !room || !room.playback_url || room.status !== "live") return;

    let hls: any;
    
    // Dynamic import to avoid SSR errors
    import("hls.js").then(({ default: Hls }) => {
      if (Hls.isSupported()) {
        hls = new Hls({
          maxBufferSize: 0,
          maxBufferLength: 4,
          liveSyncDuration: 2,
          enableWorker: true
        });
        hls.loadSource(room.playback_url!);
        hls.attachMedia(video);
        
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          video.play().catch((err) => {
            console.log("Autoplay prevented:", err);
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
        video.src = room.playback_url!;
        video.addEventListener("loadedmetadata", () => {
          video.play().catch((err) => {
            console.log("Autoplay prevented:", err);
          });
        });
      }
    });

    return () => {
      if (hls) {
        hls.destroy();
      }
    };
  }, [room?.playback_url, room?.status]);

  // 1. Fetch Room & User Info by Slug
  useEffect(() => {
    if (!slug) return;

    const fetchRoomBySlug = async () => {
      setLoading(true);
      setError(null);
      try {
        const roomData = await apiClient.get<Room>(`/api/streamers/${slug}`);
        if (roomData) {
          setRoom(roomData);
        } else {
          setError("Kênh phát sóng này không tồn tại.");
        }
      } catch (err: any) {
        setError(err.message || "Không thể tải thông tin kênh phát sóng.");
      } finally {
        setLoading(false);
      }
    };

    fetchRoomBySlug();
  }, [slug]);

  // 2. Connect to SSE Chat
  useEffect(() => {
    if (!room) return;

    // Connect to SSE chat feed
    const sseUrl = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"}/api/rooms/${room.id}/chat/stream`;
    const source = new EventSource(sseUrl);
    sseRef.current = source;

    source.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        setChatMessages((prev) => [...prev.slice(-99), msg]); // Keep last 100
      } catch (err) {
        console.error("Lỗi parse tin nhắn chat:", err);
      }
    };

    source.onerror = () => {
      console.warn("SSE Chat bị mất kết nối, đang thử lại...");
    };

    // Prepopulate system greeting
    setChatMessages([
      {
        id: "sys-1",
        room_id: room.id,
        user_id: 0,
        user_name: "Hệ thống",
        content: `Chào mừng bạn đến với kênh của ${room.host.name}! Hãy bình luận văn minh và lịch sự.`,
        type: "text",
        created_at: new Date().toISOString()
      }
    ]);

    return () => {
      source.close();
    };
  }, [room?.id]);

  // Scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // 3. Send Chat Message
  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !room || !isAuthenticated) return;

    const text = chatInput;
    setChatInput("");
    setChatSending(true);

    try {
      await apiClient.post(`/api/rooms/${room.id}/chat`, {
        content: text,
        type: "text"
      });
    } catch (err: any) {
      console.error("Lỗi gửi chat:", err);
    } finally {
      setChatSending(false);
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex h-[calc(100vh-8rem)] items-center justify-center">
          <div className="text-center space-y-4">
            <div className="h-10 w-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mx-auto" />
            <p className="text-sm text-zinc-400 font-medium animate-pulse">Đang kết nối tới kênh...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (error || !room) {
    return (
      <MainLayout>
        <div className="flex h-[calc(100vh-8rem)] items-center justify-center p-4">
          <div className="max-w-md w-full rounded-3xl border border-white/5 bg-zinc-900/40 backdrop-blur-2xl p-8 text-center shadow-2xl space-y-6">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-800 text-zinc-400">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">Không tìm thấy kênh</h2>
            <p className="text-sm leading-relaxed text-zinc-400">
              {error || "Kênh phát sóng này hiện không tồn tại hoặc đã bị gỡ bỏ khỏi hệ thống."}
            </p>
            <Link
              href="/"
              className="w-full inline-flex justify-center rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition-all hover:from-emerald-500 hover:to-teal-500 cursor-pointer"
            >
              Quay lại trang chủ
            </Link>
          </div>
        </div>
      </MainLayout>
    );
  }

  const isLive = room.status === "live";

  return (
    <MainLayout>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start h-[calc(100vh-6rem)] overflow-hidden">
        
        {/* LEFT COLUMN: Player & Room details (8 cols) */}
        <div className="lg:col-span-8 flex flex-col h-full overflow-y-auto pr-1 space-y-5 pb-6 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
          
          {/* Stream Player Viewport */}
          <div className="relative aspect-video w-full rounded-2xl bg-zinc-950 border border-white/5 overflow-hidden flex items-center justify-center shadow-2xl group">
            {isLive ? (
              // Live video or premium mockup
              <div className="w-full h-full relative">
                {room.playback_url ? (
                  <video
                    ref={videoRef}
                    controls
                    autoPlay
                    muted
                    playsInline
                    className="w-full h-full object-cover"
                  />
                ) : (
                  // Premium high-fidelity simulated streaming canvas with cool gradients
                  <div className="w-full h-full bg-gradient-to-tr from-emerald-950 via-zinc-950 to-teal-950 flex flex-col items-center justify-center relative select-none">
                    {/* Glowing logo / avatar backdrop */}
                    <div className="absolute inset-0 pointer-events-none opacity-20">
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full bg-emerald-500 blur-[80px]" />
                    </div>

                    <div className="relative z-10 flex flex-col items-center gap-4 text-center">
                      <div className="h-16 w-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 text-3xl font-extrabold uppercase ring-4 ring-emerald-500/10">
                        {room.host.name.charAt(0)}
                      </div>
                      <div className="space-y-1">
                        <span className="inline-flex items-center rounded-full bg-emerald-500 px-2.5 py-0.5 text-[10px] font-bold text-black tracking-wider uppercase animate-pulse">
                          LIVE
                        </span>
                        <h2 className="text-base font-bold text-white mt-1">Đang kết nối luồng Live Stream...</h2>
                        <p className="text-xs text-zinc-400">Trình phát HLS/WebRTC đang tải gói truyền hình trực tiếp.</p>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Live indicators */}
                <div className="absolute top-4 left-4 flex items-center gap-1.5 rounded-full bg-red-600 px-3 py-1 text-[10px] font-bold tracking-wider text-white shadow-md border border-red-500/10">
                  <span className="h-1.5 w-1.5 rounded-full bg-white animate-ping" />
                  TRỰC TIẾP
                </div>

                <div className="absolute top-4 right-4 rounded-full bg-zinc-950/80 backdrop-blur px-3 py-1 text-[10px] font-bold text-zinc-300 border border-white/5">
                  👁️ {room.viewer_count || 124} người xem
                </div>
              </div>
            ) : (
              // Stream offline page
              <div className="w-full h-full bg-gradient-to-br from-zinc-900 via-zinc-950 to-zinc-950 flex flex-col items-center justify-center p-6 text-center select-none relative overflow-hidden">
                <div className="absolute inset-0 pointer-events-none opacity-30">
                  <div className="absolute -top-32 -right-32 w-72 h-72 rounded-full bg-emerald-500/5 blur-[90px]" />
                </div>

                <div className="relative z-10 space-y-4 max-w-sm">
                  {/* Glowing offline avatar */}
                  <div className="mx-auto h-20 w-20 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 text-4xl font-extrabold uppercase relative">
                    {room.host.name.charAt(0)}
                    <span className="absolute bottom-0 right-0 h-4 w-4 rounded-full bg-zinc-700 ring-4 ring-zinc-950" />
                  </div>

                  <div className="space-y-1.5">
                    <span className="inline-flex items-center rounded-full bg-zinc-800 border border-zinc-700/50 px-2.5 py-0.5 text-[9px] font-bold text-zinc-400 tracking-wider uppercase">
                      NGOẠI TUYẾN
                    </span>
                    <h3 className="text-base font-bold text-white mt-1">Kênh hiện đang ngoại tuyến</h3>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      Theo dõi kênh của **{room.host.name}** để nhận thông báo ngay lập tức khi streamer bắt đầu phiên live tiếp theo!
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Streamer Profile and Channel details */}
          <div className="flex gap-4 items-start rounded-3xl border border-white/5 bg-zinc-900/30 backdrop-blur-xl p-6 text-left shadow-xl relative overflow-hidden">
            {/* Streamer Avatar */}
            <div className="h-12 w-12 shrink-0 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-emerald-400 font-extrabold text-lg ring-2 ring-emerald-500/10 uppercase">
              {room.host.name.charAt(0)}
            </div>

            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="space-y-0.5">
                  <h2 className="text-base font-bold text-white truncate flex items-center gap-1.5">
                    {room.host.name}
                    {room.host.role === "admin" && (
                      <span className="text-[8px] font-bold px-1.5 py-0.2 rounded bg-red-500/10 text-red-400 uppercase tracking-wider">Admin</span>
                    )}
                    <span className="text-[8px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 uppercase tracking-wider">Streamer</span>
                  </h2>
                  <p className="text-[11px] text-zinc-400">@{slug}</p>
                </div>

                <button className="rounded-xl bg-emerald-600 hover:bg-emerald-500 px-4 py-2 text-xs font-bold text-white shadow-lg transition-all cursor-pointer">
                  Theo dõi
                </button>
              </div>

              {/* Stream Title */}
              <h1 className="text-lg font-bold text-white tracking-tight leading-snug pt-1">
                {room.title}
              </h1>

              {/* Description & metadata */}
              {room.description && (
                <p className="text-xs text-zinc-300 leading-relaxed pt-1">
                  {room.description}
                </p>
              )}

              {/* Tags & Categories */}
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-zinc-800/60">
                {room.category && (
                  <span className="inline-flex items-center rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-[10px] font-medium text-emerald-400">
                    📂 {room.category.name}
                  </span>
                )}
                {room.tags && room.tags.map((t) => (
                  <span key={t.id} className="inline-flex items-center rounded-full bg-zinc-800/80 border border-zinc-700/50 px-2.5 py-0.5 text-[10px] font-medium text-zinc-400">
                    #{t.name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Live Chat Feed Sidebar (4 cols) */}
        <div className="lg:col-span-4 flex flex-col h-full rounded-2xl border border-white/5 bg-zinc-900/20 backdrop-blur-xl overflow-hidden shadow-2xl">
          {/* Chat Header */}
          <div className="bg-zinc-900/80 border-b border-zinc-800 px-4 py-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Trò chuyện trực tiếp</h3>
            </div>
          </div>

          {/* Chat message listing */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
            {chatMessages.map((msg) => {
              const isSystem = msg.user_id === 0;
              const isHost = msg.user_id === room.host_id;

              return (
                <div key={msg.id} className={`flex flex-col gap-0.5 text-left ${isSystem ? "items-center opacity-70" : ""}`}>
                  {!isSystem && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-bold text-zinc-200">{msg.user_name}</span>
                      {isHost && (
                        <span className="text-[8px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 uppercase">Chủ phòng</span>
                      )}
                    </div>
                  )}
                  <div className={`text-xs ${isSystem ? "bg-zinc-800/40 px-3 py-1 rounded-full text-zinc-400" : "text-zinc-300 bg-zinc-950/20 p-2.5 rounded-xl border border-white/5"}`}>
                    {msg.content}
                  </div>
                </div>
              );
            })}
            <div ref={chatEndRef} />
          </div>

          {/* Chat input form */}
          {isAuthenticated ? (
            <form onSubmit={handleSendChat} className="p-3 bg-zinc-950/80 border-t border-zinc-800 flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Gửi tin nhắn chat..."
                className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                disabled={chatSending}
              />
              <button
                type="submit"
                disabled={chatSending}
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Gửi
              </button>
            </form>
          ) : (
            <div className="p-4 bg-zinc-950/90 border-t border-zinc-800 text-center space-y-2">
              <p className="text-[11px] text-zinc-400 font-medium">Bạn cần đăng nhập để tham gia trò chuyện</p>
              <Link
                href="/login"
                className="w-full inline-flex justify-center rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 py-2 text-xs font-bold text-white shadow transition-all cursor-pointer"
              >
                Đăng nhập ngay
              </Link>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
