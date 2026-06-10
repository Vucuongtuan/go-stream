const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:80";

export interface Room {
  id: number;
  host_id: number;
  title: string;
  description?: string;
  thumbnail?: string;
  status: "offline" | "live" | "ended";
  visibility: "public" | "private" | "unlisted";
  playback_url?: string;
  viewer_count: number;
  started_at?: string;
  host: {
    id: number;
    name: string;
    slug: string;
    avatar?: string;
  };
  category?: {
    id: number;
    name: string;
    slug: string;
  };
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  description?: string;
}

async function fetchAPI<T>(path: string, init?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(`${BASE_URL}${path}`, init);
    if (!res.ok) return null;
    const json = await res.json();
    // main-api wraps in { status, data } format
    return (json.data ?? json) as T;
  } catch {
    return null;
  }
}

export const roomsService = {
  // Live rooms list needs to be fresh instantly, avoid caching
  getLiveRooms: () => fetchAPI<Room[]>(`/api/rooms?status=live`, { cache: "no-store" }),
  
  // Categories list can be cached as it rarely changes
  getCategories: () => fetchAPI<Category[]>(`/api/categories`, { next: { revalidate: 60 } }),
  
  // Single room detail needs to be fresh
  getRoomBySlug: (slug: string) => fetchAPI<Room>(`/api/streamers/${slug}`, { cache: "no-store" }),
};
