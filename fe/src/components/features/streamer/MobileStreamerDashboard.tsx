"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import QRCode from "qrcode";
import { MainLayout } from "@/components/layouts";
import { useAuth } from "@/hooks/useAuth";
import { apiClient, getAPIBaseURL } from "@/lib/api-client";

type RoomStatus = "offline" | "ready" | "live" | "ended";
type Visibility = "public" | "private" | "unlisted";

interface Category {
  id: number;
  name: string;
}

interface Room {
  id: number;
  title: string;
  category_id?: number;
  status: RoomStatus;
  visibility: Visibility;
}

interface ChatMessage {
  id: string;
  user_name: string;
  content: string;
  type: string;
  coin?: number;
}

export function MobileStreamerDashboard() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [room, setRoom] = useState<Room | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [streamKey, setStreamKey] = useState("");
  const [title, setTitle] = useState("");
  const [categoryID, setCategoryID] = useState<number | "">("");
  const [cameraFacing, setCameraFacing] = useState<"user" | "environment">("user");
  const [cameraActive, setCameraActive] = useState(false);
  const [notice, setNotice] = useState("");
  const [activity, setActivity] = useState<ChatMessage[]>([]);
  const [qrCode, setQRCode] = useState<{ content: string; imageURL: string } | null>(null);
  const [showQRCode, setShowQRCode] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const streamURL = typeof window === "undefined" ? "rtmp://localhost:1935/src" : `rtmp://${window.location.hostname}:1935/src`;
  const rtmpPublishURL = streamKey ? `${streamURL}/${streamKey}` : "";
  const qrCodeURL = qrCode?.content === rtmpPublishURL ? qrCode.imageURL : "";

  useEffect(() => {
    if (!rtmpPublishURL) return;

    let active = true;
    void QRCode.toDataURL(rtmpPublishURL, {
      width: 280,
      margin: 1,
      errorCorrectionLevel: "M",
      color: { dark: "#18181b", light: "#ffffff" },
    })
      .then((dataURL) => {
        if (active) setQRCode({ content: rtmpPublishURL, imageURL: dataURL });
      })
      .catch(() => {
        if (active) setNotice("Không thể tạo mã QR.");
      });

    return () => {
      active = false;
    };
  }, [rtmpPublishURL]);

  useEffect(() => {
    if (authLoading || !isAuthenticated || user?.role !== "author") return;
    const load = async () => {
      try {
        const [loadedCategories, rooms] = await Promise.all([
          apiClient.get<Category[]>("/api/categories"),
          apiClient.get<Room[]>("/api/rooms/me"),
        ]);
        setCategories(loadedCategories);
        const current = rooms[0];
        if (current) {
          setRoom(current);
          setTitle(current.title);
          setCategoryID(current.category_id ?? "");
          const key = await apiClient.get<{ stream_key: string }>(`/api/rooms/${current.id}/stream-key`);
          setStreamKey(key.stream_key);
          return;
        }
        const created = await apiClient.post<Room>("/api/rooms", {
          title: `Live talk cùng ${user.name}`,
          visibility: "public",
        });
        setRoom(created);
        setTitle(created.title);
        const key = await apiClient.get<{ stream_key: string }>(`/api/rooms/${created.id}/stream-key`);
        setStreamKey(key.stream_key);
      } catch {
        setNotice("Không thể tải studio mobile. Hãy kiểm tra kết nối API.");
      }
    };
    void load();
  }, [authLoading, isAuthenticated, user]);

  const roomID = room?.id;

  useEffect(() => {
    if (!roomID) return;
    const source = new EventSource(`${getAPIBaseURL()}/api/rooms/${roomID}/chat/stream`);
    source.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as ChatMessage;
        setActivity((previous) => [message, ...previous].slice(0, 4));
      } catch {
        // Ignore invalid SSE frames and keep the connection open.
      }
    };
    return () => source.close();
  }, [roomID]);

  useEffect(() => () => streamRef.current?.getTracks().forEach((track) => track.stop()), []);

  const enableCamera = async () => {
    try {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: cameraFacing } },
        audio: true,
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setCameraActive(true);
      setNotice("");
    } catch {
      setNotice("Trình duyệt chưa được cấp quyền camera hoặc microphone.");
    }
  };

  const switchCamera = async () => {
    setCameraFacing((value) => (value === "user" ? "environment" : "user"));
    if (cameraActive) window.setTimeout(() => void enableCamera(), 0);
  };

  const copy = async (value: string, label: string) => {
    try {
      if (navigator.clipboard?.writeText && window.isSecureContext) {
        await navigator.clipboard.writeText(value);
      } else {
        // Clipboard API is unavailable when the studio is opened over HTTP on
        // a LAN IP address, which is common while testing from a phone.
        const textarea = document.createElement("textarea");
        textarea.value = value;
        textarea.setAttribute("readonly", "");
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        const copied = document.execCommand("copy");
        textarea.remove();
        if (!copied) throw new Error("Copy command was rejected");
      }
      setNotice(`${label} đã được sao chép.`);
    } catch {
      setNotice(`Không thể sao chép ${label.toLowerCase()}. Hãy nhấn giữ để sao chép thủ công.`);
    }
  };

  const saveTalkSettings = async () => {
    if (!room || !title.trim()) return;
    try {
      const updated = await apiClient.put<Room>(`/api/rooms/${room.id}`, {
        title: title.trim(),
        category_id: categoryID || null,
        visibility: "public",
      });
      setRoom(updated);
      setNotice("Đã lưu thông tin buổi Talk/IRL.");
    } catch {
      setNotice("Không thể lưu thông tin phiên live.");
    }
  };

  const prepareStream = async () => {
    if (!room) return;
    try {
      const updated = await apiClient.post<Room>(`/api/rooms/${room.id}/live`);
      setRoom(updated);
      setNotice("Đã sẵn sàng. Mở PRISM hoặc Larix trên điện thoại và bắt đầu phát RTMP.");
    } catch {
      setNotice("Không thể chuẩn bị livestream.");
    }
  };

  if (!authLoading && (!isAuthenticated || user?.role !== "author")) {
    return <MainLayout><div className="mx-auto max-w-md py-16 text-center"><h1 className="text-2xl font-bold">Studio mobile dành cho streamer</h1><p className="mt-3 text-sm text-zinc-500">Bạn cần tài khoản streamer đã được phê duyệt.</p><Link className="mt-6 inline-flex rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white" href="/">Quay lại trang chủ</Link></div></MainLayout>;
  }

  return (
    <MainLayout>
      <main className="mx-auto w-full max-w-lg overflow-x-hidden pb-8">
        <section className="relative overflow-hidden rounded-3xl bg-zinc-950 px-5 py-6 text-white shadow-xl">
          <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-emerald-500/30 blur-3xl" />
          <p className="relative text-sm font-semibold text-emerald-300">Mobile studio</p>
          <h1 className="relative mt-1 max-w-5xl text-3xl font-black tracking-tight">Talk và IRL trực tiếp từ điện thoại.</h1>
          <p className="relative mt-3 text-sm leading-6 text-zinc-300">Dùng camera để kiểm tra khung hình, sau đó phát ổn định qua ứng dụng RTMP.</p>
          <div className="relative mt-5 flex items-center justify-between rounded-2xl border border-white/10 bg-white/10 px-4 py-3">
            <span className="text-xs text-zinc-300">Trạng thái room</span>
            <span className="text-sm font-bold text-emerald-300">{room?.status ?? "đang tải"}</span>
          </div>
        </section>

        <section className="mt-5 overflow-hidden rounded-3xl border border-zinc-200 bg-zinc-950 shadow-lg dark:border-white/10">
          <div className="relative aspect-[9/14] bg-black">
            <video ref={videoRef} autoPlay muted playsInline className={`h-full w-full object-cover ${cameraActive ? "block" : "hidden"}`} />
            {!cameraActive && <div className="absolute inset-0 flex flex-col items-center justify-center px-8 text-center text-zinc-400"><span className="text-sm font-semibold">Camera preview</span><span className="mt-2 text-xs leading-5">Chỉ dùng để căn khung Talk/IRL. Hãy dùng PRISM hoặc Larix để gửi RTMP.</span></div>}
            <div className="absolute bottom-4 left-4 right-4 grid grid-cols-2 gap-2">
              <button onClick={() => void enableCamera()} className="rounded-xl bg-white px-3 py-3 text-xs font-bold text-zinc-950">{cameraActive ? "Làm mới camera" : "Mở camera"}</button>
              <button onClick={() => void switchCamera()} className="rounded-xl border border-white/20 bg-black/55 px-3 py-3 text-xs font-bold text-white">Đổi trước/sau</button>
            </div>
          </div>
        </section>

        <section className="mt-5 grid grid-flow-dense grid-cols-2 gap-3">
          <div className="col-span-2 rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-zinc-900">
            <label className="text-xs font-bold text-zinc-600 dark:text-zinc-300">Tiêu đề buổi Talk</label>
            <input value={title} onChange={(event) => setTitle(event.target.value)} className="mt-2 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-3 text-sm text-zinc-900 outline-none focus:border-emerald-500 dark:border-white/10 dark:bg-zinc-950 dark:text-white" />
            <label className="mt-4 block text-xs font-bold text-zinc-600 dark:text-zinc-300">Danh mục</label>
            <select value={categoryID} onChange={(event) => setCategoryID(event.target.value ? Number(event.target.value) : "")} className="mt-2 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-3 text-sm text-zinc-900 outline-none focus:border-emerald-500 dark:border-white/10 dark:bg-zinc-950 dark:text-white">
              <option value="">Chọn danh mục</option>
              {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </select>
            <button onClick={() => void saveTalkSettings()} className="mt-3 w-full rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm font-bold text-emerald-700 dark:text-emerald-300">Lưu Talk mode</button>
          </div>

          <button onClick={() => void copy(streamURL, "Máy chủ RTMP")} className="rounded-2xl bg-emerald-600 px-3 py-4 text-left text-white shadow-lg"><span className="block text-xs opacity-80">RTMP server</span><span className="mt-1 block truncate font-mono text-xs">{streamURL}</span></button>
          <button onClick={() => void copy(streamKey, "Stream key")} className="rounded-2xl bg-zinc-900 px-3 py-4 text-left text-white shadow-lg"><span className="block text-xs text-zinc-400">Stream key</span><span className="mt-1 block truncate font-mono text-xs">Sao chép key</span></button>
          <button onClick={() => setShowQRCode(true)} disabled={!qrCodeURL} className="col-span-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-4 text-left text-emerald-800 shadow-sm disabled:cursor-not-allowed disabled:opacity-50 dark:text-emerald-200"><span className="block text-xs font-bold uppercase tracking-wide">Thiết lập nhanh</span><span className="mt-1 block text-sm font-black">Hiện mã QR RTMP</span><span className="mt-1 block text-xs opacity-75">Quét để sao chép URL phát có kèm stream key.</span></button>
        </section>

        <button onClick={() => void prepareStream()} disabled={!room || room.status === "ready" || room.status === "live"} className="mt-5 w-full rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 px-5 py-4 text-sm font-black text-white shadow-lg disabled:cursor-not-allowed disabled:opacity-50">{room?.status === "live" ? "Đang live" : room?.status === "ready" ? "Đang chờ tín hiệu RTMP" : "Chuẩn bị livestream"}</button>
        {notice && <p className="mt-3 rounded-xl bg-zinc-100 px-4 py-3 text-xs leading-5 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-300">{notice}</p>}

        <section className="mt-5 rounded-3xl border border-zinc-200 bg-white p-5 dark:border-white/10 dark:bg-zinc-900">
          <h2 className="text-sm font-bold">Tương tác gần đây</h2>
          <div className="mt-3 space-y-3">{activity.length === 0 ? <p className="text-xs text-zinc-500">Chat và donation sẽ hiển thị tại đây khi room nhận event.</p> : activity.map((message) => <div key={message.id} className="border-l-2 border-emerald-500 pl-3"><p className="text-xs font-bold">{message.user_name}{message.type === "gift" && ` gửi ${message.coin ?? 0} coins`}</p><p className="mt-1 text-xs text-zinc-500">{message.content}</p></div>)}</div>
        </section>
      </main>

      {showQRCode && qrCodeURL && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-5" role="dialog" aria-modal="true" aria-label="Mã QR RTMP">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-2xl dark:bg-zinc-900">
            <p className="text-sm font-black text-zinc-900 dark:text-white">Quét mã để thiết lập RTMP</p>
            <p className="mt-2 text-xs leading-5 text-zinc-500 dark:text-zinc-400">Mã chứa server và stream key. Không chia sẻ ảnh này cho người khác.</p>
            <Image src={qrCodeURL} alt="Mã QR chứa URL RTMP và stream key" width={256} height={256} unoptimized className="mx-auto mt-5 rounded-xl" />
            <button onClick={() => setShowQRCode(false)} className="mt-5 w-full rounded-xl bg-zinc-900 px-4 py-3 text-sm font-bold text-white dark:bg-white dark:text-zinc-900">Đóng</button>
          </div>
        </div>
      )}
    </MainLayout>
  );
}
