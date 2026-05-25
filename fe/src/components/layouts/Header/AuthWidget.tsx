"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

export function AuthWidget() {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setIsOpen(false);
    try {
      await logout();
      router.push("/");
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  return (
    <div className="flex items-center gap-3 relative" ref={dropdownRef}>
      {isAuthenticated && user ? (
        <div className="flex items-center gap-3">
          
          {/* Member badge & greetings (Tablet & Desktop) */}
          <div className="hidden flex-col text-right md:flex select-none">
            <span className="text-sm font-semibold text-white">
              {user.name}
            </span>
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
              {user.role === "admin" ? "Quản trị viên" : user.role === "author" ? "Streamer" : "Thành viên"}
            </span>
          </div>

          {/* Interactive Glowing Avatar button */}
          <button
            onClick={() => setIsOpen((prev) => !prev)}
            className="relative h-10 w-10 rounded-full ring-2 ring-emerald-500/20 hover:ring-emerald-500/50 overflow-hidden bg-zinc-800 flex items-center justify-center text-emerald-400 font-extrabold border border-zinc-700 uppercase cursor-pointer transition-all duration-300 shadow-lg shadow-emerald-500/5 hover:scale-105 active:scale-95"
            title="Tùy chọn tài khoản"
          >
            {user.name ? user.name.charAt(0) : "U"}
            {/* Live active glow dot */}
            <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-400 border-2 border-zinc-900 animate-pulse" />
          </button>

          {/* PREMIUM FLOATING DROPDOWN MENU */}
          {isOpen && (
            <div className="absolute right-0 top-14 z-50 w-64 rounded-2xl border border-white/5 bg-zinc-950/95 backdrop-blur-2xl p-2 shadow-2xl shadow-emerald-950/10 animate-in fade-in slide-in-from-top-3 duration-200">
              
              {/* Dropdown Header: User profile info */}
              <div className="px-3.5 py-3 border-b border-zinc-900 text-left select-none space-y-1">
                <p className="text-xs font-bold text-white truncate">{user.name}</p>
                {user.email && (
                  <p className="text-[10px] text-zinc-500 truncate">{user.email}</p>
                )}
                
                {/* Glowing Role Badge */}
                <div className="pt-1.5">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-bold tracking-wider uppercase border ${
                    user.role === "admin" 
                      ? "bg-red-500/10 border-red-500/20 text-red-400" 
                      : user.role === "author"
                      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                      : "bg-zinc-800 border-zinc-700 text-zinc-400"
                  }`}>
                    {user.role === "admin" ? "⚙️ Quản trị" : user.role === "author" ? "🎙️ Streamer" : "👤 Thành viên"}
                  </span>
                </div>
              </div>

              {/* Dropdown Menu Options */}
              <div className="py-1.5 space-y-0.5 text-left text-xs font-medium text-zinc-300">
                
                {/* 1. Admin Links */}
                {user.role === "admin" && (
                  <Link
                    href="/admin"
                    onClick={() => setIsOpen(false)}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3.5 py-2.5 hover:bg-zinc-900 hover:text-white transition-all cursor-pointer"
                  >
                    <span>⚙️</span>
                    <span>Quản lý hệ thống (Admin)</span>
                  </Link>
                )}

                {/* 2. Streamer/Author Links */}
                {user.role === "author" && (
                  <>
                    <Link
                      href="/streamer"
                      onClick={() => setIsOpen(false)}
                      className="flex w-full items-center gap-2.5 rounded-xl px-3.5 py-2.5 hover:bg-zinc-900 hover:text-white transition-all cursor-pointer text-emerald-400 hover:text-emerald-300 font-semibold"
                    >
                      <span>🎙️</span>
                      <span>Bảng điều khiển Live</span>
                    </Link>

                    {user.slug && (
                      <Link
                        href={`/streamer/${user.slug}`}
                        onClick={() => setIsOpen(false)}
                        className="flex w-full items-center gap-2.5 rounded-xl px-3.5 py-2.5 hover:bg-zinc-900 hover:text-white transition-all cursor-pointer"
                      >
                        <span>📺</span>
                        <span>Kênh của tôi (Public)</span>
                      </Link>
                    )}
                  </>
                )}

                {/* 3. General Links */}
                <Link
                  href="/"
                  onClick={() => setIsOpen(false)}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3.5 py-2.5 hover:bg-zinc-900 hover:text-white transition-all cursor-pointer"
                >
                  <span>🏠</span>
                  <span>Trang chủ Go-Stream</span>
                </Link>

                {/* 4. Upgrade option if not yet streamer/admin */}
                {user.role !== "author" && user.role !== "admin" && (
                  <Link
                    href="/register/author"
                    onClick={() => setIsOpen(false)}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300 transition-all font-semibold cursor-pointer"
                  >
                    <span>✨</span>
                    <span>Trở thành Streamer</span>
                  </Link>
                )}
              </div>

              {/* Dropdown Footer: Logout button */}
              <div className="border-t border-zinc-900 pt-1.5 pb-1">
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-red-500 hover:bg-red-500/10 hover:text-red-400 transition-all cursor-pointer font-bold text-left"
                >
                  <span>🚪</span>
                  <span>Đăng xuất</span>
                </button>
              </div>

            </div>
          )}

        </div>
      ) : (
        <div className="flex items-center gap-2.5">
          <Link
            href="/register/author"
            className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-400 hover:text-emerald-400 transition-colors mr-1 cursor-pointer"
          >
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
            </span>
            Trở thành Streamer
          </Link>
          <Link
            href="/login"
            className="rounded-lg bg-zinc-950 border border-zinc-800 px-4 py-2 text-xs font-semibold text-zinc-200 hover:text-white hover:bg-zinc-900 transition-all"
          >
            Đăng nhập
          </Link>
          <Link
            href="/register"
            className="rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2 text-xs font-semibold text-white shadow-lg transition-all duration-200 hover:from-emerald-500 hover:to-teal-500 hover:shadow-emerald-600/10"
          >
            Đăng ký
          </Link>
        </div>
      )}
    </div>
  );
}

export default AuthWidget;
