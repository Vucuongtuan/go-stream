// Browser clients must go through Nginx. The analytics container is private
// to Docker and is intentionally not published on port 3003.
const ANALYTICS_BASE_URL = process.env.NEXT_PUBLIC_ANALYTICS_URL || "http://localhost";

export interface RoomStats {
  room_id: number;
  chat_count: number;
}

export interface RankEntry {
  user_id: number;
  score: number;
  rank: number;
}

export interface LeaderboardEntry {
  streamer_id: number;
  score: number;
  rank: number;
}

export interface LeaderboardResponse {
  metric: string;
  period: string;
  top: number;
  entries: LeaderboardEntry[];
}

export type LeaderboardMetric = "viewers" | "donate" | "chat";
export type LeaderboardPeriod = "daily" | "weekly" | "monthly" | "yearly";

async function fetchAnalytics<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${ANALYTICS_BASE_URL}${path}`, { cache: "no-store" });
    if (!res.ok) return null;
    return res.json() as Promise<T>;
  } catch {
    return null;
  }
}

export const analyticsService = {
  getRoomStats: (roomId: number) =>
    fetchAnalytics<RoomStats>(`/api/analytics/rooms/${roomId}`),

  getRoomTopDonors: (roomId: number, limit = 10) =>
    fetchAnalytics<{ room_id: number; donors: RankEntry[] }>(
      `/api/analytics/rooms/${roomId}/donors?limit=${limit}`
    ),

  getRoomTopChatters: (roomId: number, limit = 10) =>
    fetchAnalytics<{ room_id: number; chatters: RankEntry[] }>(
      `/api/analytics/rooms/${roomId}/chatters?limit=${limit}`
    ),

  getLeaderboard: (metric: LeaderboardMetric = "donate", period: LeaderboardPeriod = "daily", limit = 10) =>
    fetchAnalytics<LeaderboardResponse>(
      `/api/analytics/leaderboard/streamers?metric=${metric}&period=${period}&limit=${limit}`
    ),

  getStreamerRank: (streamerId: number, metric: LeaderboardMetric = "donate", period: LeaderboardPeriod = "weekly") =>
    fetchAnalytics<{ streamer_id: number; metric: string; period: string; ranked: boolean; rank?: number; score?: number }>(
      `/api/analytics/leaderboard/streamers/${streamerId}?metric=${metric}&period=${period}`
    ),
};
