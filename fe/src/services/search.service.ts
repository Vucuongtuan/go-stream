const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export interface SearchRoom {
  id: number;
  title: string;
  thumbnail?: string;
  viewer_count: number;
  host: { name: string; slug: string };
}

export interface SearchAuthor {
  id: number;
  display_name: string;
  bio?: string;
  avatar?: string;
  user: { name: string; slug?: string };
}

export interface SearchGame {
  id: number;
  name: string;
  slug: string;
  cover_image?: string;
  category?: { name: string; slug: string };
}

export interface SearchResults {
  rooms: SearchRoom[];
  authors: SearchAuthor[];
  games: SearchGame[];
}

export async function searchGlobal(query: string): Promise<SearchResults | null> {
  try {
    const response = await fetch(`${BASE_URL}/api/search?q=${encodeURIComponent(query)}&limit=12`, {
      cache: "no-store",
    });
    if (!response.ok) return null;
    const result = await response.json();
    return (result.data ?? result) as SearchResults;
  } catch {
    return null;
  }
}
