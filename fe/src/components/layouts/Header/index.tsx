import React from "react";
import Link from "next/link";
import { SearchForm } from "./SearchForm";
import { AuthWidget } from "./AuthWidget";
import { NotificationMenu } from "./NotificationMenu";

export function Header() {
  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 text-zinc-900 dark:bg-zinc-950/95 dark:text-white">
      <div className="flex h-16 min-w-0 items-center justify-between gap-2 px-3 sm:px-6">
        <div className="flex items-center">
          <Link
            href="/"
            className="flex items-center gap-2 text-md font-black tracking-tight text-zinc-900 dark:text-white"
          >
            <span className="text-lg">VTC</span>
          </Link>
        </div>

        <SearchForm />

        <div className="flex shrink-0 items-center gap-2 sm:gap-4">
          <NotificationMenu />
          <AuthWidget />
        </div>
      </div>
    </header>
  );
}

export default Header;
