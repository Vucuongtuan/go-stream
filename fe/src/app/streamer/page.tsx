"use client";

import React, { useState, useEffect, useRef } from "react";
import { MainLayout } from "@/components/layouts";
import { useAuth } from "@/hooks/useAuth";
import { apiClient } from "@/lib/api-client";
import { getCookie } from "@/utils/cookie";
import Link from "next/link";

interface Category {
  id: number;
  name: string;
  slug: string;
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

export default function StreamerDashboardPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [room, setRoom] = useState<Room | null>(null);
  const [streamKey, setStreamKey] = useState<string>("");
  const [showKey, setShowKey] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  
  // Dashboard state
  const [pageLoading, setPageLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [liveDuration, setLiveDuration] = useState("00:00:00");
  const [isCopied, setIsCopied] = useState(false);
  
  // Stream settings form
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState<number | "">("");
  const [visibility, setVisibility] = useState<"public" | "private" | "unlisted">("public");

  // WebRTC & Studio Mixer State
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<string>("");
  const [selectedAudio, setSelectedAudio] = useState<string>("");
  
  const [studioLayout, setStudioLayout] = useState<"talk" | "gaming" | "side-by-side">("gaming");
  const [camPosition, setCamPosition] = useState<"top-left" | "top-right" | "bottom-left" | "bottom-right">("bottom-right");
  const [micActive, setMicActive] = useState(true);
  const [camActive, setCamActive] = useState(true);

  // Floating Chat State
  const [chatViewMode, setChatViewMode] = useState<"fixed" | "floating">("fixed");
  const [floatPos, setFloatPos] = useState({ x: 100, y: 120 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Refs for video mixing
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const camVideoRef = useRef<HTMLVideoElement | null>(null);
  const screenVideoRef = useRef<HTMLVideoElement | null>(null);
  const sseRef = useRef<EventSource | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // 1. Authorization & Room Load
  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated || user?.role !== "author") {
      setPageLoading(false);
      return;
    }

    const initDashboard = async () => {
      try {
        // Fetch categories for settings select
        const cats = await apiClient.get<Category[]>("/api/categories");
        setCategories(cats || []);

        // Fetch my rooms
        const rooms = await apiClient.get<Room[]>("/api/rooms/me");
        if (rooms && rooms.length > 0) {
          const currentRoom = rooms[0];
          setRoom(currentRoom);
          setTitle(currentRoom.title);
          setDescription(currentRoom.description || "");
          setCategoryId(currentRoom.category_id || "");
          setVisibility(currentRoom.visibility);

          // Fetch stream key for room
          const keyData = await apiClient.get<{ stream_key: string }>(`/api/rooms/${currentRoom.id}/stream-key`);
          if (keyData) setStreamKey(keyData.stream_key);
        } else {
          // No room found, automatically trigger setup default room
          const newRoom = await apiClient.post<Room>("/api/rooms", {
            title: `Kênh phát sóng của ${user?.name}`,
            description: "Chào mừng mọi người đến với kênh livestream của mình!",
            visibility: "public"
          });
          if (newRoom) {
            setRoom(newRoom);
            setTitle(newRoom.title);
            setDescription(newRoom.description || "");
            setVisibility(newRoom.visibility);

            const keyData = await apiClient.get<{ stream_key: string }>(`/api/rooms/${newRoom.id}/stream-key`);
            if (keyData) setStreamKey(keyData.stream_key);
          }
        }
      } catch (err) {
        console.error("Lỗi khởi tạo dashboard:", err);
      } finally {
        setPageLoading(false);
      }
    };

    initDashboard();

    return () => {
      if (sseRef.current) sseRef.current.close();
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [isAuthenticated, user, authLoading]);

  // 2. Load Camera & Screen Sources
  useEffect(() => {
    if (!isAuthenticated || user?.role !== "author") return;

    // Enumerate devices
    navigator.mediaDevices.enumerateDevices().then((devices) => {
      const video = devices.filter((d) => d.kind === "videoinput");
      const audio = devices.filter((d) => d.kind === "audioinput");
      setVideoDevices(video);
      setAudioDevices(audio);
      if (video.length > 0) setSelectedVideo(video[0].deviceId);
      if (audio.length > 0) setSelectedAudio(audio[0].deviceId);
    });
  }, [isAuthenticated, user]);

  // 3. WebRTC webcam stream helper
  useEffect(() => {
    if (!selectedVideo) return;

    // Close previous stream
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
    }

    navigator.mediaDevices
      .getUserMedia({
        video: { deviceId: selectedVideo ? { exact: selectedVideo } : undefined },
        audio: selectedAudio ? { deviceId: selectedAudio } : true,
      })
      .then((stream) => {
        setCameraStream(stream);
        if (camVideoRef.current) {
          camVideoRef.current.srcObject = stream;
        }
      })
      .catch((err) => console.error("Không thể mở Webcam:", err));
  }, [selectedVideo, selectedAudio]);

  // 4. Live Stream Session Timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (room?.status === "live" && room.started_at) {
      const startTime = new Date(room.started_at).getTime();
      timer = setInterval(() => {
        const diff = Date.now() - startTime;
        const hrs = Math.floor(diff / 3600000).toString().padStart(2, "0");
        const mins = Math.floor((diff % 3600000) / 60000).toString().padStart(2, "0");
        const secs = Math.floor((diff % 60000) / 1000).toString().padStart(2, "0");
        setLiveDuration(`${hrs}:${mins}:${secs}`);
      }, 1000);
    } else {
      setLiveDuration("00:00:00");
    }
    return () => clearInterval(timer);
  }, [room]);

  // 5. Connect SSE Chat
  useEffect(() => {
    if (!room) return;

    if (sseRef.current) {
      sseRef.current.close();
    }

    // Connect to Backend SSE Chat
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

    // Populate mock messages for realistic feeling if empty
    setChatMessages([
      {
        id: "sys-1",
        room_id: room.id,
        user_id: 0,
        user_name: "Hệ thống",
        content: "Chào mừng bạn đã đến với phòng phát sóng. Kênh chat trực tiếp của bạn đã sẵn sàng!",
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

  // 6. Canvas Studio Mixer loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let active = true;

    const render = () => {
      if (!active) return;

      // Draw background base
      ctx.fillStyle = "#09090b";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const camVideo = camVideoRef.current;
      const screenVideo = screenVideoRef.current;

      // Layout 1: Talk show layout (Camera takes primary screen space)
      if (studioLayout === "talk") {
        if (camVideo && camVideo.readyState >= 2 && camActive) {
          // Draw webcam centered with aspect ratio cover
          const hRatio = canvas.width / camVideo.videoWidth;
          const vRatio = canvas.height / camVideo.videoHeight;
          const ratio = Math.max(hRatio, vRatio);
          const centerShiftX = (canvas.width - camVideo.videoWidth * ratio) / 2;
          const centerShiftY = (canvas.height - camVideo.videoHeight * ratio) / 2;
          ctx.drawImage(
            camVideo,
            0,
            0,
            camVideo.videoWidth,
            camVideo.videoHeight,
            centerShiftX,
            centerShiftY,
            camVideo.videoWidth * ratio,
            camVideo.videoHeight * ratio
          );
        } else {
          // Fallback screen if cam inactive
          ctx.fillStyle = "#18181b";
          ctx.fillRect(40, 40, canvas.width - 80, canvas.height - 80);
          ctx.font = "bold 24px Inter, sans-serif";
          ctx.fillStyle = "#3f3f46";
          ctx.textAlign = "center";
          ctx.fillText("Đang chờ tín hiệu Camera...", canvas.width / 2, canvas.height / 2);
        }

        // Draw nice overlay text
        ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
        ctx.fillRect(30, canvas.height - 80, 250, 50);
        ctx.fillStyle = "#10b981";
        ctx.font = "bold 16px Inter, sans-serif";
        ctx.textAlign = "left";
        ctx.fillText(`• TALKSHOW LIVE: ${user?.name}`, 50, canvas.height - 50);
      } 
      
      // Layout 2: Screen share in full, webcam in small floating PIP window
      else if (studioLayout === "gaming") {
        // Draw screen share background
        if (screenVideo && screenVideo.readyState >= 2 && screenStream) {
          ctx.drawImage(screenVideo, 0, 0, canvas.width, canvas.height);
        } else {
          // Fallback screen share backdrop
          const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
          gradient.addColorStop(0, "#0f172a");
          gradient.addColorStop(1, "#020617");
          ctx.fillStyle = gradient;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.font = "20px Inter, sans-serif";
          ctx.fillStyle = "#64748b";
          ctx.textAlign = "center";
          ctx.fillText("Nhấn 'Chia sẻ màn hình' để trình chiếu nội dung game/ứng dụng", canvas.width / 2, canvas.height / 2);
        }

        // Overlay webcam in floating PiP mode
        if (camVideo && camVideo.readyState >= 2 && camActive) {
          const pipWidth = 240;
          const pipHeight = 160;
          let pipX = canvas.width - pipWidth - 30;
          let pipY = canvas.height - pipHeight - 30;

          if (camPosition === "top-left") {
            pipX = 30;
            pipY = 30;
          } else if (camPosition === "top-right") {
            pipX = canvas.width - pipWidth - 30;
            pipY = 30;
          } else if (camPosition === "bottom-left") {
            pipX = 30;
            pipY = canvas.height - pipHeight - 30;
          }

          // Draw floating shadow/glowing border
          ctx.shadowColor = "rgba(16, 185, 129, 0.4)";
          ctx.shadowBlur = 15;
          ctx.fillStyle = "#10b981";
          ctx.fillRect(pipX - 3, pipY - 3, pipWidth + 6, pipHeight + 6); // border
          ctx.shadowBlur = 0; // reset shadow

          // Draw webcam
          ctx.drawImage(camVideo, pipX, pipY, pipWidth, pipHeight);
        }
      }

      // Layout 3: Side-by-side splits
      else if (studioLayout === "side-by-side") {
        const splitWidth = canvas.width / 2;

        // Draw Left split: Camera
        if (camVideo && camVideo.readyState >= 2 && camActive) {
          ctx.drawImage(camVideo, 0, 0, splitWidth, canvas.height);
        } else {
          ctx.fillStyle = "#18181b";
          ctx.fillRect(0, 0, splitWidth, canvas.height);
          ctx.font = "16px Inter, sans-serif";
          ctx.fillStyle = "#52525b";
          ctx.textAlign = "center";
          ctx.fillText("Camera", splitWidth / 2, canvas.height / 2);
        }

        // Draw Right split: Screen Share
        if (screenVideo && screenVideo.readyState >= 2 && screenStream) {
          ctx.drawImage(screenVideo, splitWidth, 0, splitWidth, canvas.height);
        } else {
          ctx.fillStyle = "#0f172a";
          ctx.fillRect(splitWidth, 0, splitWidth, canvas.height);
          ctx.font = "16px Inter, sans-serif";
          ctx.fillStyle = "#475569";
          ctx.textAlign = "center";
          ctx.fillText("Trình chiếu Màn hình", splitWidth + splitWidth / 2, canvas.height / 2);
        }

        // Split division line
        ctx.fillStyle = "#10b981";
        ctx.fillRect(splitWidth - 2, 0, 4, canvas.height);
      }

      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      active = false;
    };
  }, [cameraStream, screenStream, studioLayout, camPosition, camActive, micActive]);

  // Start Screen Share capture
  const handleStartScreenShare = async () => {
    try {
      if (screenStream) {
        screenStream.getTracks().forEach((track) => track.stop());
        setScreenStream(null);
        return;
      }

      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });
      setScreenStream(stream);

      if (screenVideoRef.current) {
        screenVideoRef.current.srcObject = stream;
      }

      // Automatically switch to gaming layout
      setStudioLayout("gaming");

      // Handle screen sharing stop event by browser toolbar
      stream.getVideoTracks()[0].onended = () => {
        setScreenStream(null);
      };
    } catch (err) {
      console.error("Không thể chia sẻ màn hình:", err);
    }
  };

  // 7. Backend Action: Go Live
  const handleGoLive = async () => {
    if (!room) return;
    setActionLoading(true);
    try {
      const updated = await apiClient.post<Room>(`/api/rooms/${room.id}/live`);
      if (updated) {
        setRoom(updated);
      }
    } catch (err: any) {
      alert(`Không thể bắt đầu Live: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // 8. Backend Action: End Stream
  const handleEndStream = async () => {
    if (!room) return;
    if (!confirm("Bạn có chắc chắn muốn kết thúc phiên phát trực tiếp này?")) return;
    setActionLoading(true);
    try {
      await apiClient.post(`/api/rooms/${room.id}/end`);
      // Reload room state
      const rooms = await apiClient.get<Room[]>("/api/rooms/me");
      if (rooms && rooms.length > 0) setRoom(rooms[0]);
    } catch (err: any) {
      alert(`Không thể kết thúc Live: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // 9. Update Settings
  const handleUpdateSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!room) return;
    setActionLoading(true);
    try {
      const updated = await apiClient.put<Room>(`/api/rooms/${room.id}`, {
        title,
        description,
        category_id: categoryId ? Number(categoryId) : null,
        visibility
      });
      if (updated) {
        setRoom(updated);
        alert("Cập nhật thông tin phiên livestream thành công!");
      }
    } catch (err: any) {
      alert(`Lỗi cập nhật: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // 10. Send Chat Message
  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !room) return;

    const text = chatInput;
    setChatInput("");

    try {
      await apiClient.post(`/api/rooms/${room.id}/chat`, {
        content: text,
        type: "text"
      });
    } catch (err: any) {
      console.error("Lỗi gửi chat:", err);
    }
  };

  // Copy Stream Key
  const handleCopyKey = () => {
    navigator.clipboard.writeText(streamKey);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // Pop-out Chat Window
  const handlePopOutChat = () => {
    if (!room) return;
    const popUrl = `/api/rooms/${room.id}/playback`; // viewer link or mock chat view
    const width = 400;
    const height = 600;
    const left = window.screen.width - width - 50;
    const top = 100;
    
    // Open a simple popup with custom SSE feed
    const popup = window.open(
      "",
      `ChatRoom-${room.id}`,
      `width=${width},height=${height},left=${left},top=${top},menubar=no,toolbar=no,location=no,status=no,resizable=yes,scrollbars=yes`
    );

    if (popup) {
      popup.document.write(`
        <html>
          <head>
            <title>Kênh Chat - Kênh Live của ${user?.name}</title>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <script src="https://cdn.tailwindcss.com"></script>
            <style>
              body { background-color: #09090b; color: #f4f4f5; font-family: sans-serif; }
            </style>
          </head>
          <body class="flex flex-col h-screen">
            <div class="bg-zinc-900 border-b border-zinc-800 p-4 flex items-center justify-between">
              <h2 class="text-sm font-bold text-emerald-400">🔥 Chat Trực Tiếp Nổi</h2>
              <span class="text-xs px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-medium">Bảng của Streamer</span>
            </div>
            <div id="messages" class="flex-1 overflow-y-auto p-4 space-y-3 text-sm">
              <div class="text-zinc-500 text-xs text-center my-4">--- Kết nối tới kênh Stream ---</div>
            </div>
            <div class="p-3 bg-zinc-950 border-t border-zinc-800">
              <form id="chatForm" class="flex gap-2">
                <input id="chatInput" placeholder="Nhập tin nhắn với tư cách Admin..." class="flex-1 bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 text-white" />
                <button type="submit" class="bg-emerald-600 text-white px-4 py-2 rounded text-sm font-bold hover:bg-emerald-500">Gửi</button>
              </form>
            </div>
            <script>
              const messagesContainer = document.getElementById('messages');
              
              // Load previous messages from parent
              const initialMsgs = ${JSON.stringify(chatMessages)};
              initialMsgs.forEach(msg => appendMessage(msg));

              function appendMessage(msg) {
                const isSystem = msg.user_id === 0;
                const isAdmin = msg.user_id === ${user?.id || 0};
                
                const div = document.createElement('div');
                div.className = "flex flex-col gap-1 " + (isSystem ? "items-center opacity-70" : "");
                
                let nameHtml = '';
                if (!isSystem) {
                  const badgeClass = isAdmin ? "bg-emerald-500/20 text-emerald-400" : "bg-zinc-800 text-zinc-400";
                  const badgeText = isAdmin ? "CHỦ KÊNH" : "VIEWER";
                  nameHtml = \`<div class="flex items-center gap-1.5">
                    <span class="font-bold text-white">\${msg.user_name}</span>
                    <span class="text-[9px] font-bold px-1.5 py-0.2 rounded \${badgeClass}">\${badgeText}</span>
                  </div>\`;
                }

                div.innerHTML = \`
                  \${nameHtml}
                  <div class="\${isSystem ? 'bg-zinc-800/40 px-3 py-1 rounded-full text-xs text-zinc-400' : 'text-zinc-200 bg-zinc-900/30 p-2 rounded' }">
                    \${msg.content}
                  </div>
                \`;
                messagesContainer.appendChild(div);
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
              }

              // EventSource connection
              const sseUrl = "${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"}/api/rooms/${room.id}/chat/stream";
              const sse = new EventSource(sseUrl);
              sse.onmessage = (e) => {
                const msg = JSON.parse(e.data);
                appendMessage(msg);
              };

              // Submit message
              const form = document.getElementById('chatForm');
              const input = document.getElementById('chatInput');
              form.onsubmit = async (e) => {
                e.preventDefault();
                const content = input.value.trim();
                if (!content) return;
                input.value = '';

                try {
                  const token = "${getCookie("access_token") || ""}";
                  await fetch("${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"}/api/rooms/${room.id}/chat", {
                    method: 'POST',
                    headers: { 
                      'Content-Type': 'application/json',
                      'Authorization': 'Bearer ' + token
                    },
                    body: JSON.stringify({ content, type: 'text' })
                  });
                } catch(err) {
                  console.error(err);
                }
              };
            </script>
          </body>
        </html>
      `);
      popup.document.close();
    }
  };

  // Dragging handlers for Floating Chat inside page
  const handleDragStart = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - floatPos.x,
      y: e.clientY - floatPos.y,
    });
  };

  const handleDrag = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setFloatPos({
      x: e.clientX - dragOffset.x,
      y: e.clientY - dragOffset.y,
    });
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  // Render Denied View
  if (!authLoading && (!isAuthenticated || user?.role !== "author")) {
    return (
      <MainLayout>
        <div className="flex h-[calc(100vh-8rem)] items-center justify-center p-4">
          <div className="max-w-md w-full rounded-3xl border border-white/5 bg-zinc-900/40 backdrop-blur-2xl p-8 text-center shadow-2xl relative overflow-hidden">
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute -top-32 -right-32 w-64 h-64 rounded-full bg-red-500/10 blur-[80px]" />
            </div>
            <div className="relative z-10 space-y-6">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight">Truy cập bị từ chối</h2>
              <p className="text-sm leading-relaxed text-zinc-400">
                Trang này chỉ dành riêng cho các thành viên đã được phê duyệt làm **Streamer (Author)** trên hệ thống. 
              </p>
              <div className="flex flex-col gap-2">
                <Link
                  href="/register/author"
                  className="w-full inline-flex justify-center rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition-all hover:from-emerald-500 hover:to-teal-500 cursor-pointer"
                >
                  Đăng ký ứng tuyển Streamer
                </Link>
                <Link
                  href="/"
                  className="w-full inline-flex justify-center rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm font-semibold text-zinc-300 hover:text-white transition-all cursor-pointer"
                >
                  Trở lại Trang chủ
                </Link>
              </div>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div 
        className="space-y-6 pb-12 relative"
        onMouseMove={isDragging ? handleDrag : undefined}
        onMouseUp={isDragging ? handleDragEnd : undefined}
      >
        {/* Header Dashboard Banner */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-3xl border border-white/5 bg-zinc-900/20 backdrop-blur-xl p-6 shadow-xl relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute -top-32 -right-32 w-80 h-80 rounded-full bg-emerald-500/5 blur-[90px]" />
          </div>

          <div className="space-y-1 relative z-10 text-left">
            <span className="text-[10px] font-bold tracking-wider text-emerald-400 uppercase bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/10">
              Studio Phát Sóng của {user?.name}
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-white mt-2">Bảng điều khiển Live Stream</h1>
            <p className="text-xs text-zinc-400">Trình quản lý, trộn màn hình WebRTC và tương tác chat trực tiếp.</p>
          </div>

          <div className="flex items-center gap-3 relative z-10">
            {user?.slug && (
              <Link
                href={`/streamer/${user.slug}`}
                target="_blank"
                className="rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3.5 text-xs font-bold text-zinc-300 hover:text-white hover:bg-zinc-900 transition-all cursor-pointer shadow-md flex items-center gap-1.5"
              >
                👁️ Xem kênh của tôi
              </Link>
            )}

            {room?.status === "live" ? (
              <div className="flex items-center gap-2 bg-emerald-950/80 border border-emerald-500/30 rounded-2xl p-2.5 shadow-lg">
                <span className="relative flex h-2.5 w-2.5 ml-1">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                </span>
                <div className="flex flex-col text-left pr-2">
                  <span className="text-[9px] font-bold text-zinc-400 uppercase">ĐANG PHÁT LIVE</span>
                  <span className="text-xs font-bold text-white font-mono">{liveDuration}</span>
                </div>
                <button
                  onClick={handleEndStream}
                  disabled={actionLoading}
                  className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md hover:shadow-red-600/10 transition-all cursor-pointer"
                >
                  Dừng Phát
                </button>
              </div>
            ) : (
              <button
                onClick={handleGoLive}
                disabled={actionLoading}
                className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white px-6 py-3 rounded-2xl text-xs font-bold shadow-xl shadow-emerald-500/5 hover:shadow-emerald-500/15 transition-all flex items-center gap-2 cursor-pointer border border-emerald-500/20"
              >
                <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
                Bắt Đầu Phát Sóng
              </button>
            )}
          </div>
        </div>

        {/* Dashboard Panels */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT COLUMN: Mixer Canvas Preview & Stream Control Studio (8 cols) */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* virtual studio preview block */}
            <div className="rounded-3xl border border-white/5 bg-zinc-900/40 backdrop-blur-xl p-5 shadow-lg overflow-hidden space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3.5">
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <h2 className="text-sm font-bold text-white">Xem trước Studio (Stream Mixer)</h2>
                </div>
                
                {/* Layout templates selectors */}
                <div className="flex items-center gap-1.5 bg-zinc-950 p-1.5 rounded-xl border border-zinc-800">
                  <button
                    onClick={() => setStudioLayout("gaming")}
                    className={`px-3 py-1 rounded-lg text-[10px] font-semibold transition-all ${
                      studioLayout === "gaming" ? "bg-emerald-600/20 border border-emerald-500/20 text-emerald-400" : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    Gaming / Screen
                  </button>
                  <button
                    onClick={() => setStudioLayout("talk")}
                    className={`px-3 py-1 rounded-lg text-[10px] font-semibold transition-all ${
                      studioLayout === "talk" ? "bg-emerald-600/20 border border-emerald-500/20 text-emerald-400" : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    Talk Show / Camera
                  </button>
                  <button
                    onClick={() => setStudioLayout("side-by-side")}
                    className={`px-3 py-1 rounded-lg text-[10px] font-semibold transition-all ${
                      studioLayout === "side-by-side" ? "bg-emerald-600/20 border border-emerald-500/20 text-emerald-400" : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    Side-by-Side
                  </button>
                </div>
              </div>

              {/* Mixed Output Glowing Canvas Player */}
              <div className="relative aspect-video w-full rounded-2xl bg-zinc-950 border border-white/5 overflow-hidden flex items-center justify-center shadow-inner group">
                <canvas
                  ref={canvasRef}
                  width={1280}
                  height={720}
                  className="w-full h-full object-contain rounded-2xl"
                />

                {/* Invisible HTML5 video feeds representing WebRTC capture tracks */}
                <video ref={camVideoRef} autoPlay playsInline muted className="hidden" />
                <video ref={screenVideoRef} autoPlay playsInline muted className="hidden" />

                {/* PiP Position selectors if in gaming mode */}
                {studioLayout === "gaming" && camActive && (
                  <div className="absolute top-4 right-4 flex items-center gap-1 bg-zinc-900/90 border border-white/5 p-1 rounded-lg shadow-lg">
                    <span className="text-[9px] font-bold text-zinc-400 px-1">PiP Cam:</span>
                    {(["top-left", "top-right", "bottom-left", "bottom-right"] as const).map((pos) => (
                      <button
                        key={pos}
                        onClick={() => setCamPosition(pos)}
                        className={`p-1.5 rounded transition-all text-[8px] font-bold uppercase ${
                          camPosition === pos ? "bg-emerald-600 text-white" : "text-zinc-400 hover:bg-zinc-800"
                        }`}
                        title={`Đặt Camera PIP ở ${pos}`}
                      >
                        {pos === "top-left" && "↖"}
                        {pos === "top-right" && "↗"}
                        {pos === "bottom-left" && "↙"}
                        {pos === "bottom-right" && "↘"}
                      </button>
                    ))}
                  </div>
                )}

                {/* Status Indicator */}
                <div className="absolute bottom-4 left-4 flex items-center gap-1.5 rounded-md bg-zinc-950/80 px-2.5 py-1 text-[9px] font-bold tracking-wider text-emerald-400 border border-emerald-500/20">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  STUDIO MIXER: 1080P 30FPS
                </div>
              </div>

              {/* Hardware Device selection and toggles */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="space-y-1.5 text-left">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Chọn Webcam</label>
                  <select
                    value={selectedVideo}
                    onChange={(e) => setSelectedVideo(e.target.value)}
                    className="w-full rounded-xl bg-zinc-950 border border-zinc-800 px-3 py-2 text-xs text-zinc-300 focus:outline-none focus:border-emerald-500"
                  >
                    {videoDevices.map((d) => (
                      <option key={d.deviceId} value={d.deviceId}>
                        {d.label || `Camera ${d.deviceId.slice(0, 5)}`}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5 text-left">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Chọn Microphone</label>
                  <select
                    value={selectedAudio}
                    onChange={(e) => setSelectedAudio(e.target.value)}
                    className="w-full rounded-xl bg-zinc-950 border border-zinc-800 px-3 py-2 text-xs text-zinc-300 focus:outline-none focus:border-emerald-500"
                  >
                    {audioDevices.map((d) => (
                      <option key={d.deviceId} value={d.deviceId}>
                        {d.label || `Mic ${d.deviceId.slice(0, 5)}`}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Controls bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-zinc-800/80">
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleStartScreenShare}
                    className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-semibold shadow-md transition-all cursor-pointer ${
                      screenStream 
                        ? "bg-emerald-600 border-emerald-500 text-white hover:bg-emerald-500" 
                        : "bg-zinc-950 border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-900"
                    }`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-4.5 h-4.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 0 1-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0 1 15 18.257V17.25m6-12V15a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 15V5.25m18 0A2.25 2.25 0 0 0 18.75 3H5.25A2.25 2.25 0 0 0 3 5.25m18 0V12a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 12V5.25" />
                    </svg>
                    {screenStream ? "Dừng chia sẻ màn hình" : "Chia sẻ màn hình"}
                  </button>

                  <button
                    onClick={() => setCamActive(!camActive)}
                    className={`rounded-xl border p-2 text-xs font-semibold transition-all cursor-pointer ${
                      camActive 
                        ? "bg-zinc-950 border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-900" 
                        : "bg-red-950/80 border-red-500/30 text-red-400 hover:bg-red-900/40"
                    }`}
                    title={camActive ? "Tắt Camera" : "Bật Camera"}
                  >
                    {camActive ? (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-4.5 h-4.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0zM18.75 10.5h.008v.008h-.008V10.5z" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-4.5 h-4.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M12 18.75A9.75 9.75 0 0012 3.75a9.75 9.75 0 000 15M3 3l18 18" />
                      </svg>
                    )}
                  </button>

                  <button
                    onClick={() => setMicActive(!micActive)}
                    className={`rounded-xl border p-2 text-xs font-semibold transition-all cursor-pointer ${
                      micActive 
                        ? "bg-zinc-950 border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-900" 
                        : "bg-red-950/80 border-red-500/30 text-red-400 hover:bg-red-900/40"
                    }`}
                    title={micActive ? "Tắt Microphone" : "Bật Microphone"}
                  >
                    {micActive ? (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-4.5 h-4.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-4.5 h-4.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5m-9-15.75H12M3 3l18 18" />
                      </svg>
                    )}
                  </button>
                </div>

                <div className="flex items-center gap-1">
                  {/* Dynamic waveform visualizer when mic active */}
                  {micActive && camActive && (
                    <div className="flex items-center gap-0.5 h-3 px-2">
                      <span className="w-0.5 h-2.5 bg-emerald-400 rounded-full animate-bounce duration-500" />
                      <span className="w-0.5 h-1 bg-emerald-400 rounded-full animate-bounce duration-300" />
                      <span className="w-0.5 h-3 bg-emerald-400 rounded-full animate-bounce duration-700" />
                      <span className="w-0.5 h-1.5 bg-emerald-400 rounded-full animate-bounce duration-400" />
                    </div>
                  )}
                  <span className="text-[10px] text-zinc-500 font-semibold uppercase">Microphone đang hoạt động</span>
                </div>
              </div>
            </div>

            {/* Stream Settings & Edit section */}
            <div className="rounded-3xl border border-white/5 bg-zinc-900/40 backdrop-blur-xl p-6 shadow-lg text-left space-y-6">
              <h2 className="text-sm font-bold text-white border-b border-zinc-800/80 pb-3">Cấu hình Phiên Live Stream</h2>
              
              <form onSubmit={handleUpdateSettings} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Tiêu đề Livestream</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Nhập tiêu đề hấp dẫn để thu hút khán giả..."
                    className="w-full rounded-xl bg-zinc-950 border border-zinc-800 px-4 py-2.5 text-xs text-zinc-300 focus:outline-none focus:border-emerald-500 transition-colors"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Mô tả / Lời giới thiệu</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Viết một đoạn ngắn giới thiệu nội dung buổi stream hôm nay của bạn..."
                    className="w-full h-24 rounded-xl bg-zinc-950 border border-zinc-800 px-4 py-2.5 text-xs text-zinc-300 focus:outline-none focus:border-emerald-500 transition-colors resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Danh mục (Category)</label>
                    <select
                      value={categoryId}
                      onChange={(e) => setCategoryId(e.target.value === "" ? "" : Number(e.target.value))}
                      className="w-full rounded-xl bg-zinc-950 border border-zinc-800 px-4 py-2.5 text-xs text-zinc-300 focus:outline-none focus:border-emerald-500"
                    >
                      <option value="">-- Không chọn danh mục --</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Chế độ hiển thị</label>
                    <select
                      value={visibility}
                      onChange={(e) => setVisibility(e.target.value as any)}
                      className="w-full rounded-xl bg-zinc-950 border border-zinc-800 px-4 py-2.5 text-xs text-zinc-300 focus:outline-none focus:border-emerald-500"
                    >
                      <option value="public">Công khai (Public)</option>
                      <option value="unlisted">Không công khai (Unlisted)</option>
                      <option value="private">Riêng tư (Private)</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white px-5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                  >
                    {actionLoading ? "Đang lưu..." : "Lưu Thông Tin Kênh"}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* RIGHT COLUMN: Stream Key & Chat Panels (4 cols) */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Stream key card */}
            <div className="rounded-3xl border border-white/5 bg-zinc-900/40 backdrop-blur-xl p-5 shadow-lg text-left space-y-4">
              <h2 className="text-sm font-bold text-white border-b border-zinc-800/80 pb-2.5">Khóa Luồng / Stream Key</h2>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                Sao chép khóa luồng bên dưới và dán vào phần mềm OBS/Streamlabs của bạn để phát sóng bên ngoài nếu bạn không sử dụng Studio trực tiếp.
              </p>
              
              <div className="space-y-2.5">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Khóa luồng (Stream Key)</label>
                  <div className="flex gap-2">
                    <input
                      type={showKey ? "text" : "password"}
                      value={streamKey || "Đang lấy khoá..."}
                      readOnly
                      className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs font-mono text-zinc-300 focus:outline-none"
                    />
                    <button
                      onClick={() => setShowKey(!showKey)}
                      className="bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 px-3 rounded-xl text-xs text-zinc-300 transition-colors"
                      title={showKey ? "Ẩn" : "Hiện"}
                    >
                      {showKey ? "Ẩn" : "Hiện"}
                    </button>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleCopyKey}
                    className="flex-1 inline-flex justify-center items-center gap-1.5 rounded-xl bg-emerald-600/20 border border-emerald-500/20 py-2.5 text-xs font-semibold text-emerald-400 shadow-md hover:bg-emerald-600/30 transition-all cursor-pointer"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 7.5V6.108c0-1.135.845-2.098 1.976-2.192.373-.03.748-.057 1.123-.08M15.75 18H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08M15.75 18.75v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5a1.125 1.125 0 0 1-1.125-1.125v-1.5A3.375 3.375 0 0 0 6.375 7.5H5.25m11.9-3.664A2.251 2.251 0 0 0 15 2.25h-1.5a2.251 2.251 0 0 0-2.15 1.586m5.8 0c.065.21.1.433.1.664v.75h-6V4.5c0-.231.035-.454.1-.664M6.75 7.5H4.875c-.621 0-1.125.504-1.125 1.125v12c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V16.5a9 9 0 0 0-9-9Z" />
                    </svg>
                    {isCopied ? "Đã sao chép!" : "Sao chép mã"}
                  </button>

                  <button
                    onClick={handlePopOutChat}
                    className="inline-flex justify-center items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-xs font-semibold text-zinc-300 hover:text-white hover:bg-zinc-900 transition-all cursor-pointer"
                    title="Mở chat trong cửa sổ trình duyệt nổi riêng biệt"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                    </svg>
                    Tách Chat
                  </button>
                </div>
              </div>
            </div>

            {/* FIXED CHAT PANEL (only shown if fixed mode is chosen) */}
            {chatViewMode === "fixed" && (
              <div className="rounded-3xl border border-white/5 bg-zinc-900/40 backdrop-blur-xl flex flex-col h-[500px] shadow-lg overflow-hidden">
                {/* Chat header */}
                <div className="bg-zinc-900/80 border-b border-zinc-800 px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">Kênh chat trực tiếp</h3>
                  </div>
                  
                  <button
                    onClick={() => {
                      setChatViewMode("floating");
                      // Position it floating centered
                      setFloatPos({ x: window.innerWidth - 420, y: 150 });
                    }}
                    className="text-zinc-500 hover:text-emerald-400 p-1 rounded transition-colors text-[10px] font-bold uppercase cursor-pointer"
                    title="Chuyển sang khung chat nổi trên màn hình"
                  >
                    🗗 Thu Nổi
                  </button>
                </div>

                {/* Chat Feed */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
                  {chatMessages.map((msg) => {
                    const isSystem = msg.user_id === 0;
                    const isAdmin = msg.user_id === user?.id;

                    return (
                      <div key={msg.id} className={`flex flex-col gap-0.5 text-left ${isSystem ? "items-center opacity-70" : ""}`}>
                        {!isSystem && (
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] font-bold text-zinc-100">{msg.user_name}</span>
                            {isAdmin && (
                              <span className="text-[8px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 uppercase">Chủ kênh</span>
                            )}
                          </div>
                        )}
                        <div className={`text-xs ${isSystem ? "bg-zinc-800/40 px-3 py-1 rounded-full text-zinc-400" : "text-zinc-300 bg-zinc-950/20 p-2 rounded-xl border border-white/5"}`}>
                          {msg.content}
                        </div>
                      </div>
                    );
                  })}
                  <div ref={chatEndRef} />
                </div>

                {/* Chat Input */}
                <form onSubmit={handleSendChat} className="p-3 bg-zinc-950/80 border-t border-zinc-800 flex gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Gửi tin nhắn chat..."
                    className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="submit"
                    className="bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    Gửi
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>

        {/* FLOATING DRAGGABLE CHAT PANEL (only rendered if in floating mode) */}
        {chatViewMode === "floating" && (
          <div
            style={{
              position: "absolute",
              left: `${floatPos.x}px`,
              top: `${floatPos.y}px`,
              width: "350px",
              height: "500px",
              zIndex: 9999,
            }}
            className="rounded-2xl border border-emerald-500/30 bg-zinc-950/95 backdrop-blur-2xl flex flex-col shadow-2xl shadow-emerald-950/20 overflow-hidden"
          >
            {/* Draggable header bar */}
            <div
              onMouseDown={handleDragStart}
              className="bg-zinc-900 border-b border-zinc-800 px-4 py-3 flex items-center justify-between cursor-move select-none"
            >
              <div className="flex items-center gap-2">
                <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  💬 Kênh chat nổi 
                  <span className="text-[8px] px-1 py-0.2 rounded bg-zinc-800 text-zinc-400 lowercase">kéo để di chuyển</span>
                </h3>
              </div>

              <button
                onClick={() => setChatViewMode("fixed")}
                className="text-zinc-400 hover:text-emerald-400 p-0.5 rounded transition-colors text-[10px] font-bold cursor-pointer"
                title="Ghim lại vào cột bên phải"
              >
                📌 Ghim
              </button>
            </div>

            {/* Chat Feed */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
              {chatMessages.map((msg) => {
                const isSystem = msg.user_id === 0;
                const isAdmin = msg.user_id === user?.id;

                return (
                  <div key={msg.id} className={`flex flex-col gap-0.5 text-left ${isSystem ? "items-center opacity-70" : ""}`}>
                    {!isSystem && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-bold text-zinc-100">{msg.user_name}</span>
                        {isAdmin && (
                          <span className="text-[8px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 uppercase">Chủ kênh</span>
                        )}
                      </div>
                    )}
                    <div className={`text-xs ${isSystem ? "bg-zinc-800/40 px-3 py-1 rounded-full text-zinc-400" : "text-zinc-300 bg-zinc-900/50 p-2 rounded-xl border border-white/5"}`}>
                      {msg.content}
                    </div>
                  </div>
                );
              })}
              <div ref={chatEndRef} />
            </div>

            {/* Chat Input */}
            <form onSubmit={handleSendChat} className="p-3 bg-zinc-950 border-t border-zinc-800 flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Gửi tin nhắn chat..."
                className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
              <button
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Gửi
              </button>
            </form>
          </div>
        )}

      </div>
    </MainLayout>
  );
}
