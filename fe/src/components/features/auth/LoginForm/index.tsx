"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Button, Input } from "@/components/ui";

interface LoginFormProps {
  onSuccess?: () => void;
  redirectOnSuccess?: boolean;
  onSwitchToRegister?: () => void;
}

export function LoginForm({ onSuccess, redirectOnSuccess = true, onSwitchToRegister }: LoginFormProps) {
  const router = useRouter();
  const { login, isAuthenticated, isLoading, error, clearError } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      if (redirectOnSuccess) {
        router.push("/");
      }
      onSuccess?.();
    }
  }, [isAuthenticated, router, redirectOnSuccess, onSuccess]);

  useEffect(() => {
    clearError();
  }, [clearError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

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
      // Errors are handled by useAuth hook
    }
  };

  return (
    <div className="space-y-6 text-left">
      <div className="space-y-1">
        <h2 className="text-xl font-black tracking-tight text-zinc-900 dark:text-white uppercase">
          Chào mừng trở lại
        </h2>
        <p className="text-xs text-zinc-400 dark:text-zinc-500 font-medium">
          Nhập thông tin tài khoản của bạn để tiếp tục
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Error Alert Box */}
        {(error || validationError) && (
          <div className="rounded-xl border border-red-500/10 bg-red-500/5 p-3 text-xs text-red-500 dark:text-red-400 flex items-start gap-2.5 shadow-sm shadow-red-500/5">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-4.5 w-4.5 shrink-0 text-red-500 mt-0.5"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z"
                clipRule="evenodd"
              />
            </svg>
            <span className="leading-relaxed font-semibold">{validationError || error}</span>
          </div>
        )}

        <div className="space-y-4">
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
            placeholder="name@example.com"
            inputVariant="filled"
            inputSize="md"
            error={validationError && !email ? validationError : null}
          />

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label
                htmlFor="password"
                className="block text-xs font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider select-none"
              >
                Mật khẩu
              </label>
              <a
                href="#"
                className="text-[11px] font-bold text-neon-primary hover:underline transition-colors"
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
              inputVariant="filled"
              inputSize="md"
              error={validationError && !password ? validationError : null}
            />
          </div>
        </div>

        <div className="pt-2">
          <Button 
            type="submit" 
            isLoading={isLoading}
            variant="primary"
            fullWidth
            size="md"
          >
            Đăng nhập
          </Button>
        </div>
      </form>

      <div className="text-center text-xs text-zinc-400 dark:text-zinc-500 pt-4 border-t border-zinc-100 dark:border-zinc-900/60">
        Bạn chưa có tài khoản?{" "}
        {onSwitchToRegister ? (
          <button
            onClick={onSwitchToRegister}
            className="font-bold text-neon-primary hover:underline transition-colors bg-transparent border-none p-0 cursor-pointer"
          >
            Đăng ký ngay
          </button>
        ) : (
          <Link
            href="/register"
            className="font-bold text-neon-primary hover:underline transition-colors"
          >
            Đăng ký ngay
          </Link>
        )}
      </div>
    </div>
  );
}

export default LoginForm;
