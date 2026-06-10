"use client";

import React, { useState, useEffect, useRef } from "react";
import { MainLayout } from "@/components/layouts";
import { useAuth } from "@/hooks/useAuth";
import { apiClient } from "@/lib/api-client";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/store/authStore";
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize, 
  Minimize, 
  Settings, 
  Check,
  RefreshCw,
  Tv
} from "lucide-react";

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

interface PublicStreamProps {
  slug: string;
}

export function PublicStream({ slug }: PublicStreamProps) {
  const { user: currentUser, isAuthenticated } = useAuth();
  const { openAuthModal } = useAuthStore();
  
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatSending, setChatSending] = useState(false);
  const [viewerSessionId, setViewerSessionId] = useState<string>("");

  const sseRef = useRef<EventSource | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const playerContainerRef = useRef<HTMLDivElement | null>(null);
  const hlsRef = useRef<any>(null);

  // Custom Video Player States
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true); // Default muted to support autoplay
  const [volume, setVolume] = useState(0.8);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [resolutions, setResolutions] = useState<{ index: number; label: string }[]>([]);
  const [currentResolution, setCurrentResolution] = useState<number>(-1); // -1 is Auto
  const [showResMenu, setShowResMenu] = useState(false);
  const [isStreamLoading, setIsStreamLoading] = useState(true);
  const [actualHeight, setActualHeight] = useState<string>("Auto");

  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Fetch Room & User Info by Slug using TanStack Query
  const { data: room, error: queryError, isLoading: loading } = useQuery<Room>({
    queryKey: ["room", slug],
    queryFn: () => apiClient.get<Room>(`/api/streamers/${slug}`),
    enabled: !!slug,
    retry: 1,
  });

  // 1.5 Load HLS live video using hls.js on client-side
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !room || !room.playback_url || room.status !== "live") return;

    setIsStreamLoading(true);
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
        hlsRef.current = hls;

        hls.loadSource(room.playback_url!);
        hls.attachMedia(video);
        
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          setIsStreamLoading(false);
          // Parse resolutions
          const levels = hls.levels.map((level: any, index: number) => ({
            index,
            label: level.height ? `${level.height}p` : `${Math.round(level.bitrate / 1000)}k`,
          }));
          setResolutions([{ index: -1, label: "Tự động (Auto)" }, ...levels]);

          video.play()
            .then(() => setIsPlaying(true))
            .catch((err) => {
              console.log("Autoplay prevented:", err);
              setIsPlaying(false);
            });
        });

        // Track active level switches (especially when in Auto mode)
        hls.on(Hls.Events.LEVEL_SWITCHED, (event: any, data: any) => {
          if (hls.currentLevel === -1) {
            const levelHeight = hls.levels[data.level]?.height;
            setActualHeight(levelHeight ? `${levelHeight}p` : "Auto");
          } else {
            setActualHeight("");
          }
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
        // Native HLS (Safari)
        video.src = room.playback_url!;
        video.addEventListener("loadedmetadata", () => {
          setIsStreamLoading(false);
          video.play()
            .then(() => setIsPlaying(true))
            .catch((err) => {
              console.log("Autoplay prevented:", err);
              setIsPlaying(false);
            });
        });
      }
    });

    return () => {
      if (hls) {
        hls.destroy();
        hlsRef.current = null;
      }
    };
  }, [room?.playback_url, room?.status]);

  // Guest limit: if not logged in and stream is live, show non-closeable login modal after 15 seconds
  useEffect(() => {
    if (isAuthenticated || !room || room.status !== "live") return;

    const timer = setTimeout(() => {
      if (videoRef.current) {
        try {
          videoRef.current.pause();
          setIsPlaying(false);
        } catch (err) {
          console.error("Failed to pause video:", err);
        }
      }
      openAuthModal("login", false);
    }, 15000);

    return () => clearTimeout(timer);
  }, [isAuthenticated, room?.status, openAuthModal]);

  // 1.2 Generate or retrieve viewer session ID
  useEffect(() => {
    let sessionId = sessionStorage.getItem("viewer_session_id");
    if (!sessionId) {
      sessionId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2) + Date.now().toString(36);
      sessionStorage.setItem("viewer_session_id", sessionId);
    }
    setViewerSessionId(sessionId);
  }, []);

  // 1.3 Heartbeat viewer count update via Redis
  const { data: heartbeatData } = useQuery<{ viewer_count: number }>({
    queryKey: ["heartbeat", room?.id, viewerSessionId],
    queryFn: () =>
      apiClient.post<{ viewer_count: number }>(`/api/rooms/${room?.id}/heartbeat`, {
        viewer_session_id: viewerSessionId,
      }),
    enabled: !!room && room.status === "live" && !!viewerSessionId,
    refetchInterval: 15000,
    refetchIntervalInBackground: true,
  });

  const error = queryError ? (queryError as Error).message : null;
  const activeViewerCount = heartbeatData?.viewer_count ?? room?.viewer_count ?? 0;

  // 2. Connect to SSE Chat
  useEffect(() => {
    if (!room) return;

    const sseUrl = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"}/api/rooms/${room.id}/chat/stream`;
    const source = new EventSource(sseUrl);
    sseRef.current = source;

    source.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        setChatMessages((prev) => [...prev.slice(-99), msg]);
      } catch (err) {
        console.error("Lỗi parse tin nhắn chat:", err);
      }
    };

    source.onerror = () => {
      console.warn("SSE Chat bị mất kết nối, đang thử lại...");
    };

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

  // Custom Video Player Controls Handlers
  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (isPlaying) {
      video.pause();
      setIsPlaying(false);
    } else {
      video.play().catch(err => console.log(err));
      setIsPlaying(true);
    }
    resetControlsTimer();
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !isMuted;
    setIsMuted(!isMuted);
    if (isMuted && volume === 0) {
      setVolume(0.5);
      video.volume = 0.5;
    }
    resetControlsTimer();
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    const video = videoRef.current;
    if (!video) return;
    video.volume = v;
    setVolume(v);
    if (v === 0) {
      video.muted = true;
      setIsMuted(true);
    } else {
      video.muted = false;
      setIsMuted(false);
    }
    resetControlsTimer();
  };

  const toggleFullscreen = () => {
    const container = playerContainerRef.current;
    if (!container) return;

    if (!document.fullscreenElement) {
      container.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch(err => console.error(err));
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      }).catch(err => console.error(err));
    }
    resetControlsTimer();
  };

  // Monitor fullscreen change events
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const selectResolution = (index: number) => {
    if (hlsRef.current) {
      hlsRef.current.currentLevel = index;
      setCurrentResolution(index);
      setShowResMenu(false);
      
      // Flash loading indicator briefly for visual response
      setIsStreamLoading(true);
      setTimeout(() => setIsStreamLoading(false), 300);
    }
    resetControlsTimer();
  };

  const resetControlsTimer = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying && !showResMenu) {
        setShowControls(false);
      }
    }, 3500);
  };

  const handleMouseMove = () => {
    resetControlsTimer();
  };

  const handleMouseLeave = () => {
    if (isPlaying) {
      setShowControls(false);
      setShowResMenu(false);
    }
  };

  useEffect(() => {
    resetControlsTimer();
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, [isPlaying]);

  const handleRefreshStream = () => {
    if (hlsRef.current && room?.playback_url) {
      setIsStreamLoading(true);
      hlsRef.current.loadSource(room.playback_url);
      hlsRef.current.startLoad();
      setTimeout(() => setIsStreamLoading(false), 500);
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex h-[calc(100vh-8rem)] items-center justify-center">
          <div className="text-center space-y-4">
            <div className="h-10 w-10 border-4 border-neon-primary/20 border-t-neon-primary rounded-full animate-spin mx-auto" />
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
          <div className="max-w-md w-full rounded-3xl border border-white/5 bg-zinc-950/40 backdrop-blur-2xl p-8 text-center shadow-2xl space-y-6">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-900 border border-zinc-800 text-zinc-450 shadow-neon-primary/10">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight uppercase">Không tìm thấy kênh</h2>
            <p className="text-sm leading-relaxed text-zinc-450 dark:text-zinc-500">
              {error || "Kênh phát sóng này hiện không tồn tại hoặc đã bị gỡ bỏ khỏi hệ thống."}
            </p>
            <Link
              href="/"
              className="w-full inline-flex justify-center rounded-xl bg-gradient-to-r from-neon-primary to-neon-secondary px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-neon-primary/20 hover:shadow-neon-primary/30 transition-all cursor-pointer"
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
          
          {/* Stream Player Viewport Container */}
          <div 
            ref={playerContainerRef}
            className="relative aspect-video w-full rounded-2xl bg-black border border-white/5 overflow-hidden flex items-center justify-center shadow-2xl group/player select-none"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
            {isLive ? (
              <div className="w-full h-full relative">
                {room.playback_url ? (
                  <>
                    <video
                      ref={videoRef}
                      autoPlay
                      muted={isMuted}
                      playsInline
                      className="w-full h-full object-contain bg-black"
                      onClick={togglePlay}
                    />

                    {/* Loader Spinner Overlay */}
                    {isStreamLoading && (
                      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-30">
                        <div className="h-10 w-10 border-4 border-neon-primary/20 border-t-neon-primary rounded-full animate-spin" />
                      </div>
                    )}

                    {/* CUSTOM PLAYER OVERLAY CONTROLS */}
                    <div 
                      className={`absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/35 flex flex-col justify-between p-4.5 z-20 transition-opacity duration-300 ${
                        showControls ? "opacity-100" : "opacity-0 pointer-events-none"
                      }`}
                    >
                      {/* Top Bar: LIVE info */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="flex items-center gap-1.5 rounded-full bg-rose-600 px-3 py-1 text-[9px] font-black tracking-widest text-white shadow-[0_0_10px_rgba(225,29,72,0.45)]">
                            <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                            LIVE
                          </span>
                          <span className="text-xs font-bold text-zinc-350 drop-shadow">
                            {room.host.name}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button 
                            onClick={handleRefreshStream}
                            className="p-1.5 rounded-lg bg-zinc-950/60 hover:bg-zinc-900 border border-white/5 text-zinc-450 hover:text-white transition-all cursor-pointer"
                            title="Tải lại luồng stream"
                          >
                            <RefreshCw className="h-3.5 w-3.5" />
                          </button>
                          <span className="rounded-lg bg-zinc-950/70 backdrop-blur-md px-2.5 py-1 text-[10px] font-bold text-zinc-350 border border-white/5 drop-shadow">
                            👁️ {activeViewerCount}
                          </span>
                        </div>
                      </div>

                      {/* Middle: Big Center Play Button (visible only when paused) */}
                      {!isPlaying && (
                        <button 
                          onClick={togglePlay}
                          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-14 w-14 rounded-full bg-neon-primary/95 text-white flex items-center justify-center shadow-lg shadow-neon-primary/30 hover:scale-105 transition-all cursor-pointer border border-white/10"
                        >
                          <Play className="h-6 w-6 ml-0.5" />
                        </button>
                      )}

                      {/* Bottom Bar: Action Controls */}
                      <div className="flex items-center justify-between pt-2">
                        {/* Play/Pause & Volume */}
                        <div className="flex items-center gap-3">
                          <button 
                            onClick={togglePlay} 
                            className="text-white hover:text-neon-primary transition-colors cursor-pointer"
                          >
                            {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                          </button>

                          {/* Sound controls */}
                          <div className="flex items-center gap-2 group/volume">
                            <button 
                              onClick={toggleMute} 
                              className="text-white hover:text-neon-primary transition-colors cursor-pointer"
                            >
                              {isMuted ? <VolumeX className="h-5 w-5 text-rose-500" /> : <Volume2 className="h-5 w-5" />}
                            </button>
                            <input
                              type="range"
                              min="0"
                              max="1"
                              step="0.05"
                              value={isMuted ? 0 : volume}
                              onChange={handleVolumeChange}
                              className="w-16 sm:w-20 h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-neon-primary outline-none"
                            />
                          </div>
                        </div>

                        {/* Settings / Resolution & Fullscreen */}
                        <div className="flex items-center gap-3.5 relative">
                          
                          {/* Resolution Label / Selector Trigger */}
                          <div className="relative">
                            <button
                              onClick={() => setShowResMenu(!showResMenu)}
                              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-950/60 hover:bg-zinc-900 border border-white/5 text-[10px] font-bold font-mono text-zinc-300 hover:text-white transition-all cursor-pointer"
                            >
                              <Settings className="h-3.5 w-3.5" />
                              <span>
                                {currentResolution === -1 
                                  ? `Auto${actualHeight ? ` (${actualHeight})` : ""}` 
                                  : resolutions.find(r => r.index === currentResolution)?.label || "Auto"}
                              </span>
                            </button>

                            {/* Resolution Dropdown Popover */}
                            {showResMenu && (
                              <div className="absolute right-0 bottom-8 z-50 w-36 rounded-xl border border-zinc-800 bg-zinc-950/95 backdrop-blur-md p-1 shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-200">
                                <div className="px-2 py-1.5 border-b border-zinc-900">
                                  <span className="text-[8px] font-extrabold text-zinc-550 uppercase tracking-widest">Độ phân giải</span>
                                </div>
                                <div className="py-1 max-h-48 overflow-y-auto scrollbar-none">
                                  {resolutions.map((res) => (
                                    <button
                                      key={res.index}
                                      onClick={() => selectResolution(res.index)}
                                      className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-[10px] font-bold text-left text-zinc-400 hover:bg-zinc-900 hover:text-white transition-all cursor-pointer font-mono"
                                    >
                                      <span>{res.label}</span>
                                      {currentResolution === res.index && (
                                        <Check className="h-3 w-3 text-neon-primary" />
                                      )}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>

                          <button 
                            onClick={toggleFullscreen} 
                            className="text-white hover:text-neon-primary transition-colors cursor-pointer"
                          >
                            {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="w-full h-full bg-gradient-to-tr from-purple-950 via-zinc-950 to-indigo-950 flex flex-col items-center justify-center relative select-none">
                    <div className="absolute inset-0 pointer-events-none opacity-20">
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full bg-neon-primary blur-[80px]" />
                    </div>

                    <div className="relative z-10 flex flex-col items-center gap-4 text-center">
                      <div className="h-16 w-16 rounded-full bg-neon-primary/10 border border-neon-primary/30 flex items-center justify-center text-neon-primary text-3xl font-extrabold uppercase ring-4 ring-neon-primary/10">
                        {room.host.name.charAt(0)}
                      </div>
                      <div className="space-y-1">
                        <span className="inline-flex items-center rounded-full bg-neon-primary px-2.5 py-0.5 text-[10px] font-bold text-white tracking-wider uppercase animate-pulse">
                          CONNECTING
                        </span>
                        <h2 className="text-base font-bold text-white mt-1">Đang tải luồng phát trực tiếp...</h2>
                        <p className="text-xs text-zinc-400">HLS/WebRTC player is connecting to stream servers.</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              // Stream offline page
              <div className="w-full h-full bg-gradient-to-br from-zinc-950 via-zinc-950 to-purple-950/20 flex flex-col items-center justify-center p-6 text-center select-none relative overflow-hidden">
                <div className="absolute inset-0 pointer-events-none opacity-20">
                  <div className="absolute -top-32 -right-32 w-72 h-72 rounded-full bg-neon-primary blur-[90px]" />
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
          <div className="flex gap-4 items-start rounded-3xl border border-white/5 bg-zinc-950/20 backdrop-blur-xl p-6 text-left shadow-xl relative overflow-hidden">
            {/* Streamer Avatar */}
            <div className="h-12 w-12 shrink-0 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-neon-accent font-extrabold text-lg ring-2 ring-neon-accent/15 uppercase">
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
                    <span className="text-[8px] font-bold px-1.5 py-0.2 rounded bg-neon-primary/10 text-neon-primary uppercase tracking-wider">Streamer</span>
                  </h2>
                  <p className="text-[11px] text-zinc-455">@{slug}</p>
                </div>

                <button className="rounded-xl bg-neon-primary hover:bg-neon-primary/95 shadow-md shadow-neon-primary/10 hover:shadow-neon-primary/20 px-4 py-2 text-xs font-bold text-white transition-all cursor-pointer">
                  Theo dõi
                </button>
              </div>

              {/* Stream Title */}
              <h1 className="text-lg font-bold text-white tracking-tight leading-snug pt-1">
                {room.title}
              </h1>

              {/* Description & metadata */}
              {room.description && (
                <p className="text-xs text-zinc-350 leading-relaxed pt-1">
                  {room.description}
                </p>
              )}

              {/* Tags & Categories */}
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-zinc-900/60">
                {room.category && (
                  <span className="inline-flex items-center rounded-full bg-neon-primary/5 border border-neon-primary/15 px-2.5 py-0.5 text-[10px] font-medium text-neon-primary">
                    📂 {room.category.name}
                  </span>
                )}
                {room.tags && room.tags.map((t) => (
                  <span key={t.id} className="inline-flex items-center rounded-full bg-zinc-900/80 border border-zinc-800 px-2.5 py-0.5 text-[10px] font-medium text-zinc-400">
                    #{t.name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Live Chat Feed Sidebar (4 cols) */}
        <div className="lg:col-span-4 flex flex-col h-full rounded-2xl border border-white/5 bg-zinc-950/20 backdrop-blur-xl overflow-hidden shadow-2xl">
          {/* Chat Header */}
          <div className="bg-zinc-950/90 border-b border-zinc-900 px-4 py-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-1.5 w-1.5 rounded-full bg-rose-500 animate-ping" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Trò chuyện trực tiếp</h3>
            </div>
          </div>

          {/* Chat message listing */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 scrollbar-thin scrollbar-thumb-zinc-850 scrollbar-track-transparent">
            {chatMessages.map((msg) => {
              const isSystem = msg.user_id === 0;
              const isHost = msg.user_id === room.host_id;

              return (
                <div key={msg.id} className={`flex flex-col gap-0.5 text-left ${isSystem ? "items-center opacity-70" : ""}`}>
                  {!isSystem && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-bold text-zinc-300">{msg.user_name}</span>
                      {isHost && (
                        <span className="text-[8px] font-bold px-1.5 py-0.2 rounded bg-neon-primary/10 text-neon-primary uppercase">Chủ phòng</span>
                      )}
                    </div>
                  )}
                  <div className={`text-xs ${isSystem ? "bg-zinc-900/40 px-3 py-1 rounded-full text-zinc-450" : "text-zinc-350 bg-zinc-900/10 p-2.5 rounded-xl border border-white/5"}`}>
                    {msg.content}
                  </div>
                </div>
              );
            })}
            <div ref={chatEndRef} />
          </div>

          {/* Chat input form */}
          {isAuthenticated ? (
            <form onSubmit={handleSendChat} className="p-3 bg-zinc-950/80 border-t border-zinc-900 flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Gửi tin nhắn chat..."
                className="flex-1 bg-zinc-900 border border-zinc-850 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-neon-primary focus:ring-1 focus:ring-neon-primary/30"
                disabled={chatSending}
              />
              <button
                type="submit"
                disabled={chatSending}
                className="bg-neon-primary hover:bg-neon-primary/95 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md shadow-neon-primary/10"
              >
                Gửi
              </button>
            </form>
          ) : (
            <div className="p-4 bg-zinc-950/90 border-t border-zinc-900 text-center space-y-2">
              <p className="text-[11px] text-zinc-400 font-medium">Bạn cần đăng nhập để tham gia trò chuyện</p>
              <Link
                href="/login"
                className="w-full inline-flex justify-center rounded-xl bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 py-2 text-xs font-bold text-white shadow transition-all cursor-pointer"
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

export default PublicStream;
