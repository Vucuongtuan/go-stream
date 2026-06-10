"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

export function SearchForm() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <form
      onSubmit={handleSearchSubmit}
      className="hidden max-w-md flex-1 px-4 sm:block"
    >
      <div className="relative">
        <input
          type="text"
          placeholder="Tìm kiếm kênh, trò chơi hoặc video..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-lg border border-zinc-200 bg-zinc-50 py-2 pl-3.5 pr-10 text-sm text-zinc-900 placeholder-zinc-400 shadow-sm transition-all duration-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950/80 dark:text-white dark:placeholder-zinc-500"
        />
        <button
          type="submit"
          className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.8}
            stroke="currentColor"
            className="h-4 w-4"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.637 10.637z"
            />
          </svg>
        </button>
      </div>
    </form>
  );
}

export default SearchForm;
