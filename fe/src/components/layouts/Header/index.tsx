import React from "react";
import Link from "next/link";
import { SearchForm } from "./SearchForm";
import { AuthWidget } from "./AuthWidget";
import { ThemeToggle } from "@/components/ui";

export function Header() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-200 bg-white/80 text-zinc-900 backdrop-blur-xl dark:border-zinc-900 dark:bg-zinc-950/80 dark:text-white">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6">
        {/* Left: Branding Logo (Minimalist typography) */}
        <div className="flex items-center">
          <Link
            href="/"
            className="flex items-center gap-2 text-md font-black tracking-tight text-zinc-900 hover:text-zinc-600 dark:text-white dark:hover:text-zinc-300 transition-colors"
          >
            {/* Live Indicator Dot */}
            <div className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
            </div>
            <span>GOSTREAM</span>
          </Link>
        </div>

        {/* Middle: Interactive Search Bar */}
        <SearchForm />

        {/* Right: Interactive Auth Profile widget & Theme Toggle */}
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <AuthWidget />
        </div>
      </div>
    </header>
  );
}

export default Header;

