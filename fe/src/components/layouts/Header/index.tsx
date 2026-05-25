import React from "react";
import Link from "next/link";
import { SearchForm } from "./SearchForm";
import { AuthWidget } from "./AuthWidget";

export function Header() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-800 bg-zinc-900/80 backdrop-blur-xl">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6">
        {/* Left: Branding Logo (Static SSR) */}
        <div className="flex items-center">
          <Link
            href="/"
            className="flex items-center gap-2.5 text-xl font-bold tracking-tight text-white hover:opacity-90 transition-opacity"
          >
            {/* Pulsing Live Indicator */}
            <div className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </div>
            <span className="bg-gradient-to-r from-emerald-400 via-green-300 to-teal-400 bg-clip-text text-transparent drop-shadow-[0_2px_8px_rgba(16,185,129,0.15)]">
              Go-Stream
            </span>
          </Link>
        </div>

        {/* Middle: Interactive Search Bar (Client Side logic separated) */}
        <SearchForm />

        {/* Right: Interactive Auth Profile widget (Client Side logic separated) */}
        <AuthWidget />
      </div>
    </header>
  );
}

export default Header;
