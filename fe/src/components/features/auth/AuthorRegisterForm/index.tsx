"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Button, Input } from "@/components/ui";
import { apiClient } from "@/lib/api-client";

export function AuthorRegisterForm() {
  const router = useRouter();
  const { register, login, isAuthenticated, isLoading, error, clearError } = useAuth();

  // Form states
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  interface Category {
    id: number;
    name: string;
    slug: string;
    type: string;
  }

  // Author specific states
  const [channelName, setChannelName] = useState("");
  const [bio, setBio] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | "">("");
  
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  // Load categories on mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const data = await apiClient.get<Category[]>("/api/categories");
        if (data && data.length > 0) {
          setCategories(data);
          setSelectedCategoryId(data[0].id);
        }
      } catch (err) {
        console.error("Failed to fetch categories, falling back to static list", err);
        const staticCats: Category[] = [
          { id: 1, name: "League of Legends", slug: "league-of-legends", type: "game" },
          { id: 2, name: "Just Chatting", slug: "just-chatting", type: "talk" },
          { id: 3, name: "Grand Theft Auto V", slug: "gta-v", type: "game" },
          { id: 4, name: "Counter-Strike 2", slug: "cs-2", type: "game" },
        ];
        setCategories(staticCats);
        setSelectedCategoryId(staticCats[0].id);
      }
    };
    fetchCategories();
  }, []);

  const getCategoryName = () => {
    const found = categories.find((c) => c.id === selectedCategoryId);
    return found ? found.name : "";
  };

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && !isSuccess) {
      router.push("/");
    }
  }, [isAuthenticated, isSuccess, router]);

  // Clear errors on mount
  useEffect(() => {
    clearError();
  }, [clearError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    // Basic Account validation
    if (!name) {
      setValidationError("Vui lòng nhập họ và tên");
      return;
    }
    if (!email) {
      setValidationError("Vui lòng nhập địa chỉ email");
      return;
    }
    if (!password) {
      setValidationError("Vui lòng nhập mật khẩu tài khoản");
      return;
    }
    if (password.length < 6) {
      setValidationError("Mật khẩu phải chứa ít nhất 6 ký tự");
      return;
    }
    if (password !== confirmPassword) {
      setValidationError("Mật khẩu xác nhận không khớp");
      return;
    }

    // Channel validation
    if (!channelName) {
      setValidationError("Vui lòng đặt tên hiển thị cho kênh phát sóng của bạn");
      return;
    }

    try {
      // 1. Perform registration
      await register({ name, email, password });
      
      // 2. Trigger auto-login
      await login({ email, password });
      
      // 3. Submit application
      const catIds: number[] = [];
      if (selectedCategoryId) {
        catIds.push(Number(selectedCategoryId));
      }
      await apiClient.post("/api/authors/apply", {
        display_name: channelName,
        bio: bio,
        category_ids: catIds,
      });

      // 4. Mark success screen
      setIsSuccess(true);
    } catch (err: any) {
      if (err && err.message) {
        setValidationError(err.message);
      } else {
        setValidationError("Đã xảy ra lỗi trong quá trình xử lý đơn ứng tuyển.");
      }
    }
  };

  if (isSuccess) {
    return (
      <div className="text-center space-y-6 py-4">
        {/* Success animated checkmark */}
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2.5}
            stroke="currentColor"
            className="h-7 w-7"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4.5 12.75l6 6 9-13.5"
            />
          </svg>
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-bold text-white">Đăng ký thành công!</h2>
          <p className="text-sm text-zinc-400 leading-relaxed max-w-sm mx-auto">
            Tài khoản của bạn đã được tạo thành công. Đơn đăng ký quyền <strong>Streamer/Author</strong> với kênh <strong className="text-emerald-400">&ldquo;{channelName}&rdquo;</strong> đang được phê duyệt.
          </p>
        </div>

        <div className="bg-zinc-950/60 border border-zinc-800 rounded-xl p-4 text-left text-xs text-zinc-500 space-y-2">
          <p className="font-bold text-zinc-400 uppercase tracking-wider">Thông tin đăng ký:</p>
          <p>&bull; Kênh phát sóng: <strong className="text-emerald-400">{channelName}</strong></p>
          <p>&bull; Thể loại chính: <strong>{getCategoryName()}</strong></p>
          <p>&bull; Trạng thái phê duyệt: <span className="text-amber-500 font-semibold">Đang chờ (Pending)</span></p>
        </div>

        <div className="pt-4">
          <Link
            href="/"
            className="inline-flex w-full items-center justify-center rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg hover:from-emerald-500 hover:to-teal-500 transition-all"
          >
            Về trang chủ Go-Stream
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Back button */}
      <div className="mb-5 flex justify-start">
        <Link
          href="/register"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-500 hover:text-emerald-400 transition-colors group cursor-pointer"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2.5}
            stroke="currentColor"
            className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 19.5L8.25 12l7.5-7.5"
            />
          </svg>
          Quay lại đăng ký thường
        </Link>
      </div>

      <div className="text-center sm:text-left">
        <h2 className="text-xl font-semibold text-white">Trở thành Streamer</h2>
        <p className="mt-1.5 text-sm text-zinc-400">
          Tạo tài khoản và cấu hình kênh livestream của bạn chỉ trong vài phút.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        {/* Error Alert Box */}
        {(error || validationError) && (
          <div className="rounded-lg border border-red-500/10 bg-red-500/5 p-3.5 text-sm text-red-400 border-l-4 border-l-red-500">
            <div className="flex gap-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="h-5 w-5 shrink-0 text-red-400"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z"
                  clipRule="evenodd"
                />
              </svg>
              <span>{validationError || error}</span>
            </div>
          </div>
        )}

        {/* Section 1: Account Information */}
        <div className="space-y-4">
          <div className="border-b border-zinc-800 pb-1.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400">
              1. Thông tin tài khoản
            </h3>
          </div>

          <Input
            id="name"
            name="name"
            type="text"
            label="Họ và tên"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setValidationError(null);
            }}
            placeholder="Nguyễn Văn A"
            error={validationError && !name ? validationError : null}
          />

          <Input
            id="email"
            name="email"
            type="email"
            label="Địa chỉ Email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setValidationError(null);
            }}
            placeholder="ten@vidu.com"
            error={validationError && !email ? validationError : null}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              id="password"
              name="password"
              type="password"
              label="Mật khẩu"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setValidationError(null);
              }}
              placeholder="Tối thiểu 6 ký tự"
              error={validationError && !password ? validationError : null}
            />

            <Input
              id="confirm-password"
              name="confirm-password"
              type="password"
              label="Xác nhận mật khẩu"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                setValidationError(null);
              }}
              placeholder="Nhập lại mật khẩu"
              error={validationError && password !== confirmPassword ? validationError : null}
            />
          </div>
        </div>

        {/* Section 2: Channel Customization */}
        <div className="space-y-4 pt-2">
          <div className="border-b border-zinc-800 pb-1.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400">
              2. Thiết lập kênh livestream
            </h3>
          </div>

          <Input
            id="channelName"
            name="channelName"
            type="text"
            label="Tên hiển thị kênh (Ví dụ: MixiGaming)"
            value={channelName}
            onChange={(e) => {
              setChannelName(e.target.value);
              setValidationError(null);
            }}
            placeholder="Tên độc quyền thương hiệu của bạn"
            error={validationError && !channelName ? validationError : null}
          />

          <div className="w-full">
            <label
              htmlFor="category"
              className="block text-sm font-medium text-zinc-300 mb-1.5"
            >
              Thể loại livestream chính
            </label>
            <select
              id="category"
              name="category"
              value={selectedCategoryId}
              onChange={(e) => setSelectedCategoryId(Number(e.target.value))}
              className="block w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-sm text-white shadow-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 focus:outline-none transition-all cursor-pointer"
            >
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name} ({cat.type})
                </option>
              ))}
            </select>
          </div>

          <div className="w-full">
            <label
              htmlFor="bio"
              className="block text-sm font-medium text-zinc-300 mb-1.5"
            >
              Giới thiệu ngắn về kênh (Tùy chọn)
            </label>
            <textarea
              id="bio"
              name="bio"
              rows={2}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="block w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 shadow-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 focus:outline-none transition-all"
              placeholder="Chia sẻ sở thích hoặc lịch phát sóng của bạn..."
            />
          </div>
        </div>

        <div className="pt-2">
          <Button type="submit" isLoading={isLoading}>
            Hoàn tất đăng ký Streamer
          </Button>
        </div>
      </form>

      <p className="mt-6 text-center text-sm text-zinc-400">
        Bạn muốn làm khán giả thôi?{" "}
        <Link
          href="/register"
          className="font-medium text-emerald-400 hover:text-emerald-300 hover:underline transition-colors"
        >
          Đăng ký tài khoản thường
        </Link>
      </p>
    </div>
  );
}

export default AuthorRegisterForm;
