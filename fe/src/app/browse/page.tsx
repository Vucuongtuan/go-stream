import { StreamCardVariant } from "@/components/features/card/StreamCardVariant";
import { MainLayout } from "@/components/layouts";
import { roomsService } from "@/services/rooms.service";
import Link from "next/link";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

export default async function BrowsePage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { page: pageParam } = await searchParams;
  const requestedPage = Number.parseInt(pageParam ?? "1", 10);
  const page = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const rooms = (await roomsService.getLiveRooms(PAGE_SIZE, (page - 1) * PAGE_SIZE)) ?? [];
  const hasNextPage = rooms.length === PAGE_SIZE;

  return (
    <MainLayout>
      <div className="mx-auto w-full space-y-8 pb-20 pt-4">
        <div className="border-b border-zinc-200/60 pb-4 dark:border-zinc-900/60">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-neon-primary">Khám phá</p>
          <h1 className="mt-2 text-2xl font-black tracking-tight text-zinc-900 dark:text-white">Kênh đang trực tiếp</h1>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">Khám phá tất cả các buổi phát sóng đang diễn ra.</p>
        </div>

        {rooms.length > 0 ? (
          <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {rooms.map((room) => (
              <StreamCardVariant
                key={room.id}
                title={room.title}
                imageUrl={room.thumbnail ?? ""}
                href={`/live/${room.host.slug}`}
                streamer={room.host.name}
                viewers={room.viewer_count}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-12 text-center text-sm text-zinc-500 dark:border-zinc-900 dark:bg-zinc-950/40 dark:text-zinc-400">
            Hiện chưa có kênh nào đang phát sóng trực tiếp.
          </div>
        )}

        {rooms.length > 0 ? (
          <nav className="flex items-center justify-center gap-3" aria-label="Phân trang kênh trực tiếp">
            {page > 1 ? (
              <Link href={`/browse?page=${page - 1}`} className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:border-neon-primary hover:text-neon-primary dark:border-zinc-800 dark:text-zinc-200">
                ← Trang trước
              </Link>
            ) : null}
            <span className="text-sm text-zinc-500 dark:text-zinc-400">Trang {page}</span>
            {hasNextPage ? (
              <Link href={`/browse?page=${page + 1}`} className="rounded-lg bg-neon-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-neon-primary/90">
                Xem thêm →
              </Link>
            ) : null}
          </nav>
        ) : null}
      </div>
    </MainLayout>
  );
}
