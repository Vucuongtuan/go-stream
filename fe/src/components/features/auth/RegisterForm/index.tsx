"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Button, Input } from "@/components/ui";

export function RegisterForm() {
  const router = useRouter();
  const { register, login, isAuthenticated, isLoading, error, clearError } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isRegisterSuccess, setIsRegisterSuccess] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.push("/");
    }
  }, [isAuthenticated, router]);

  // Clear errors on mount
  useEffect(() => {
    clearError();
  }, [clearError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    // Form validation
    if (!name) {
      setValidationError("Vui lòng nhập họ và tên");
      return;
    }
    if (!email) {
      setValidationError("Vui lòng nhập địa chỉ email");
      return;
    }
    if (!password) {
      setValidationError("Vui lòng nhập mật khẩu");
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

    try {
      // 1. Perform registration
      await register({ name, email, password });
      setIsRegisterSuccess(true);

      // 2. Auto-login UX: Trigger login flow immediately on success
      await login({ email, password });
    } catch {
      // Errors are handled by useAuth hook and displayed via the `error` state
    }
  };

  return (
    <div>
      <div className="text-center sm:text-left">
        <h2 className="text-xl font-semibold text-white">Đăng ký tài khoản</h2>
        <p className="mt-1.5 text-sm text-zinc-400">
          Tạo tài khoản Go-Stream miễn phí để xem livestream và trò chuyện.
        </p>
      </div>

      {/* Premium Streamer Registration CTA Card */}
      <div className="mt-5 p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 backdrop-blur-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg shadow-emerald-950/10">
        <div className="space-y-1 text-left">
          <h3 className="text-sm font-semibold text-emerald-400 flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            Bạn muốn phát sóng?
          </h3>
          <p className="text-xs text-zinc-400 leading-normal">
            Đăng ký kênh Streamer của riêng bạn và bắt đầu live stream ngay!
          </p>
        </div>
        <Link
          href="/register/author"
          className="shrink-0 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 px-3.5 py-2 text-xs font-semibold text-white transition-all shadow-md shadow-emerald-600/10 hover:shadow-emerald-500/20 w-full sm:w-auto text-center"
        >
          Đăng ký Streamer
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
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

        <div className="pt-2">
          <Button type="submit" isLoading={isLoading}>
            {isRegisterSuccess ? "Đang tự động đăng nhập..." : "Đăng ký tài khoản"}
          </Button>
        </div>
      </form>

      <p className="mt-8 text-center text-sm text-zinc-400">
        Đã có tài khoản?{" "}
        <Link
          href="/login"
          className="font-medium text-emerald-400 hover:text-emerald-300 hover:underline transition-colors"
        >
          Đăng nhập ngay
        </Link>
      </p>
    </div>
  );
}

export default RegisterForm;
