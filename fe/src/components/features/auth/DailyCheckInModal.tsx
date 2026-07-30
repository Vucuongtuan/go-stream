"use client";

import { useEffect, useState } from "react";
import { CalendarCheck, Check, Coins, Loader2 } from "lucide-react";
import { apiClient } from "@/lib/api-client";

interface CheckInDay {
  date: string;
  claimed: boolean;
}

interface CheckInStatus {
  reward: number;
  claimed_today: boolean;
  days: CheckInDay[];
}

interface CheckInResult {
  new_balance: number;
}

interface DailyCheckInModalProps {
  onClaimed: (balance: number) => void;
}

const dayLabels = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

export function DailyCheckInModal({ onClaimed }: DailyCheckInModalProps) {
  const [status, setStatus] = useState<CheckInStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    apiClient.get<CheckInStatus>("/api/wallet/check-in/status")
      .then((data) => {
        // Do not render a partial/stale API response. This can happen while
        // the frontend is deployed before the new status endpoint is live.
        if (active) setStatus(Array.isArray(data?.days) ? data : null);
      })
      .catch(() => {
        // A failed status check must not block the rest of the page.
        if (active) setStatus(null);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => { active = false; };
  }, []);

  const claim = async () => {
    if (isClaiming || !status) return;
    setIsClaiming(true);
    setClaimError(null);
    try {
      const result = await apiClient.post<CheckInResult>("/api/wallet/check-in");
      onClaimed(result.new_balance);
      setStatus((current) => current ? { ...current, claimed_today: true } : current);
    } catch (error) {
      setClaimError(error instanceof Error ? error.message : "Không thể điểm danh lúc này");
    } finally {
      setIsClaiming(false);
    }
  };

  if (isLoading || !status || !Array.isArray(status.days) || status.claimed_today) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-950/70 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="check-in-title">
      <section className="w-full max-w-md overflow-hidden rounded-3xl border border-amber-300/25 bg-white shadow-2xl shadow-amber-950/30 dark:bg-zinc-950">
        <div className="bg-gradient-to-br from-amber-400 via-orange-400 to-rose-500 px-6 py-7 text-center text-white">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 shadow-lg">
            <CalendarCheck className="h-6 w-6" />
          </div>
          <h2 id="check-in-title" className="text-xl font-extrabold">Điểm danh hôm nay</h2>
          <p className="mt-1 text-sm text-white/85">Mỗi ngày một lần, nhận ngay {status.reward} coin.</p>
        </div>

        <div className="p-5">
          <div className="grid grid-cols-7 gap-1.5" aria-label="Lịch điểm danh 7 ngày">
            {status.days.map((day, index) => (
              <div key={day.date} className={`flex min-h-20 flex-col items-center justify-center rounded-xl border text-center ${day.claimed ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-600 dark:text-emerald-300" : "border-zinc-200 bg-zinc-50 text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400"}`}>
                <span className="text-[10px] font-bold">{dayLabels[index]}</span>
                <span className="mt-1 text-xs font-semibold">{day.date.slice(8)}</span>
                {day.claimed ? <Check className="mt-1 h-3.5 w-3.5" /> : <Coins className="mt-1 h-3.5 w-3.5 text-amber-500" />}
              </div>
            ))}
          </div>

          <button onClick={claim} disabled={isClaiming} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-amber-400 px-4 py-3 text-sm font-extrabold text-zinc-950 shadow-lg shadow-amber-400/20 transition hover:bg-amber-300 disabled:cursor-wait disabled:opacity-70">
            {isClaiming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Coins className="h-4 w-4" />}
            Nhận {status.reward} coin
          </button>
          {claimError && <p className="mt-2 text-center text-xs text-red-500">{claimError}</p>}
        </div>
      </section>
    </div>
  );
}
