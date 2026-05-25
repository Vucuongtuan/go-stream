"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Header } from "@/components/layouts";
import { apiClient } from "@/lib/api-client";

interface Category {
  id: number;
  name: string;
  slug: string;
  type: string;
}

interface AuthorCandidate {
  id: number;
  user_id: number;
  display_name: string;
  bio?: string;
  avatar?: string;
  status: "pending" | "approved" | "suspended" | "rejected";
  applied_at: string;
  user: {
    id: number;
    name: string;
    avatar?: string;
  };
  categories?: Category[];
}

export default function AdminDashboardPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [candidates, setCandidates] = useState<AuthorCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filter and search states
  const [activeTab, setActiveTab] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated || user?.role !== "admin") {
        router.push("/");
      }
    }
  }, [isAuthenticated, user, authLoading, router]);

  const fetchCandidates = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const data = await apiClient.get<AuthorCandidate[]>("/api/admin/authors");
      setCandidates(data || []);
    } catch (err: any) {
      setErrorMessage(err.message || "Không thể tải danh sách ứng viên.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && user?.role === "admin") {
      fetchCandidates();
    }
  }, [isAuthenticated, user]);

  const handleApprove = async (id: number) => {
    setProcessingId(id);
    setSuccessMessage(null);
    setErrorMessage(null);
    try {
      await apiClient.put(`/api/admin/authors/${id}/approve`);
      setSuccessMessage("Phê duyệt Streamer thành công!");
      await fetchCandidates();
    } catch (err: any) {
      setErrorMessage(err.message || "Có lỗi xảy ra khi phê duyệt ứng viên.");
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id: number) => {
    setProcessingId(id);
    setSuccessMessage(null);
    setErrorMessage(null);
    try {
      await apiClient.put(`/api/admin/authors/${id}/reject`);
      setSuccessMessage("Đã từ chối đơn ứng tuyển.");
      await fetchCandidates();
    } catch (err: any) {
      setErrorMessage(err.message || "Có lỗi xảy ra khi từ chối ứng viên.");
    } finally {
      setProcessingId(null);
    }
  };

  // Helper to format date
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateString;
    }
  };

  // Metrics calculations
  const totalCount = candidates.length;
  const pendingCount = candidates.filter((c) => c.status === "pending").length;
  const approvedCount = candidates.filter((c) => c.status === "approved").length;
  const rejectedCount = candidates.filter((c) => c.status === "rejected").length;

  // Filter candidates
  const filteredCandidates = candidates.filter((candidate) => {
    const matchesTab = activeTab === "all" || candidate.status === activeTab;
    const matchesSearch =
      candidate.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      candidate.user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (candidate.bio && candidate.bio.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesTab && matchesSearch;
  });

  if (authLoading || !isAuthenticated || user?.role !== "admin") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-100">
        <div className="text-center space-y-4">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
          <p className="text-sm text-zinc-400 font-medium animate-pulse">Đang xác thực quyền Admin...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 text-zinc-100 antialiased overflow-x-hidden">
      <Header />

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8 space-y-8">
        {/* Title Block */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-zinc-800 pb-5">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
              <span className="h-6 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.5)]" />
              Bảng Phê Duyệt Streamer
            </h1>
            <p className="mt-1 text-sm text-zinc-400">
              Quản lý và duyệt đơn đăng ký trở thành Streamer/Author trên hệ thống Go-Stream.
            </p>
          </div>
          <button
            onClick={fetchCandidates}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 hover:border-zinc-700 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed text-zinc-300"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className={`h-3.5 w-3.5 ${loading ? "animate-spin text-emerald-400" : ""}`}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
              />
            </svg>
            Làm mới danh sách
          </button>
        </div>

        {/* Global Notifications */}
        {errorMessage && (
          <div className="rounded-lg border border-red-500/10 bg-red-500/5 p-4 text-sm text-red-400 flex gap-2 border-l-4 border-l-red-500">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5 shrink-0 text-red-400">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
            </svg>
            <span>{errorMessage}</span>
          </div>
        )}
        {successMessage && (
          <div className="rounded-lg border border-emerald-500/10 bg-emerald-500/5 p-4 text-sm text-emerald-400 flex gap-2 border-l-4 border-l-emerald-500">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5 shrink-0 text-emerald-400">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
            </svg>
            <span>{successMessage}</span>
          </div>
        )}

        {/* Analytics Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative overflow-hidden rounded-xl bg-zinc-900/60 backdrop-blur-md border border-zinc-800/80 p-5 shadow-lg">
            <div className="text-zinc-500 text-xs font-bold uppercase tracking-wider">Tổng Đơn Đăng Ký</div>
            <div className="mt-2 text-3xl font-extrabold text-white tracking-tight">{totalCount}</div>
            <div className="absolute right-4 bottom-4 text-zinc-800">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-10 w-10">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.109A11.386 11.386 0 0110.089 20c-2.202 0-4.275-.623-6.045-1.708l-.292-.18a1.5 1.5 0 01-.696-1.287V13.5A2.25 2.25 0 015.39 11.3a11.026 11.026 0 0112.528 0 2.25 2.25 0 011.66 2.2v2.285a1.5 1.5 0 01-.696 1.287l-.292.18z" />
              </svg>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-xl bg-zinc-900/60 backdrop-blur-md border border-amber-500/20 p-5 shadow-lg shadow-amber-500/[0.02]">
            <div className="text-amber-500/80 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
              Chờ Phê Duyệt
            </div>
            <div className="mt-2 text-3xl font-extrabold text-amber-400 tracking-tight">{pendingCount}</div>
            <div className="absolute right-4 bottom-4 text-amber-500/10">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-10 w-10">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-xl bg-zinc-900/60 backdrop-blur-md border border-emerald-500/25 p-5 shadow-lg shadow-emerald-500/[0.03]">
            <div className="text-emerald-400 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]" />
              Đã Chấp Thuận
            </div>
            <div className="mt-2 text-3xl font-extrabold text-emerald-400 tracking-tight">{approvedCount}</div>
            <div className="absolute right-4 bottom-4 text-emerald-500/10">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-10 w-10">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-xl bg-zinc-900/60 backdrop-blur-md border border-red-500/20 p-5 shadow-lg shadow-red-500/[0.02]">
            <div className="text-red-400 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
              Đã Từ Chối
            </div>
            <div className="mt-2 text-3xl font-extrabold text-red-400 tracking-tight">{rejectedCount}</div>
            <div className="absolute right-4 bottom-4 text-red-500/10">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-10 w-10">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Filters and Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-zinc-900/40 p-4 border border-zinc-800/80 rounded-xl">
          {/* Segment controls Tabs */}
          <div className="flex flex-wrap p-1 bg-zinc-950/80 border border-zinc-850 rounded-lg max-w-md">
            <button
              onClick={() => setActiveTab("pending")}
              className={`flex-1 min-w-[70px] px-3.5 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
                activeTab === "pending"
                  ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-950/40"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Chờ duyệt ({pendingCount})
            </button>
            <button
              onClick={() => setActiveTab("approved")}
              className={`flex-1 min-w-[70px] px-3.5 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
                activeTab === "approved"
                  ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-950/40"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Chấp thuận ({approvedCount})
            </button>
            <button
              onClick={() => setActiveTab("rejected")}
              className={`flex-1 min-w-[70px] px-3.5 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
                activeTab === "rejected"
                  ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-950/40"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Từ chối ({rejectedCount})
            </button>
            <button
              onClick={() => setActiveTab("all")}
              className={`flex-1 min-w-[70px] px-3.5 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
                activeTab === "all"
                  ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-950/40"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Tất cả ({totalCount})
            </button>
          </div>

          {/* Search box */}
          <div className="relative max-w-sm w-full">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-zinc-500">
                <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Tìm theo tên hiển thị, bio..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-9 pr-8 py-2 rounded-lg border border-zinc-800 bg-zinc-950 text-sm text-zinc-100 placeholder-zinc-500 shadow-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 focus:outline-none transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-zinc-500 hover:text-zinc-300"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                  <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Candidates Listing Grid */}
        {loading ? (
          <div className="py-20 text-center space-y-4">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
            <p className="text-sm text-zinc-400 animate-pulse font-medium">Đang tìm dữ liệu ứng cử viên...</p>
          </div>
        ) : filteredCandidates.length === 0 ? (
          <div className="py-24 rounded-xl border border-zinc-900 bg-zinc-900/20 text-center space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-zinc-900 text-zinc-600">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-6 w-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">Không có đơn ứng tuyển nào</h3>
              <p className="text-xs text-zinc-500 max-w-xs mx-auto">
                Không tìm thấy đơn ứng tuyển nào khớp với bộ lọc &quot;{activeTab}&quot; hoặc từ khóa tìm kiếm của bạn.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredCandidates.map((candidate) => (
              <div
                key={candidate.id}
                className="relative flex flex-col justify-between overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/60 backdrop-blur-md p-5 shadow-lg hover:border-emerald-500/40 hover:shadow-emerald-950/[0.05] transition-all duration-300 group"
              >
                {/* Visual Glow Layer */}
                <div className="absolute -right-16 -top-16 h-36 w-36 rounded-full bg-emerald-500/5 blur-3xl group-hover:bg-emerald-500/10 transition-all duration-300" />

                {/* Card Header Info */}
                <div className="space-y-3.5 relative z-10">
                  <div className="flex items-start justify-between">
                    {/* User profile avatar details */}
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-sm font-black text-white shadow-inner uppercase">
                        {candidate.display_name.slice(0, 2)}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white tracking-wide truncate max-w-[150px]">
                          {candidate.display_name}
                        </h3>
                        <p className="text-[11px] text-zinc-400 flex items-center gap-1">
                          User: <strong className="text-zinc-300 font-semibold">{candidate.user.name}</strong> (ID: {candidate.user_id})
                        </p>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                        candidate.status === "pending"
                          ? "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                          : candidate.status === "approved"
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : "bg-red-500/10 text-red-400 border border-red-500/20"
                      }`}
                    >
                      {candidate.status === "pending" && <span className="h-1 w-1 rounded-full bg-amber-500 animate-pulse" />}
                      {candidate.status === "approved" && <span className="h-1 w-1 rounded-full bg-emerald-500" />}
                      {candidate.status === "rejected" && <span className="h-1 w-1 rounded-full bg-red-500" />}
                      {candidate.status}
                    </span>
                  </div>

                  {/* Categories Tags */}
                  {candidate.categories && candidate.categories.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {candidate.categories.map((cat) => (
                        <span
                          key={cat.id}
                          className="inline-flex items-center rounded-md bg-zinc-950 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-zinc-800"
                        >
                          {cat.name}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-[10px] italic text-zinc-500 font-medium">Không chỉ định thể loại chính</span>
                  )}

                  {/* Candidate Bio */}
                  <div className="bg-zinc-950/60 border border-zinc-850/50 rounded-lg p-3 text-xs leading-relaxed text-zinc-400 min-h-[72px] line-clamp-3 select-all hover:line-clamp-none transition-all">
                    {candidate.bio ? candidate.bio : <span className="italic text-zinc-600">Không có giới thiệu ngắn.</span>}
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="mt-5 pt-4 border-t border-zinc-800/80 flex items-center justify-between gap-3 relative z-10">
                  <span className="text-[10px] font-semibold text-zinc-500 tracking-wider">
                    Gửi lúc: {formatDate(candidate.applied_at)}
                  </span>

                  {candidate.status === "pending" && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleReject(candidate.id)}
                        disabled={processingId !== null}
                        className="inline-flex items-center justify-center rounded-lg border border-red-500/20 hover:border-red-500/40 bg-red-500/5 hover:bg-red-500/10 text-[11px] font-extrabold px-3 py-1.5 text-red-400 hover:text-red-300 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Từ chối
                      </button>
                      <button
                        onClick={() => handleApprove(candidate.id)}
                        disabled={processingId !== null}
                        className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-[11px] font-extrabold px-3 py-1.5 text-white shadow-md shadow-emerald-950/20 hover:shadow-emerald-500/10 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {processingId === candidate.id ? (
                          <div className="h-3 w-3 animate-spin rounded-full border border-white border-t-transparent" />
                        ) : null}
                        Duyệt
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
