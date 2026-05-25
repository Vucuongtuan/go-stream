"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Button, Input } from "@/components/ui";

export function LoginForm() {
  const router = useRouter();
  const { login, isAuthenticated, isLoading, error, clearError } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.push("/");
    }
  }, [isAuthenticated, router]);

  // Clear errors when mounting
  useEffect(() => {
    clearError();
  }, [clearError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    // Simple validation
    if (!email) {
      setValidationError("Vui lòng nhập địa chỉ email");
      return;
    }
    if (!password) {
      setValidationError("Vui lòng nhập mật khẩu");
      return;
    }

    try {
      await login({ email, password });
    } catch {
      // Errors are handled by useAuth hook and displayed via the `error` state
    }
  };

  return (
    <div>
      <div className="text-center sm:text-left">
        <h2 className="text-xl font-semibold text-white">Đăng nhập tài khoản</h2>
        <p className="mt-1.5 text-sm text-zinc-400">
          Chào mừng trở lại! Vui lòng nhập thông tin để truy cập.
        </p>
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
          id="email"
          name="email"
          type="email"
          label="Địa chỉ Email"
          autoComplete="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setValidationError(null);
          }}
          placeholder="ten@vidu.com"
          error={validationError && !email ? validationError : null}
        />

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label
              htmlFor="password"
              className="block text-sm font-medium text-zinc-300"
            >
              Mật khẩu
            </label>
            <a
              href="#"
              className="text-xs font-medium text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              Quên mật khẩu?
            </a>
          </div>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setValidationError(null);
            }}
            placeholder="••••••••"
            error={validationError && !password ? validationError : null}
          />
        </div>

        <div className="pt-2">
          <Button type="submit" isLoading={isLoading}>
            Đăng nhập
          </Button>
        </div>
      </form>

      <p className="mt-8 text-center text-sm text-zinc-400">
        Chưa có tài khoản?{" "}
        <Link
          href="/register"
          className="font-medium text-emerald-400 hover:text-emerald-300 hover:underline transition-colors"
        >
          Đăng ký ngay
        </Link>
      </p>
    </div>
  );
}

export default LoginForm;
