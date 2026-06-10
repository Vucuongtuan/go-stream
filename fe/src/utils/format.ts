/**
 * Formats a number to a compact readable string representation (e.g., 1.5K, 2.3M)
 */
export function formatNumber(n?: number): string {
  if (!n) return "0";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

/**
 * Calculates readable live stream duration
 */
export function formatDuration(startedAt?: string): string {
  if (!startedAt) return "00:00:00";
  const startTime = new Date(startedAt).getTime();
  const diff = Date.now() - startTime;
  if (isNaN(diff) || diff < 0) return "00:00:00";
  const hrs = Math.floor(diff / 3600000).toString().padStart(2, "0");
  const mins = Math.floor((diff % 3600000) / 60000).toString().padStart(2, "0");
  const secs = Math.floor((diff % 60000) / 1000).toString().padStart(2, "0");
  return `${hrs}:${mins}:${secs}`;
}
