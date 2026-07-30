import React from "react";
import Link from "next/link";
import { resolveMediaUrl } from "@/utils/resolveMediaUrl";
import { ViewerBadge } from "./ViewerBadge";
import type { StreamCardProps } from "./types";

export function StreamCardVariant({
  title,
  imageUrl,
  href,
  streamer,
  viewers,
}: Omit<StreamCardProps, "variant">) {
  const resolvedImageUrl = resolveMediaUrl(imageUrl);

  const content = (
    <div className="w-[140px] shrink-0 sm:w-[350px]">
      <div className="relative aspect-video overflow-hidden rounded-xl bg-zinc-200 dark:bg-zinc-900">
        {typeof viewers === "number" && viewers > 0 && <ViewerBadge viewers={viewers} />}
        {resolvedImageUrl ? (
          <img
            src={resolvedImageUrl}
            alt={title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-zinc-100 text-lg font-bold text-zinc-400 dark:bg-zinc-900 dark:text-zinc-600">
            LIVE
          </div>
        )}
      </div>
      <p className="mt-1.5 line-clamp-2 text-xs font-medium leading-snug text-zinc-800 dark:text-zinc-200">
        {title}
      </p>
      {streamer && (
        <p className="mt-0.5 truncate text-[11px] text-zinc-500 dark:text-zinc-400">
          {streamer}
        </p>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="group block">
        {content}
      </Link>
    );
  }

  return <div className="group">{content}</div>;
}
