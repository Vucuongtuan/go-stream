import React from "react";
import Link from "next/link";
import { resolveMediaUrl } from "@/utils/resolveMediaUrl";
import { ViewerBadge } from "./ViewerBadge";
import type { PosterCardProps } from "./types";

export function PosterCard({
  title,
  imageUrl,
  href,
}: Omit<PosterCardProps, "variant">) {
  const resolvedImageUrl = resolveMediaUrl(imageUrl);

  const content = (
    <div className="w-[92px] shrink-0 sm:w-[200px]">
      <div className="relative aspect-[3/4] overflow-hidden rounded-xl bg-zinc-200 dark:bg-zinc-900">
        {resolvedImageUrl ? (
          <img
            src={resolvedImageUrl}
            alt={title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-zinc-100 text-xl font-bold text-zinc-400 dark:bg-zinc-900 dark:text-zinc-600">
            {title.charAt(0).toUpperCase()}
          </div>
        )}
      </div>
      <p className="mt-1.5 line-clamp-2 text-xs font-medium leading-snug text-zinc-800 dark:text-zinc-200">
        {title}
      </p>
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
