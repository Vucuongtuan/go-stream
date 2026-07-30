import { getAPIBaseURL } from "@/lib/api-client";

export function resolveMediaUrl(url?: string) {
  if (!url) return undefined;
  if (url.startsWith("http")) {
    const parsed = new URL(url);
    const isLocalMediaHost = parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
    const isRemoteViewer = typeof window !== "undefined" && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1";
    if (!isLocalMediaHost || !isRemoteViewer) return url;
    return `${getAPIBaseURL()}${parsed.pathname}${parsed.search}${parsed.hash}`;
  }
  return `${getAPIBaseURL()}${url}`;
}
