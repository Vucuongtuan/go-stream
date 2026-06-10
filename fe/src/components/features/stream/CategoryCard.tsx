import React from "react";
import { Card } from "@/components/ui";

interface CategoryCardProps {
  name: string;
  viewers?: string | number;
  gradient?: string;
}

export function CategoryCard({ name, viewers = 0 }: CategoryCardProps) {
  return (
    <Card variant="glass" padding="md" className="group cursor-pointer select-none text-left">
      {/* Decorative tag */}
      <div className="flex items-center gap-1.5 mb-1.5">
        <span className="h-1.5 w-1.5 rounded-full bg-neon-primary animate-pulse" />
        <span className="text-[9px] font-extrabold text-zinc-400 dark:text-zinc-500 tracking-widest uppercase">
          CATEGORY
        </span>
      </div>

      <h4 className="text-sm font-bold text-zinc-800 dark:text-zinc-100 group-hover:text-neon-primary transition-colors truncate">
        {name}
      </h4>
      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400 font-medium font-mono">
        {viewers ? `${viewers.toLocaleString()} viewers` : "Active streams"}
      </p>
    </Card>
  );
}

export default CategoryCard;
