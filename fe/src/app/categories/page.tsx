import Link from "next/link";
import { MainLayout } from "@/components/layouts";
import { CategoryCard } from "@/components/features";
import { roomsService } from "@/services/rooms.service";

export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  const categories = (await roomsService.getCategories()) ?? [];

  return (
    <MainLayout>
      <div className="mx-auto w-full space-y-8 pb-20 pt-4">
        <div className="border-b border-zinc-200/60 pb-4 dark:border-zinc-900/60">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-neon-primary">Khám phá</p>
          <h1 className="mt-2 text-2xl font-black tracking-tight text-zinc-900 dark:text-white">Tất cả thể loại</h1>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">Chọn một thể loại để tìm các buổi phát sóng phù hợp.</p>
        </div>

        {categories.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {categories.map((category) => (
              <CategoryCard
                key={category.id}
                name={category.name}
                imageUrl={category.icon}
                viewers=""
              />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-12 text-center text-sm text-zinc-500 dark:border-zinc-900 dark:bg-zinc-950/40 dark:text-zinc-400">
            Chưa có thể loại nào.
          </div>
        )}

        <Link href="/" className="inline-block text-sm font-bold text-neon-primary hover:underline">
          ← Quay về trang chủ
        </Link>
      </div>
    </MainLayout>
  );
}
