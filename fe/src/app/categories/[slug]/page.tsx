
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Eye, Radio } from "lucide-react";
import { MainLayout } from "@/components/layouts";
import { resolveMediaUrl } from "@/utils/resolveMediaUrl";
import { roomsService } from "@/services/rooms.service";

export const dynamic = "force-dynamic";

export default async function CategoryDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const category = await roomsService.getCategoryBySlug(slug);

  if (!category) notFound();

  const [rooms, categories] = await Promise.all([
    roomsService.getLiveRoomsByCategory(category.id),
    roomsService.getCategories(),
  ]);
  const liveRooms = rooms ?? [];
  const categoryOptions = categories ?? [];
  const categoryIcon = resolveMediaUrl(category.icon);

  return (
    <MainLayout>
      <main className="mx-auto w-full max-w-[1680px] overflow-x-hidden px-4 pb-20 pt-6 sm:px-6 lg:px-8 lg:pt-10">
        <Link href="/categories" className="inline-flex items-center gap-2 text-xs font-bold text-zinc-500 transition hover:text-neon-primary dark:text-zinc-400">
          <ArrowLeft className="h-3.5 w-3.5" /> Tất cả thể loại
        </Link>

        <section className="relative mt-5 overflow-hidden rounded-[2rem] border border-white/10 bg-zinc-950 px-6 py-10 shadow-[0_28px_80px_rgba(0,0,0,0.36)] sm:px-10">
          {categoryIcon ? <img src={categoryIcon} alt="" className="absolute inset-0 h-full w-full object-cover opacity-20 grayscale" /> : null}
          <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-zinc-950/90 to-zinc-950/35" />
          <div className="relative flex max-w-4xl items-end gap-5">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/15 bg-white/10 text-2xl font-black text-white backdrop-blur-sm">
              {categoryIcon ? <img src={categoryIcon} alt="" className="h-full w-full object-cover" /> : category.name.charAt(0)}
            </div>
            <div>
              <div className="mb-3 inline-flex items-center gap-2 text-[10px] font-bold tracking-[0.18em] text-rose-300"><Radio className="h-3.5 w-3.5" />KHÁM PHÁ LIVE</div>
              <h1 className="text-3xl font-black tracking-[-0.04em] text-white sm:text-5xl">{category.name}</h1>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-300 sm:text-base">{category.description || `Các kênh đang phát trực tiếp trong ${category.name}.`}</p>
            </div>
          </div>
        </section>

        {categoryOptions.length > 1 ? (
          <nav className="mt-6 flex gap-2 overflow-x-auto pb-1" aria-label="Chuyển thể loại">
            {categoryOptions.map((option) => (
              <Link key={option.id} href={`/categories/${option.slug}`} className={`shrink-0 rounded-full border px-3.5 py-2 text-xs font-semibold transition ${option.id === category.id ? "border-neon-primary/45 bg-neon-primary text-white" : "border-zinc-200 bg-white text-zinc-600 hover:border-neon-primary/40 hover:text-neon-primary dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300"}`}>
                {option.name}
              </Link>
            ))}
          </nav>
        ) : null}

        <section className="mt-10">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div><h2 className="text-xl font-black tracking-tight text-zinc-900 dark:text-white">Đang phát trực tiếp</h2><p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{liveRooms.length} kênh trong {category.name}</p></div>
          </div>

          {liveRooms.length ? (
            <div className="grid grid-flow-dense grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {liveRooms.map((room) => {
                const thumbnail = resolveMediaUrl(room.thumbnail);
                return <Link key={room.id} href={`/live/${room.host.slug}`} className="group overflow-hidden rounded-2xl border border-zinc-200 bg-white transition hover:-translate-y-1 hover:border-neon-primary/40 hover:shadow-xl dark:border-white/10 dark:bg-zinc-950">
                  <div className="relative aspect-video overflow-hidden bg-zinc-200 dark:bg-zinc-900">
                    {thumbnail ? <img src={thumbnail} alt="" className="h-full w-full object-cover transition duration-700 group-hover:scale-105" /> : <div className="flex h-full items-center justify-center bg-gradient-to-br from-neon-primary/30 to-zinc-900 text-sm font-black text-white">LIVE</div>}
                    <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-md bg-rose-500 px-2 py-1 text-[10px] font-bold text-white"><span className="h-1.5 w-1.5 rounded-full bg-white" />LIVE</span>
                    <span className="absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-md bg-black/65 px-2 py-1 text-[10px] font-bold text-white"><Eye className="h-3 w-3" />{room.viewer_count.toLocaleString()}</span>
                  </div>
                  <div className="p-4"><h3 className="line-clamp-1 text-sm font-bold text-zinc-900 dark:text-white">{room.title}</h3><p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{room.host.name}</p></div>
                </Link>;
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 px-6 py-16 text-center dark:border-zinc-800 dark:bg-zinc-950/50"><Radio className="mx-auto h-7 w-7 text-zinc-400" /><h3 className="mt-4 text-base font-bold text-zinc-800 dark:text-white">Chưa có kênh nào phát trong thể loại này</h3><p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">Hãy khám phá thể loại khác hoặc quay lại sau.</p><Link href="/categories" className="mt-5 inline-flex rounded-xl bg-neon-primary px-4 py-2.5 text-xs font-bold text-white transition hover:bg-neon-primary/90">Xem thể loại khác</Link></div>
          )}
        </section>
      </main>
    </MainLayout>
  );
}
