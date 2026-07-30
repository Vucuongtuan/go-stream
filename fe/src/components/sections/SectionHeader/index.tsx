import React from "react";
import Link from "next/link";

interface SectionHeaderProps {
  title: string;
  slug?: string;
  moreLabel?: string;
  actions?: React.ReactNode;
}

export function SectionHeader({ title, slug, moreLabel = "Xem thêm ›", actions }: SectionHeaderProps) {
  return (
    <header className="flex items-center justify-between">
      <h2 className="text-sm font-bold text-zinc-900 dark:text-white">{title}</h2>
      <div className="flex items-center gap-2">
        {actions}
        {slug && (
          <Link
            href={slug}
            className="text-xs font-medium text-zinc-500 transition-colors hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
          >
            {moreLabel}
          </Link>
        )}
      </div>
    </header>
  );
}

export default SectionHeader;
