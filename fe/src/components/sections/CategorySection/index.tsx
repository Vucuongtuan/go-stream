"use client";

import React, { useRef, useState } from "react";
import { ContentRail, type ContentRailHandle } from "@/components/features/contentRail";
import { FeatureCard } from "@/components/features/card";
import { SectionHeader } from "@/components/sections/SectionHeader";
import type { Category } from "@/services/rooms.service";


interface CategorySectionProps {
  categories: Category[];
  title: string;
  slug:string;
}

export function CategorySection({categories,title,slug}: CategorySectionProps) {
  const railRef = useRef<ContentRailHandle>(null);
  const [availability, setAvailability] = useState({ canScrollLeft: false, canScrollRight: false });

  if(categories.length === 0 || !categories) return null

  return (
    <section className="space-y-3" aria-label={title}>
      <SectionHeader
        title={title}
        slug={slug}
        actions={
          (availability.canScrollLeft || availability.canScrollRight) && (
            <div className="hidden items-center gap-1 sm:flex" aria-label="Điều hướng thể loại">
              <button
                type="button"
                onClick={() => railRef.current?.scroll("left")}
                disabled={!availability.canScrollLeft}
                aria-label="Xem thể loại trước"
                className="flex h-7 w-7 items-center justify-center rounded-md border border-zinc-200 text-zinc-500 transition hover:border-zinc-300 hover:bg-zinc-100 hover:text-zinc-900 disabled:cursor-default disabled:opacity-35 dark:border-zinc-800 dark:text-zinc-400 dark:hover:border-zinc-700 dark:hover:bg-zinc-900 dark:hover:text-white"
              >
                <span aria-hidden="true">‹</span>
              </button>
              <button
                type="button"
                onClick={() => railRef.current?.scroll("right")}
                disabled={!availability.canScrollRight}
                aria-label="Xem thể loại tiếp theo"
                className="flex h-7 w-7 items-center justify-center rounded-md border border-zinc-200 text-zinc-500 transition hover:border-zinc-300 hover:bg-zinc-100 hover:text-zinc-900 disabled:cursor-default disabled:opacity-35 dark:border-zinc-800 dark:text-zinc-400 dark:hover:border-zinc-700 dark:hover:bg-zinc-900 dark:hover:text-white"
              >
                <span aria-hidden="true">›</span>
              </button>
            </div>
          )
        }
      />
      <ContentRail ref={railRef} onAvailabilityChange={setAvailability}>
        {categories.map((category:Category) => (
          <FeatureCard
            key={category.id}
            variant="poster"
            title={category.name}
            imageUrl={category.icon}
            href={`/categories/${category.slug}`}
          />
        ))}
      </ContentRail>
    </section>
  );
}

export default CategorySection;
