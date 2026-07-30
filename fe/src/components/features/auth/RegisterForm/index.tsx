"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Button, Input } from "@/components/ui";

interface RegisterFormProps {
  onSuccess?: () => void;
  redirectOnSuccess?: boolean;
  onSwitchToLogin?: () => void;
}

export function RegisterForm({ onSuccess, redirectOnSuccess = true, onSwitchToLogin }: RegisterFormProps) {
  const router = useRouter();
  const { register, login, isAuthenticated, isLoading, error, clearError } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isRegisterSuccess, setIsRegisterSuccess] = useState(false);

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
      await register({ name, email, password });
      setIsRegisterSuccess(true);
      await login({ email, password });
    } catch {
      // Errors are handled by useAuth hook
    }
  };

  return (
    <div className="space-y-7 text-left">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white">
          Tạo tài khoản mới
        </h2>
        <p className="text-xs text-zinc-400 dark:text-zinc-500 font-medium">
          Đăng ký miễn phí để bắt đầu xem và tương tác
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Error Alert Box */}
        {(error || validationError) && (
          <div className="flex items-start gap-2.5 bg-red-500/5 p-3 text-xs text-red-500 dark:text-red-400">
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

        <div className="space-y-3">
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
            inputVariant="filled"
            inputSize="md"
            className="rounded-md shadow-none"
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
            placeholder="name@example.com"
            inputVariant="filled"
            inputSize="md"
            className="rounded-md shadow-none"
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
            inputVariant="filled"
            inputSize="md"
            className="rounded-md shadow-none"
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
            inputVariant="filled"
            inputSize="md"
            className="rounded-md shadow-none"
            error={validationError && password !== confirmPassword ? validationError : null}
          />
        </div>

        <div className="pt-2">
          <Button 
            type="submit" 
            isLoading={isLoading}
            variant="primary"
            fullWidth
            size="md"
            className="rounded-md bg-emerald-600 shadow-none hover:bg-emerald-700"
          >
            {isRegisterSuccess ? "Đang tự động đăng nhập..." : "Đăng ký tài khoản"}
          </Button>
        </div>
      </form>

      <div className="pt-1 text-center text-xs text-zinc-400 dark:text-zinc-500">
        Bạn đã có tài khoản?{" "}
        {onSwitchToLogin ? (
          <button
            onClick={onSwitchToLogin}
            className="bg-transparent p-0 font-semibold text-emerald-600 hover:underline dark:text-emerald-400"
          >
            Đăng nhập ngay
          </button>
        ) : (
          <Link
            href="/login"
            className="font-semibold text-emerald-600 hover:underline dark:text-emerald-400"
          >
            Đăng nhập ngay
          </Link>
        )}
      </div>
    </div>
  );
}

export default RegisterForm;
