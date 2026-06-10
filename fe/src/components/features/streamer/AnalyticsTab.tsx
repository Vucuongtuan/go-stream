"use client";

import React, { useEffect, useState, useCallback } from "react";
import { analyticsService, RankEntry, LeaderboardEntry } from "@/services/analytics.service";

interface AnalyticsTabProps {
  roomId?: number;
  streamerId?: number;
}

type Period = "daily" | "weekly" | "monthly" | "yearly";
type Metric = "donate" | "viewers" | "chat";

const PERIOD_LABELS: Record<Period, string> = {
  daily: "Hôm nay",
  weekly: "Tuần này",
  monthly: "Tháng này",
  yearly: "Năm nay",
};

const METRIC_LABELS: Record<Metric, string> = {
  donate: "💰 Top Donate",
  viewers: "👁 Top Viewers",
  chat: "💬 Top Chat",
};

export function AnalyticsTab({ roomId, streamerId }: AnalyticsTabProps) {
  const [chatCount, setChatCount] = useState<number | null>(null);
  const [topDonors, setTopDonors] = useState<RankEntry[]>([]);
  const [topChatters, setTopChatters] = useState<RankEntry[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [leaderboardPeriod, setLeaderboardPeriod] = useState<Period>("daily");
  const [leaderboardMetric, setLeaderboardMetric] = useState<Metric>("donate");
  const [myRank, setMyRank] = useState<{ rank?: number; score?: number; ranked: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [lbLoading, setLbLoading] = useState(false);

  // Fetch live room stats (chat count, top donors, top chatters)
  useEffect(() => {
    if (!roomId) { setLoading(false); return; }
    setLoading(true);
    Promise.all([
      analyticsService.getRoomStats(roomId),
      analyticsService.getRoomTopDonors(roomId, 10),
      analyticsService.getRoomTopChatters(roomId, 10),
    ]).then(([stats, donors, chatters]) => {
      setChatCount(stats?.chat_count ?? null);
      setTopDonors(donors?.donors ?? []);
      setTopChatters(chatters?.chatters ?? []);
    }).finally(() => setLoading(false));
  }, [roomId]);

  // Fetch leaderboard
  const fetchLeaderboard = useCallback(async () => {
    setLbLoading(true);
    const [lb, rank] = await Promise.all([
      analyticsService.getLeaderboard(leaderboardMetric, leaderboardPeriod, 10),
      streamerId
        ? analyticsService.getStreamerRank(streamerId, leaderboardMetric, leaderboardPeriod)
        : Promise.resolve(null),
    ]);
    setLeaderboard(lb?.entries ?? []);
    setMyRank(rank ?? null);
    setLbLoading(false);
  }, [leaderboardMetric, leaderboardPeriod, streamerId]);

  useEffect(() => { fetchLeaderboard(); }, [fetchLeaderboard]);

  // Auto-refresh live stats every 15s when room is live
  useEffect(() => {
    if (!roomId) return;
    const interval = setInterval(() => {
      analyticsService.getRoomStats(roomId).then((s) => setChatCount(s?.chat_count ?? null));
      analyticsService.getRoomTopDonors(roomId, 10).then((d) => setTopDonors(d?.donors ?? []));
      analyticsService.getRoomTopChatters(roomId, 10).then((c) => setTopChatters(c?.chatters ?? []));
    }, 15000);
    return () => clearInterval(interval);
  }, [roomId]);

  return (
    <div className="space-y-6 text-left">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-3xl border border-zinc-200 dark:border-white/5 bg-white dark:bg-zinc-900/40 backdrop-blur-xl shadow-sm space-y-1">
          <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">💬 Tin nhắn chat (phiên này)</span>
          <h3 className="text-2xl font-bold text-zinc-900 dark:text-white">
            {loading ? (
              <span className="inline-block w-16 h-7 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
            ) : (
              (chatCount ?? 0).toLocaleString()
            )}
          </h3>
          {!loading && chatCount !== null && (
            <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/10">
              ● Live tracking
            </span>
          )}
        </div>

        <div className="p-5 rounded-3xl border border-zinc-200 dark:border-white/5 bg-white dark:bg-zinc-900/40 backdrop-blur-xl shadow-sm space-y-1">
          <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">💰 Top Donor (phiên này)</span>
          <h3 className="text-2xl font-bold text-yellow-600 dark:text-yellow-500">
            {loading ? (
              <span className="inline-block w-20 h-7 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
            ) : topDonors.length > 0 ? (
              `${topDonors[0].score.toLocaleString()} coins`
            ) : (
              "—"
            )}
          </h3>
          {topDonors[0] && (
            <span className="text-[10px] text-zinc-400">User #{topDonors[0].user_id}</span>
          )}
        </div>

        <div className="p-5 rounded-3xl border border-zinc-200 dark:border-white/5 bg-white dark:bg-zinc-900/40 backdrop-blur-xl shadow-sm space-y-1">
          <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">🏆 Hạng của bạn</span>
          <h3 className="text-2xl font-bold text-zinc-900 dark:text-white">
            {myRank?.ranked ? `#${myRank.rank}` : "—"}
          </h3>
          <span className="text-[10px] text-zinc-400">
            {myRank?.ranked ? `${(myRank.score ?? 0).toLocaleString()} điểm` : "Chưa có dữ liệu"}
          </span>
        </div>
      </div>

      {/* Live Room Rankings (donors + chatters side by side) */}
      {roomId && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Top Donors */}
          <div className="p-5 rounded-3xl border border-zinc-200 dark:border-white/5 bg-white dark:bg-zinc-900/40 backdrop-blur-xl shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white">💰 Top Donors (phiên live)</h3>
            {loading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-8 bg-zinc-100 dark:bg-zinc-800 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : topDonors.length === 0 ? (
              <p className="text-xs text-zinc-400 py-4 text-center">Chưa có donate trong phiên này</p>
            ) : (
              <div className="space-y-2">
                {topDonors.map((d) => (
                  <div key={d.user_id} className="flex items-center gap-3 p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800">
                    <span className={`text-xs font-black w-6 text-center shrink-0 ${d.rank === 1 ? "text-yellow-500" : d.rank === 2 ? "text-zinc-400" : d.rank === 3 ? "text-amber-600" : "text-zinc-500"}`}>
                      #{d.rank}
                    </span>
                    <div className="h-7 w-7 rounded-full bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center text-xs font-bold text-yellow-600">
                      {String(d.user_id).charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 truncate">User #{d.user_id}</p>
                    </div>
                    <span className="text-xs font-bold font-mono text-yellow-600 dark:text-yellow-400 shrink-0">
                      {d.score.toLocaleString()} ⭐
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Top Chatters */}
          <div className="p-5 rounded-3xl border border-zinc-200 dark:border-white/5 bg-white dark:bg-zinc-900/40 backdrop-blur-xl shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white">💬 Top Chatters (phiên live)</h3>
            {loading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-8 bg-zinc-100 dark:bg-zinc-800 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : topChatters.length === 0 ? (
              <p className="text-xs text-zinc-400 py-4 text-center">Chưa có tin nhắn trong phiên này</p>
            ) : (
              <div className="space-y-2">
                {topChatters.map((c) => (
                  <div key={c.user_id} className="flex items-center gap-3 p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800">
                    <span className={`text-xs font-black w-6 text-center shrink-0 ${c.rank === 1 ? "text-emerald-500" : "text-zinc-500"}`}>
                      #{c.rank}
                    </span>
                    <div className="h-7 w-7 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-xs font-bold text-emerald-600">
                      {String(c.user_id).charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 truncate">User #{c.user_id}</p>
                    </div>
                    <span className="text-xs font-bold font-mono text-emerald-600 dark:text-emerald-400 shrink-0">
                      {c.score.toLocaleString()} msgs
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Global Leaderboard */}
      <div className="p-6 rounded-3xl border border-zinc-200 dark:border-white/5 bg-white dark:bg-zinc-900/40 backdrop-blur-xl shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white">🏆 Bảng xếp hạng Streamer</h3>
            <p className="text-[11px] text-zinc-400 mt-0.5">So sánh vị trí của bạn với các streamer khác trên toàn nền tảng.</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Metric selector */}
            <div className="flex rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden text-[10px]">
              {(["donate", "viewers", "chat"] as Metric[]).map((m) => (
                <button
                  key={m}
                  onClick={() => setLeaderboardMetric(m)}
                  className={`px-3 py-1.5 font-bold transition-colors cursor-pointer ${leaderboardMetric === m ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900" : "bg-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"}`}
                >
                  {METRIC_LABELS[m]}
                </button>
              ))}
            </div>
            {/* Period selector */}
            <div className="flex rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden text-[10px]">
              {(["daily", "weekly", "monthly", "yearly"] as Period[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setLeaderboardPeriod(p)}
                  className={`px-3 py-1.5 font-bold transition-colors cursor-pointer ${leaderboardPeriod === p ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900" : "bg-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"}`}
                >
                  {PERIOD_LABELS[p]}
                </button>
              ))}
            </div>
          </div>
        </div>

        {lbLoading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-zinc-100 dark:bg-zinc-800 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : leaderboard.length === 0 ? (
          <div className="py-10 text-center text-zinc-400">
            <p className="text-sm">Chưa có dữ liệu cho kỳ này.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {leaderboard.map((entry) => {
              const isMe = streamerId && entry.streamer_id === streamerId;
              return (
                <div
                  key={entry.streamer_id}
                  className={`flex items-center gap-4 p-3 rounded-2xl transition-all ${isMe ? "bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-500/20" : "bg-zinc-50 dark:bg-zinc-900/30 border border-zinc-100 dark:border-zinc-800"}`}
                >
                  <span className={`text-sm font-black w-8 text-center shrink-0 ${entry.rank === 1 ? "text-yellow-500" : entry.rank === 2 ? "text-zinc-400" : entry.rank === 3 ? "text-amber-600" : "text-zinc-500"}`}>
                    {entry.rank === 1 ? "🥇" : entry.rank === 2 ? "🥈" : entry.rank === 3 ? "🥉" : `#${entry.rank}`}
                  </span>
                  <div className="h-9 w-9 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-sm font-bold text-zinc-600 dark:text-zinc-300 shrink-0">
                    {String(entry.streamer_id).charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-bold truncate ${isMe ? "text-emerald-700 dark:text-emerald-400" : "text-zinc-800 dark:text-zinc-200"}`}>
                      Streamer #{entry.streamer_id} {isMe && <span className="text-[9px] ml-1 bg-emerald-500/10 text-emerald-600 px-1.5 py-0.2 rounded-full">Bạn</span>}
                    </p>
                  </div>
                  <span className={`text-xs font-bold font-mono shrink-0 ${leaderboardMetric === "donate" ? "text-yellow-600 dark:text-yellow-400" : "text-zinc-700 dark:text-zinc-300"}`}>
                    {entry.score.toLocaleString()}
                    <span className="text-[9px] text-zinc-400 ml-1">
                      {leaderboardMetric === "donate" ? "coins" : leaderboardMetric === "chat" ? "msgs" : "pts"}
                    </span>
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
