"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useAuthStore } from "@/store/authStore";
import { apiClient } from "@/lib/api-client";
import { Coins } from "lucide-react";
import { DailyCheckInModal } from "@/components/features/auth/DailyCheckInModal";

interface Wallet {
  balance: number;
}

export function AuthWidget() {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuth();
  const { coinBalance, setCoinBalance } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      setCoinBalance(null);
      return;
    }

    let active = true;
    apiClient
      .get<Wallet>("/api/wallet/balance")
      .then((wallet) => active && setCoinBalance(wallet.balance))
      .catch(() => active && setCoinBalance(null));

    return () => {
      active = false;
    };
  }, [isAuthenticated, user?.id, setCoinBalance]);

  const handleLogout = async () => {
    setIsOpen(false);
    await logout();
    router.push("/");
  };

  if (!isAuthenticated || !user) {
    return (
      <div className="flex items-center gap-2">
        <Link href="/login" className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-bold text-zinc-800 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-900">
          Đăng nhập
        </Link>
        <Link href="/register" className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700">
          Đăng ký
        </Link>
      </div>
    );
  }

  return (
    <div className="relative flex items-center gap-2" ref={dropdownRef}>
      {user.role === "user" && <DailyCheckInModal onClaimed={setCoinBalance} />}
      <span className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-amber-400/25 px-2.5 text-xs font-semibold tabular-nums text-amber-600 dark:text-amber-300" title="Số xu hiện có">
        <Coins className="h-3.5 w-3.5" />
        {coinBalance === null ? "--" : coinBalance.toLocaleString()}
      </span>

      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-600 text-sm font-semibold text-white"
        aria-label="Mở menu tài khoản"
        aria-expanded={isOpen}
      >
        {user.name?.charAt(0).toUpperCase() || "U"}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-11 z-50 w-52 rounded-lg border border-zinc-200 bg-white p-1 shadow-lg dark:border-zinc-800 dark:bg-zinc-950">
          <div className="border-b border-zinc-100 px-3 py-2 dark:border-zinc-800">
            <p className="truncate text-sm font-medium text-zinc-900 dark:text-white">{user.name}</p>
            {user.email && <p className="truncate text-xs text-zinc-500">{user.email}</p>}
          </div>
          {user.role === "admin" && (
            <Link href="/admin" onClick={() => setIsOpen(false)} className="block rounded-md px-3 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-900">
              Quản trị
            </Link>
          )}
          {user.role === "author" && (
            <Link href="/streamer" onClick={() => setIsOpen(false)} className="block rounded-md px-3 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-900">
              Kênh của tôi
            </Link>
          )}
          <button type="button" onClick={handleLogout} className="w-full rounded-md px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30">
            Đăng xuất
          </button>
        </div>
      )}
    </div>
  );
}

export default AuthWidget;
