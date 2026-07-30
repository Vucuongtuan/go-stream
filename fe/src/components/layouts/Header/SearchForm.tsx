"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { searchGlobal, type SearchResults } from "@/services/search.service";

const emptyResults: SearchResults = { rooms: [], authors: [], games: [] };

export function SearchForm() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<SearchResults>(emptyResults);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const query = searchQuery.trim();
  const resultCount = results.rooms.length + results.authors.length + results.games.length;

  useEffect(() => {
    if (query.length < 2) return;

    let active = true;
    const timer = window.setTimeout(async () => {
      const nextResults = await searchGlobal(query);
      if (!active) return;
      setResults(nextResults ?? emptyResults);
      setIsLoading(false);
    }, 300);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [query]);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  const handleSearchSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!query) return;
    setIsOpen(false);
    router.push(`/search?q=${encodeURIComponent(query)}`);
  };

  const closeDropdown = () => setIsOpen(false);

  return (
    <form onSubmit={handleSearchSubmit} className="hidden max-w-md flex-1 px-4 sm:block">
      <div className="relative" ref={containerRef}>
        <input
          type="search"
          placeholder="Tìm kiếm kênh, trò chơi hoặc video..."
          value={searchQuery}
          onFocus={() => query.length >= 2 && setIsOpen(true)}
          onChange={(event) => {
            const nextQuery = event.target.value;
            setSearchQuery(nextQuery);
            if (nextQuery.trim().length < 2) {
              setResults(emptyResults);
              setIsLoading(false);
              setIsOpen(false);
            } else {
              setIsLoading(true);
              setIsOpen(true);
            }
          }}
          className="w-full rounded-lg bg-zinc-100 py-2 pl-3.5 pr-10 text-sm text-zinc-900 placeholder-zinc-400 outline-none transition-colors focus:bg-zinc-200 dark:bg-zinc-900 dark:text-white dark:placeholder-zinc-500 dark:focus:bg-zinc-800"
          aria-label="Tìm kiếm"
          role="combobox"
          aria-expanded={isOpen}
          aria-controls="search-results"
        />
        <button type="submit" className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200" aria-label="Tìm kiếm">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="h-4 w-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.637 10.637z" />
          </svg>
        </button>

        {isOpen && (
          <div id="search-results" role="listbox" className="absolute left-4 right-4 top-[calc(100%+0.5rem)] z-50 overflow-hidden rounded-lg bg-white py-2 dark:bg-zinc-900">
            {isLoading ? (
              <p className="px-3 py-2 text-xs text-zinc-500">Đang tìm kiếm…</p>
            ) : resultCount === 0 ? (
              <p className="px-3 py-2 text-xs text-zinc-500">Không có kết quả cho “{query}”.</p>
            ) : (
              <>
                <SearchGroup label="Kênh đang trực tiếp">
                  {results.rooms.slice(0, 3).map((room) => (
                    <Link key={room.id} href={`/live/${room.host.slug}`} onClick={closeDropdown} className="block px-3 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800">
                      <p className="truncate text-sm text-zinc-900 dark:text-white">{room.title}</p>
                      <p className="truncate text-xs text-zinc-500">{room.host.name} · {room.viewer_count.toLocaleString()} người xem</p>
                    </Link>
                  ))}
                </SearchGroup>

                <SearchGroup label="Streamer">
                  {results.authors.slice(0, 3).map((author) => (
                    <Link key={author.id} href={author.user.slug ? `/streamer/${author.user.slug}` : "/browse"} onClick={closeDropdown} className="block px-3 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800">
                      <p className="truncate text-sm text-zinc-900 dark:text-white">{author.display_name}</p>
                      <p className="truncate text-xs text-zinc-500">{author.bio || author.user.name}</p>
                    </Link>
                  ))}
                </SearchGroup>

                <SearchGroup label="Trò chơi">
                  {results.games.slice(0, 3).map((game) => (
                    <Link key={game.id} href={game.category ? `/categories/${game.category.slug}` : "/categories"} onClick={closeDropdown} className="block px-3 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800">
                      <p className="truncate text-sm text-zinc-900 dark:text-white">{game.name}</p>
                      {game.category && <p className="truncate text-xs text-zinc-500">{game.category.name}</p>}
                    </Link>
                  ))}
                </SearchGroup>

                <Link href={`/search?q=${encodeURIComponent(query)}`} onClick={closeDropdown} className="mt-1 block px-3 py-2 text-center text-xs font-medium text-emerald-600 hover:bg-zinc-100 dark:text-emerald-400 dark:hover:bg-zinc-800">
                  Xem tất cả kết quả
                </Link>
              </>
            )}
          </div>
        )}
      </div>
    </form>
  );
}

function SearchGroup({ label, children }: { label: string; children: React.ReactNode }) {
  if (!children || (Array.isArray(children) && children.length === 0)) return null;
  return (
    <div className="py-1">
      <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">{label}</p>
      {children}
    </div>
  );
}

export default SearchForm;
