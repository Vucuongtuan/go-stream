"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Header } from "@/components/layouts";
import { apiClient } from "@/lib/api-client";
import { analyticsService, LeaderboardEntry, LeaderboardMetric, LeaderboardPeriod } from "@/services/analytics.service";
import { 
  Plus, 
  Trash2, 
  Edit3, 
  Coins, 
  Upload, 
  ShieldCheck, 
  Image as ImageIcon, 
  X, 
  Check, 
  RefreshCw, 
  UserCheck, 
  Gift as GiftIcon,
  FolderOpen,
  Gamepad2,
  BarChart3,
  ChevronDown,
  ChevronUp,
  Search,
  MessageSquare,
  Users,
  TrendingUp
} from "lucide-react";

interface Category {
  id: number;
  name: string;
  slug: string;
  type: string;
  icon?: string;
  description?: string;
  sort_order?: number;
}

interface Game {
  id: number;
  category_id: number;
  name: string;
  slug: string;
  cover_image?: string;
  description?: string;
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

interface Gift {
  id: number;
  name: string;
  coin_price: number;
  image_url: string;
  created_at?: string;
}

function resolveMediaURL(url?: string) {
  if (!url || url.startsWith("http") || url.startsWith("data:")) return url;
  return `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"}${url}`;
}

export function AdminDashboard() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();

  // Navigation tabs: "streamer" | "categories" | "gifts" | "analytics"
  const [currentTab, setCurrentTab] = useState<"streamer" | "categories" | "gifts" | "analytics">("streamer");

  // General States
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // TAB 1: Streamer states
  const [candidates, setCandidates] = useState<AuthorCandidate[]>([]);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [activeCandidateTab, setActiveCandidateTab] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const [searchQuery, setSearchQuery] = useState("");

  // TAB 2: Categories & Games states
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [categoryGames, setCategoryGames] = useState<Game[]>([]);
  const [gamesLoading, setGamesLoading] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showGameModal, setShowGameModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  
  // Category Form
  const [catName, setCatName] = useState("");
  const [catSlug, setCatSlug] = useState("");
  const [catType, setCatType] = useState("game");
  const [catDesc, setCatDesc] = useState("");
  const [catImageFile, setCatImageFile] = useState<File | null>(null);
  const [catImagePreview, setCatImagePreview] = useState<string | null>(null);
  const catFileInputRef = useRef<HTMLInputElement>(null);
  
  // Game Form
  const [gameName, setGameName] = useState("");
  const [gameSlug, setGameSlug] = useState("");
  const [gameCover, setGameCover] = useState("");
  const [gameDesc, setGameDesc] = useState("");

  // TAB 3: Gift states
  const [gifts, setGifts] = useState<Gift[]>([]);
  const [giftsLoading, setGiftsLoading] = useState(false);
  const [showGiftModal, setShowGiftModal] = useState(false);
  const [editingGift, setEditingGift] = useState<Gift | null>(null);
  
  // Gift Form
  const [giftName, setGiftName] = useState("");
  const [giftPrice, setGiftPrice] = useState(50);
  const [giftImageFile, setGiftImageFile] = useState<File | null>(null);
  const [giftImagePreview, setGiftImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // TAB 4: Analytics states
  const [leaderboardMetric, setLeaderboardMetric] = useState<LeaderboardMetric>("donate");
  const [leaderboardPeriod, setLeaderboardPeriod] = useState<LeaderboardPeriod>("weekly");
  const [analyticsData, setAnalyticsData] = useState<LeaderboardEntry[]>([]);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

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

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const data = await apiClient.get<Category[]>("/api/categories");
      setCategories(data || []);
    } catch (err: any) {
      setErrorMessage(err.message || "Không thể tải danh sách thể loại.");
    } finally {
      setLoading(false);
    }
  };

  const fetchGifts = async () => {
    setGiftsLoading(true);
    try {
      const data = await apiClient.get<Gift[]>("/api/gifts");
      setGifts(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setErrorMessage(err.message || "Không thể tải danh sách quà tặng.");
    } finally {
      setGiftsLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    setAnalyticsLoading(true);
    try {
      const data = await analyticsService.getLeaderboard(leaderboardMetric, leaderboardPeriod, 10);
      setAnalyticsData(data?.entries || []);
    } catch (err: any) {
      setErrorMessage("Không thể tải số liệu thống kê hệ thống.");
    } finally {
      setAnalyticsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && user?.role === "admin") {
      if (currentTab === "streamer") fetchCandidates();
      if (currentTab === "categories") fetchCategories();
      if (currentTab === "gifts") fetchGifts();
      if (currentTab === "analytics") fetchAnalytics();
    }
  }, [isAuthenticated, user, currentTab, leaderboardMetric, leaderboardPeriod]);

  // Streamer approvals
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

  // Category CRUD
  const handleCatImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCatImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setCatImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const openAddCategoryModal = () => {
    setEditingCategory(null);
    setCatName("");
    setCatSlug("");
    setCatType("game");
    setCatDesc("");
    setCatImageFile(null);
    setCatImagePreview(null);
    setShowCategoryModal(true);
  };

  const openEditCategoryModal = (cat: Category) => {
    setEditingCategory(cat);
    setCatName(cat.name);
    setCatSlug(cat.slug);
    setCatType(cat.type);
    setCatDesc(cat.description || "");
    setCatImageFile(null);
    setCatImagePreview(cat.icon || null);
    setShowCategoryModal(true);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMessage(null);
    setErrorMessage(null);

    const formData = new FormData();
    formData.append("name", catName);
    formData.append("slug", catSlug || catName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""));
    formData.append("type", catType);
    formData.append("description", catDesc);
    if (catImageFile) {
      formData.append("icon", catImageFile);
    } else if (editingCategory && editingCategory.icon) {
      // Keep old icon if not updating
      formData.append("icon_url", editingCategory.icon);
    }

    setLoading(true);
    try {
      if (editingCategory) {
        await apiClient.put(`/api/categories/${editingCategory.id}`, undefined, { body: formData });
        setSuccessMessage("Cập nhật thể loại thành công!");
      } else {
        await apiClient.post("/api/categories", undefined, { body: formData });
        setSuccessMessage("Tạo thể loại mới thành công!");
      }
      setShowCategoryModal(false);
      await fetchCategories();
    } catch (err: any) {
      setErrorMessage(err.message || "Không thể lưu thể loại.");
    } finally {
      setLoading(false);
    }
  };

  // Category Games sub-management
  const handleSelectCategory = async (cat: Category) => {
    if (selectedCategory?.id === cat.id) {
      setSelectedCategory(null);
      setCategoryGames([]);
      return;
    }
    setSelectedCategory(cat);
    setGamesLoading(true);
    try {
      const data = await apiClient.get<Game[]>(`/api/categories/${cat.id}/games`);
      setCategoryGames(data || []);
    } catch {
      setCategoryGames([]);
    } finally {
      setGamesLoading(false);
    }
  };

  const openAddGameModal = () => {
    setGameName("");
    setGameSlug("");
    setGameCover("");
    setGameDesc("");
    setShowGameModal(true);
  };

  const handleSaveGame = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCategory) return;
    setSuccessMessage(null);
    setErrorMessage(null);

    const payload = {
      name: gameName,
      slug: gameSlug || gameName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
      cover_image: gameCover,
      description: gameDesc,
    };

    setLoading(true);
    try {
      await apiClient.post(`/api/categories/${selectedCategory.id}/games`, payload);
      setSuccessMessage("Thêm trò chơi thành công!");
      setShowGameModal(false);
      
      // Refresh games list
      const data = await apiClient.get<Game[]>(`/api/categories/${selectedCategory.id}/games`);
      setCategoryGames(data || []);
    } catch (err: any) {
      setErrorMessage(err.message || "Không thể thêm trò chơi.");
    } finally {
      setLoading(false);
    }
  };

  // Gift Form Handlers
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setGiftImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setGiftImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const openAddGiftModal = () => {
    setEditingGift(null);
    setGiftName("");
    setGiftPrice(50);
    setGiftImageFile(null);
    setGiftImagePreview(null);
    setShowGiftModal(true);
  };

  const openEditGiftModal = (gift: Gift) => {
    setEditingGift(gift);
    setGiftName(gift.name);
    setGiftPrice(gift.coin_price);
    setGiftImageFile(null);
    setGiftImagePreview(gift.image_url);
    setShowGiftModal(true);
  };

  const handleSaveGift = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMessage(null);
    setErrorMessage(null);

    if (!giftName.trim()) {
      setErrorMessage("Vui lòng nhập tên quà tặng.");
      return;
    }

    if (giftPrice <= 0) {
      setErrorMessage("Giá trị Coin phải lớn hơn 0.");
      return;
    }

    const formData = new FormData();
    formData.append("name", giftName);
    formData.append("coin_price", giftPrice.toString());
    if (giftImageFile) {
      formData.append("image", giftImageFile);
    }

    setLoading(true);
    try {
      if (editingGift) {
        await apiClient.put(`/api/admin/gifts/${editingGift.id}`, undefined, { body: formData });
        setSuccessMessage("Cập nhật quà tặng thành công!");
      } else {
        if (!giftImageFile) {
          setErrorMessage("Vui lòng tải lên hình ảnh của quà tặng.");
          setLoading(false);
          return;
        }
        await apiClient.post("/api/admin/gifts", undefined, { body: formData });
        setSuccessMessage("Thêm quà tặng mới thành công!");
      }
      setShowGiftModal(false);
      await fetchGifts();
    } catch (err: any) {
      setErrorMessage(err.message || "Không thể lưu quà tặng.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteGift = async (id: number) => {
    if (!confirm("Bạn có chắc chắn muốn xóa quà tặng này?")) return;
    setSuccessMessage(null);
    setErrorMessage(null);
    try {
      await apiClient.delete(`/api/admin/gifts/${id}`);
      setSuccessMessage("Xóa quà tặng thành công!");
      await fetchGifts();
    } catch (err: any) {
      setErrorMessage(err.message || "Không thể xóa quà tặng.");
    }
  };

  // Helper date formatter
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

  // Filter Streamer candidates
  const totalCount = candidates.length;
  const pendingCount = candidates.filter((c) => c.status === "pending").length;
  const approvedCount = candidates.filter((c) => c.status === "approved").length;
  const rejectedCount = candidates.filter((c) => c.status === "rejected").length;

  const filteredCandidates = candidates.filter((candidate) => {
    const matchesTab = activeCandidateTab === "all" || candidate.status === activeCandidateTab;
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

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8 space-y-6">
        
        {/* Navigation Tabs (Header menu style) */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-zinc-900 pb-2 gap-4">
          <div className="flex flex-wrap gap-4">
            <button
              onClick={() => setCurrentTab("streamer")}
              className={`flex items-center gap-2 pb-3 px-1 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
                currentTab === "streamer"
                  ? "border-emerald-500 text-emerald-400 font-bold"
                  : "border-transparent text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <UserCheck className="h-4 w-4" />
              Duyệt Streamer
            </button>
            <button
              onClick={() => setCurrentTab("categories")}
              className={`flex items-center gap-2 pb-3 px-1 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
                currentTab === "categories"
                  ? "border-emerald-500 text-emerald-400 font-bold"
                  : "border-transparent text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <FolderOpen className="h-4 w-4" />
              Thể Loại & Game
            </button>
            <button
              onClick={() => setCurrentTab("gifts")}
              className={`flex items-center gap-2 pb-3 px-1 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
                currentTab === "gifts"
                  ? "border-emerald-500 text-emerald-400 font-bold"
                  : "border-transparent text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <GiftIcon className="h-4 w-4" />
              Quản lý Donate
            </button>
            <button
              onClick={() => setCurrentTab("analytics")}
              className={`flex items-center gap-2 pb-3 px-1 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
                currentTab === "analytics"
                  ? "border-emerald-500 text-emerald-400 font-bold"
                  : "border-transparent text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <BarChart3 className="h-4 w-4" />
              Báo cáo Hệ thống
            </button>
          </div>

          <button
            onClick={() => {
              if (currentTab === "streamer") fetchCandidates();
              if (currentTab === "categories") fetchCategories();
              if (currentTab === "gifts") fetchGifts();
              if (currentTab === "analytics") fetchAnalytics();
            }}
            disabled={loading || giftsLoading || analyticsLoading}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg bg-zinc-900 hover:bg-zinc-800 transition-all cursor-pointer text-zinc-300 border border-zinc-800/40"
          >
            <RefreshCw className={`h-3 w-3 ${loading || giftsLoading || analyticsLoading ? "animate-spin text-emerald-400" : ""}`} />
            Làm mới dữ liệu
          </button>
        </div>

        {/* Global Notifications */}
        {errorMessage && (
          <div className="rounded-lg border border-red-500/10 bg-red-500/5 p-4 text-xs text-red-400 flex items-center justify-between gap-2">
            <span className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-red-500 shrink-0" />
              {errorMessage}
            </span>
            <button onClick={() => setErrorMessage(null)} className="text-zinc-550 hover:text-zinc-300">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        {successMessage && (
          <div className="rounded-lg border border-emerald-500/10 bg-emerald-500/5 p-4 text-xs text-emerald-400 flex items-center justify-between gap-2">
            <span className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-550 shrink-0" />
              {successMessage}
            </span>
            <button onClick={() => setSuccessMessage(null)} className="text-zinc-550 hover:text-zinc-300">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* TAB 1: Duyệt Streamer */}
        {currentTab === "streamer" && (
          <div className="space-y-6">
            {/* Analytics Grid */}
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl bg-zinc-900/40 border border-zinc-900/60 p-4 shadow-sm">
                <div className="text-zinc-550 text-[10px] font-bold uppercase tracking-wider">Tổng Đơn Đăng Ký</div>
                <div className="mt-1 text-2xl font-extrabold text-white tracking-tight">{totalCount}</div>
              </div>

              <div className="rounded-xl bg-zinc-900/40 border border-zinc-900/60 p-4 shadow-sm">
                <div className="text-amber-500/90 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                  Chờ Phê Duyệt
                </div>
                <div className="mt-1 text-2xl font-extrabold text-amber-400 tracking-tight">{pendingCount}</div>
              </div>

              <div className="rounded-xl bg-zinc-900/40 border border-zinc-900/60 p-4 shadow-sm">
                <div className="text-emerald-400 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Đã Chấp Thuận
                </div>
                <div className="mt-1 text-2xl font-extrabold text-emerald-400 tracking-tight">{approvedCount}</div>
              </div>

              <div className="rounded-xl bg-zinc-900/40 border border-zinc-900/60 p-4 shadow-sm">
                <div className="text-red-400 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                  Đã Từ Chối
                </div>
                <div className="mt-1 text-2xl font-extrabold text-red-400 tracking-tight">{rejectedCount}</div>
              </div>
            </div>

            {/* Filters and Actions */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-zinc-900/20 p-3 rounded-xl border border-zinc-900/60">
              {/* Segment controls Tabs */}
              <div className="flex p-0.5 bg-zinc-950 border border-zinc-900 rounded-lg overflow-hidden">
                <button
                  onClick={() => setActiveCandidateTab("pending")}
                  className={`px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                    activeCandidateTab === "pending" ? "bg-zinc-900 text-white" : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  Chờ duyệt ({pendingCount})
                </button>
                <button
                  onClick={() => setActiveCandidateTab("approved")}
                  className={`px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                    activeCandidateTab === "approved" ? "bg-zinc-900 text-white" : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  Chấp thuận ({approvedCount})
                </button>
                <button
                  onClick={() => setActiveCandidateTab("rejected")}
                  className={`px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                    activeCandidateTab === "rejected" ? "bg-zinc-900 text-white" : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  Từ chối ({rejectedCount})
                </button>
                <button
                  onClick={() => setActiveCandidateTab("all")}
                  className={`px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                    activeCandidateTab === "all" ? "bg-zinc-900 text-white" : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  Tất cả ({totalCount})
                </button>
              </div>

              {/* Search box */}
              <div className="relative max-w-sm w-full">
                <input
                  type="text"
                  placeholder="Tìm theo tên hiển thị, bio..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="block w-full px-3 py-1.5 rounded-lg border border-zinc-900 bg-zinc-950 text-xs text-zinc-100 placeholder-zinc-550 focus:border-emerald-500 focus:outline-none transition-all"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-350">
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Candidates Listing Grid */}
            {loading ? (
              <div className="py-20 text-center space-y-2">
                <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
                <p className="text-xs text-zinc-400 animate-pulse">Đang tìm dữ liệu ứng cử viên...</p>
              </div>
            ) : filteredCandidates.length === 0 ? (
              <div className="py-20 rounded-xl bg-zinc-900/10 text-center space-y-2 border border-zinc-900/60">
                <p className="text-sm font-semibold text-white">Không có đơn ứng tuyển nào</p>
                <p className="text-xs text-zinc-500 max-w-xs mx-auto">
                  Không tìm thấy đơn ứng tuyển nào khớp với bộ lọc hoặc từ khóa tìm kiếm.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredCandidates.map((candidate) => (
                  <div
                    key={candidate.id}
                    className="flex flex-col justify-between rounded-xl border border-zinc-900/80 bg-zinc-900/30 p-5 hover:border-zinc-800 hover:bg-zinc-900/40 transition-all duration-200"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-900 border border-zinc-800 text-sm font-extrabold text-emerald-400 uppercase">
                            {candidate.display_name.slice(0, 2)}
                          </div>
                          <div>
                            <h3 className="text-xs font-bold text-white truncate max-w-[130px]">{candidate.display_name}</h3>
                            <p className="text-[10px] text-zinc-500">
                              Name: {candidate.user.name} (ID: {candidate.user_id})
                            </p>
                          </div>
                        </div>

                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${
                            candidate.status === "pending"
                              ? "bg-amber-500/10 text-amber-500"
                              : candidate.status === "approved"
                              ? "bg-emerald-500/10 text-emerald-400"
                              : "bg-red-500/10 text-red-400"
                          }`}
                        >
                          {candidate.status}
                        </span>
                      </div>

                      {/* Categories Tags */}
                      {candidate.categories && candidate.categories.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {candidate.categories.map((cat) => (
                            <span
                              key={cat.id}
                              className="inline-flex items-center rounded-md bg-zinc-950 px-1.5 py-0.5 text-[9px] text-emerald-400 border border-zinc-900"
                            >
                              {cat.name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[9px] italic text-zinc-650">Không chỉ định thể loại</span>
                      )}

                      {/* Candidate Bio */}
                      <p className="text-xs text-zinc-400 line-clamp-3 bg-zinc-950/40 p-2.5 rounded-lg border border-zinc-900/50 leading-relaxed">
                        {candidate.bio || "Không có giới thiệu."}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-zinc-900/60 flex items-center justify-between gap-3 text-[10px] text-zinc-550">
                      <span>Nộp: {formatDate(candidate.applied_at)}</span>

                      {candidate.status === "pending" && (
                        <div className="flex gap-1.5 shrink-0">
                          <button
                            onClick={() => handleReject(candidate.id)}
                            disabled={processingId !== null}
                            className="px-2.5 py-1 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20 text-[10px] font-bold cursor-pointer disabled:opacity-50"
                          >
                            Từ chối
                          </button>
                          <button
                            onClick={() => handleApprove(candidate.id)}
                            disabled={processingId !== null}
                            className="px-2.5 py-1 rounded bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 text-[10px] font-bold cursor-pointer disabled:opacity-50 flex items-center gap-1"
                          >
                            {processingId === candidate.id && <RefreshCw className="h-2.5 w-2.5 animate-spin" />}
                            Duyệt
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: Thể Loại & Game */}
        {currentTab === "categories" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <FolderOpen className="h-4 w-4 text-emerald-400" />
                  Danh Sách Thể Loại (Categories)
                </h2>
                <p className="text-xs text-zinc-500 mt-0.5">Quản lý các thể loại phát sóng chính trên hệ thống.</p>
              </div>

              <button
                onClick={openAddCategoryModal}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-all cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                Tạo Thể Loại
              </button>
            </div>

            {loading ? (
              <div className="py-20 text-center">
                <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
              </div>
            ) : categories.length === 0 ? (
              <div className="py-20 rounded-xl bg-zinc-900/10 text-center border border-zinc-900/60 text-xs text-zinc-550">
                Chưa có thể loại nào được khởi tạo.
              </div>
            ) : (
              <div className="space-y-4">
                {categories.map((cat) => {
                  const isExpanded = selectedCategory?.id === cat.id;

                  return (
                    <div
                      key={cat.id}
                      className="rounded-xl border border-zinc-900 bg-zinc-900/30 overflow-hidden transition-all"
                    >
                      {/* Accordion Trigger Header */}
                      <div className="p-4 flex items-center justify-between hover:bg-zinc-900/50 transition-all gap-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-12 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-zinc-950 border border-zinc-900 text-xs font-black text-emerald-400 font-mono">
                            {cat.icon ? (
                              <img src={resolveMediaURL(cat.icon)} alt={cat.name} className="h-full w-full object-cover" />
                            ) : (
                              cat.type.slice(0, 3).toUpperCase()
                            )}
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-white flex items-center gap-2">
                              {cat.name}
                              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-zinc-950 text-zinc-400 font-mono">
                                slug: {cat.slug}
                              </span>
                            </h4>
                            <p className="text-[10px] text-zinc-500 leading-snug truncate max-w-md mt-0.5">
                              {cat.description || "Không có mô tả chi tiết."}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => openEditCategoryModal(cat)}
                            className="p-1.5 rounded bg-zinc-950 text-zinc-450 hover:text-white border border-zinc-900 hover:border-zinc-800 transition-all cursor-pointer"
                          >
                            <Edit3 className="h-3 w-3" />
                          </button>
                          
                          {/* Expander to show games */}
                          <button
                            onClick={() => handleSelectCategory(cat)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-zinc-900 hover:bg-zinc-800 text-[10px] font-bold text-zinc-300 transition-all cursor-pointer border border-zinc-850"
                          >
                            {isExpanded ? (
                              <>
                                <ChevronUp className="h-3 w-3 text-emerald-400" />
                                Đóng trò chơi
                              </>
                            ) : (
                              <>
                                <ChevronDown className="h-3 w-3" />
                                Xem trò chơi
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Accordion Expansion (Games List inside Category) */}
                      {isExpanded && (
                        <div className="bg-zinc-950/60 border-t border-zinc-900 p-4 space-y-4">
                          <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
                            <span className="text-[10px] font-bold text-zinc-450 flex items-center gap-1.5">
                              <Gamepad2 className="h-3.5 w-3.5" />
                              Trò chơi/Tựa game trực thuộc
                            </span>

                            <button
                              onClick={openAddGameModal}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-[9px] font-bold text-white transition-all cursor-pointer"
                            >
                              <Plus className="h-3 w-3" />
                              Thêm Game
                            </button>
                          </div>

                          {gamesLoading ? (
                            <div className="py-6 text-center">
                              <div className="mx-auto h-5 w-5 animate-spin rounded-full border border-emerald-500 border-t-transparent" />
                            </div>
                          ) : categoryGames.length === 0 ? (
                            <p className="text-[10px] text-zinc-600 italic">Thể loại này chưa có game con trực thuộc.</p>
                          ) : (
                            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
                              {categoryGames.map((game) => (
                                <div
                                  key={game.id}
                                  className="flex items-center gap-3 p-2.5 rounded-lg border border-zinc-900 bg-zinc-900/10 text-left"
                                >
                                  <div className="h-10 w-8 shrink-0 bg-zinc-950 border border-zinc-900 rounded overflow-hidden flex items-center justify-center">
                                    {game.cover_image ? (
                                      <img src={game.cover_image} alt={game.name} className="object-cover w-full h-full" />
                                    ) : (
                                      <Gamepad2 className="h-4 w-4 text-zinc-700" />
                                    )}
                                  </div>
                                  <div className="min-w-0">
                                    <h5 className="text-[11px] font-bold text-white truncate">{game.name}</h5>
                                    <p className="text-[9px] text-zinc-550 truncate">slug: {game.slug}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: Quản lý Quà tặng (Donate Items) */}
        {currentTab === "gifts" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-zinc-900 pb-3 gap-4">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Coins className="h-4 w-4 text-emerald-400" />
                  Danh Sách Quà Tặng (Donate Items)
                </h2>
                <p className="text-xs text-zinc-500 mt-0.5">Tạo mới, chỉnh sửa và tải ảnh quà tặng donate.</p>
              </div>

              <button
                onClick={openAddGiftModal}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-500 transition-all text-white cursor-pointer shadow-md shadow-emerald-950/20"
              >
                <Plus className="h-3.5 w-3.5" />
                Thêm Quà Tặng
              </button>
            </div>

            {giftsLoading ? (
              <div className="py-20 text-center space-y-2">
                <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
                <p className="text-xs text-zinc-400 animate-pulse">Đang tải danh sách quà tặng...</p>
              </div>
            ) : (!Array.isArray(gifts) || gifts.length === 0) ? (
              <div className="py-20 rounded-xl bg-zinc-900/10 text-center space-y-2 border border-zinc-900/60">
                <p className="text-sm font-semibold text-white">Chưa có quà tặng nào</p>
                <p className="text-xs text-zinc-555">Click nút &quot;Thêm Quà Tặng&quot; bên trên để khởi tạo.</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
                {Array.isArray(gifts) && gifts.map((gift) => (
                  <div
                    key={gift.id}
                    className="flex flex-col justify-between rounded-xl border border-zinc-900/80 bg-zinc-900/30 p-4 hover:border-zinc-800 hover:bg-zinc-900/40 transition-all duration-200 text-center relative group"
                  >
                    {/* Actions Menu overlay */}
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                      <button
                        onClick={() => openEditGiftModal(gift)}
                        className="p-1 rounded bg-zinc-950 text-zinc-400 hover:text-white border border-zinc-900 hover:border-zinc-800 transition-all cursor-pointer"
                        title="Chỉnh sửa"
                      >
                        <Edit3 className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => handleDeleteGift(gift.id)}
                        className="p-1 rounded bg-zinc-950 text-red-500/80 hover:text-red-400 border border-zinc-900 hover:border-zinc-800 transition-all cursor-pointer"
                        title="Xóa"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>

                    <div className="space-y-3.5">
                      {/* Image Frame */}
                      <div className="aspect-square w-16 mx-auto rounded-xl bg-zinc-950 border border-zinc-900/80 flex items-center justify-center overflow-hidden">
                        {gift.image_url ? (
                          <img
                            src={gift.image_url}
                            alt={gift.name}
                            className="object-contain w-full h-full p-1"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = "none";
                            }}
                          />
                        ) : (
                          <ImageIcon className="h-6 w-6 text-zinc-700" />
                        )}
                      </div>

                      <div>
                        <h4 className="text-xs font-black text-white">{gift.name}</h4>
                        <div className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-zinc-950 border border-zinc-900 text-[10px] font-bold text-yellow-500 font-mono">
                          <Coins className="h-3 w-3 text-yellow-500" />
                          {gift.coin_price} COINS
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: Analytics Báo cáo Thống kê */}
        {currentTab === "analytics" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-zinc-900 pb-3 gap-4">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-emerald-400" />
                  Bảng Thống Kê & Báo Cáo
                </h2>
                <p className="text-xs text-zinc-500 mt-0.5">Theo dõi hoạt động giao dịch và trò chuyện của Streamers.</p>
              </div>

              {/* Filters */}
              <div className="flex gap-2">
                <select
                  value={leaderboardMetric}
                  onChange={(e) => setLeaderboardMetric(e.target.value as LeaderboardMetric)}
                  className="bg-zinc-900 text-xs text-white border border-zinc-800 rounded px-2 py-1.5 outline-none"
                >
                  <option value="donate">💰 Doanh thu Donate</option>
                  <option value="viewers">👥 Số lượng người xem</option>
                  <option value="chat">💬 Tin nhắn thảo luận</option>
                </select>

                <select
                  value={leaderboardPeriod}
                  onChange={(e) => setLeaderboardPeriod(e.target.value as LeaderboardPeriod)}
                  className="bg-zinc-900 text-xs text-white border border-zinc-800 rounded px-2 py-1.5 outline-none"
                >
                  <option value="daily">Hôm nay</option>
                  <option value="weekly">Tuần này</option>
                  <option value="monthly">Tháng này</option>
                  <option value="yearly">Năm nay</option>
                </select>
              </div>
            </div>

            {analyticsLoading ? (
              <div className="py-20 text-center">
                <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
              </div>
            ) : analyticsData.length === 0 ? (
              <div className="py-20 rounded-xl bg-zinc-900/10 text-center border border-zinc-900/60 text-xs text-zinc-550">
                Chưa có dữ liệu thống kê nào được ghi nhận cho khoảng thời gian này.
              </div>
            ) : (
              <div className="bg-zinc-900/20 border border-zinc-900 rounded-xl overflow-hidden shadow-xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-zinc-900 bg-zinc-900/40 text-zinc-400 font-bold uppercase tracking-wider text-[10px]">
                      <th className="py-3 px-4 text-center w-16">Hạng</th>
                      <th className="py-3 px-4">ID Streamer (Kênh)</th>
                      <th className="py-3 px-4 text-right">Tổng Điểm / Doanh Thu</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-900">
                    {analyticsData.map((entry, index) => (
                      <tr key={entry.streamer_id} className="hover:bg-zinc-900/20 transition-all">
                        <td className="py-3.5 px-4 text-center font-bold">
                          {index + 1 === 1 ? (
                            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">1</span>
                          ) : index + 1 === 2 ? (
                            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-zinc-300/10 text-zinc-300 border border-zinc-300/20">2</span>
                          ) : index + 1 === 3 ? (
                            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-600/10 text-amber-600 border border-amber-600/20">3</span>
                          ) : (
                            index + 1
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-white">
                          Kênh ID: {entry.streamer_id}
                        </td>
                        <td className="py-3.5 px-4 text-right font-black font-mono text-emerald-400">
                          {leaderboardMetric === "donate" ? (
                            <span className="flex items-center justify-end gap-1">
                              {entry.score.toLocaleString()} <Coins className="h-3.5 w-3.5 text-yellow-500" />
                            </span>
                          ) : leaderboardMetric === "chat" ? (
                            <span>{entry.score.toLocaleString()} tin nhắn</span>
                          ) : (
                            <span>{entry.score.toLocaleString()} người xem</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

      </main>

      {/* CREATE/EDIT CATEGORY MODAL */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl bg-zinc-900 border border-zinc-850 p-6 space-y-4 shadow-2xl relative">
            <button onClick={() => setShowCategoryModal(false)} className="absolute top-4 right-4 text-zinc-400 hover:text-white">
              <X className="h-5 w-5" />
            </button>

            <div>
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <FolderOpen className="h-4 w-4 text-emerald-400" />
                {editingCategory ? "Cập Nhật Thể Loại" : "Tạo Thể Loại Mới"}
              </h3>
            </div>

            <form onSubmit={handleSaveCategory} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide block">Tên Thể Loại</label>
                <input
                  type="text"
                  required
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  placeholder="Ví dụ: Âm nhạc, Trò chuyện..."
                  className="block w-full px-3 py-2 rounded-lg border border-zinc-800 bg-zinc-950 text-xs text-white focus:border-emerald-500 focus:outline-none transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide block">Đường Dẫn Slug (Tùy chọn)</label>
                <input
                  type="text"
                  value={catSlug}
                  onChange={(e) => setCatSlug(e.target.value)}
                  placeholder="Ví dụ: am-nhac, tro-chuyen"
                  className="block w-full px-3 py-2 rounded-lg border border-zinc-800 bg-zinc-950 text-xs text-white focus:border-emerald-500 focus:outline-none transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide block">Loại Thể Loại</label>
                <select
                  value={catType}
                  onChange={(e) => setCatType(e.target.value)}
                  className="block w-full px-3 py-2 rounded-lg border border-zinc-800 bg-zinc-950 text-xs text-white focus:border-emerald-500 focus:outline-none transition-all"
                >
                  <option value="game">🎮 Game</option>
                  <option value="talk">💬 Talk</option>
                  <option value="music">🎵 Music</option>
                  <option value="sports">⚽ Sports</option>
                  <option value="education">📚 Education</option>
                  <option value="creative">🎨 Creative</option>
                  <option value="other">⚙️ Other</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide block">Mô tả ngắn</label>
                <textarea
                  value={catDesc}
                  onChange={(e) => setCatDesc(e.target.value)}
                  placeholder="Giới thiệu nhanh về thể loại..."
                  rows={3}
                  className="block w-full px-3 py-2 rounded-lg border border-zinc-800 bg-zinc-950 text-xs text-white focus:border-emerald-500 focus:outline-none transition-all resize-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide block">Ảnh thể loại</label>
                <div
                  onClick={() => catFileInputRef.current?.click()}
                  className="flex min-h-[112px] cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-zinc-800 bg-zinc-950/40 p-3 transition-all hover:border-zinc-700 hover:bg-zinc-950/60"
                >
                  <input
                    type="file"
                    ref={catFileInputRef}
                    onChange={handleCatImageChange}
                    accept="image/png,image/jpeg,image/gif,image/webp"
                    className="hidden"
                  />
                  {catImagePreview ? (
                    <div className="flex items-center gap-3">
                      <img src={resolveMediaURL(catImagePreview)} alt="Xem trước ảnh thể loại" className="h-16 w-24 rounded-md object-cover" />
                      <span className="max-w-[150px] truncate text-[10px] font-semibold text-zinc-400">
                        {catImageFile ? catImageFile.name : "Ảnh hiện tại — bấm để thay đổi"}
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-1 text-center">
                      <Upload className="h-6 w-6 text-zinc-500" />
                      <span className="text-[10px] font-bold text-zinc-400">Bấm để tải ảnh lên</span>
                      <span className="text-[8px] text-zinc-600">PNG, JPG, GIF, WEBP (tối đa 10MB)</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCategoryModal(false)}
                  className="flex-1 px-4 py-2 rounded-lg border border-zinc-800 hover:bg-zinc-800 text-xs font-bold text-zinc-300 transition-all cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white transition-all cursor-pointer disabled:opacity-50"
                >
                  Lưu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD GAME MODAL */}
      {showGameModal && selectedCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl bg-zinc-900 border border-zinc-850 p-6 space-y-4 shadow-2xl relative">
            <button onClick={() => setShowGameModal(false)} className="absolute top-4 right-4 text-zinc-400 hover:text-white">
              <X className="h-5 w-5" />
            </button>

            <div>
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <Gamepad2 className="h-4 w-4 text-emerald-400" />
                Thêm Game Cho: {selectedCategory.name}
              </h3>
            </div>

            <form onSubmit={handleSaveGame} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide block">Tên Trò Chơi</label>
                <input
                  type="text"
                  required
                  value={gameName}
                  onChange={(e) => setGameName(e.target.value)}
                  placeholder="Ví dụ: League of Legends..."
                  className="block w-full px-3 py-2 rounded-lg border border-zinc-800 bg-zinc-950 text-xs text-white focus:border-emerald-500 focus:outline-none transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide block">Đường Dẫn Slug (Tùy chọn)</label>
                <input
                  type="text"
                  value={gameSlug}
                  onChange={(e) => setGameSlug(e.target.value)}
                  placeholder="Ví dụ: lol, league-of-legends"
                  className="block w-full px-3 py-2 rounded-lg border border-zinc-800 bg-zinc-950 text-xs text-white focus:border-emerald-500 focus:outline-none transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide block">URL Ảnh bìa (Cover Image)</label>
                <input
                  type="text"
                  value={gameCover}
                  onChange={(e) => setGameCover(e.target.value)}
                  placeholder="http://..."
                  className="block w-full px-3 py-2 rounded-lg border border-zinc-800 bg-zinc-950 text-xs text-white focus:border-emerald-500 focus:outline-none transition-all"
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowGameModal(false)}
                  className="flex-1 px-4 py-2 rounded-lg border border-zinc-800 hover:bg-zinc-800 text-xs font-bold text-zinc-300 transition-all cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white transition-all cursor-pointer disabled:opacity-50"
                >
                  Thêm
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE/EDIT GIFT MODAL POPUP */}
      {showGiftModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl bg-zinc-900 border border-zinc-850 p-6 space-y-4 shadow-2xl relative">
            <button
              onClick={() => setShowGiftModal(false)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>

            <div>
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <GiftIcon className="h-4 w-4 text-emerald-400" />
                {editingGift ? "Cập Nhật Quà Tặng" : "Thêm Quà Tặng Mới"}
              </h3>
              <p className="text-[10px] text-zinc-500 mt-0.5">
                Thiết lập thông tin và tải ảnh quà tặng.
              </p>
            </div>

            <form onSubmit={handleSaveGift} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">Tên Quà Tặng</label>
                <input
                  type="text"
                  required
                  value={giftName}
                  onChange={(e) => setGiftName(e.target.value)}
                  placeholder="Ví dụ: Lâu đài, Vòng hoa..."
                  className="block w-full px-3 py-2 rounded-lg border border-zinc-800 bg-zinc-950 text-xs text-white placeholder-zinc-650 focus:border-emerald-500 focus:outline-none transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">Giá trị Coin</label>
                <input
                  type="number"
                  required
                  min={1}
                  value={giftPrice}
                  onChange={(e) => setGiftPrice(parseInt(e.target.value) || 0)}
                  className="block w-full px-3 py-2 rounded-lg border border-zinc-800 bg-zinc-950 text-xs text-white focus:border-emerald-500 focus:outline-none transition-all font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide block">Hình Ảnh</label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-zinc-800 hover:border-zinc-700 rounded-xl p-4 text-center cursor-pointer bg-zinc-950/40 hover:bg-zinc-950/60 transition-all flex flex-col items-center justify-center min-h-[110px]"
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageChange}
                    accept="image/*"
                    className="hidden"
                  />
                  {giftImagePreview ? (
                    <div className="space-y-2">
                      <img
                        src={giftImagePreview}
                        alt="Preview"
                        className="h-14 w-14 object-contain mx-auto"
                      />
                      <span className="text-[10px] text-zinc-500 font-semibold truncate block max-w-[200px]">
                        {giftImageFile ? giftImageFile.name : "Ảnh hiện tại"}
                      </span>
                    </div>
                  ) : (
                    <div className="space-y-1 flex flex-col items-center">
                      <Upload className="h-6 w-6 text-zinc-555" />
                      <span className="text-[10px] text-zinc-400 font-bold">Kéo thả hoặc click để tải lên</span>
                      <span className="text-[8px] text-zinc-650">PNG, JPG, GIF (Max 10MB)</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowGiftModal(false)}
                  className="flex-1 px-4 py-2 rounded-lg border border-zinc-800 hover:bg-zinc-800 text-xs font-bold text-zinc-300 transition-all cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1"
                >
                  {loading && <RefreshCw className="h-3 w-3 animate-spin" />}
                  Lưu Lại
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
