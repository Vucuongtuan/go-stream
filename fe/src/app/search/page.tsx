import Link from "next/link";
import { MainLayout } from "@/components/layouts";
import { searchGlobal, type SearchResults } from "@/services/search.service";
import { resolveMediaUrl } from "@/utils/resolveMediaUrl";

export const dynamic = "force-dynamic";

function ResultSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">{title}</h2>
      {children}
    </section>
  );
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  const params = await searchParams;
  const query = (Array.isArray(params.q) ? params.q[0] : params.q)?.trim() ?? "";
  const results = query ? await searchGlobal(query) : null;
  const data: SearchResults = results ?? { rooms: [], authors: [], games: [] };
  const total = data.rooms.length + data.authors.length + data.games.length;

  return (
    <MainLayout>
      <div className="mx-auto w-full max-w-6xl space-y-10 pb-16 pt-4">
        <header>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {query ? `Kết quả cho “${query}”` : "Nhập từ khoá để tìm kênh, streamer hoặc trò chơi."}
          </p>
          {query && <h1 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white">{total} kết quả</h1>}
        </header>

        {!query ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Bạn có thể tìm bằng tên kênh, streamer, trò chơi hoặc tag.</p>
        ) : total === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Không tìm thấy kết quả phù hợp.</p>
        ) : (
          <div className="space-y-10">
            {data.rooms.length > 0 && (
              <ResultSection title="Kênh đang trực tiếp">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {data.rooms.map((room) => (
                    <Link key={room.id} href={`/live/${room.host.slug}`} className="flex gap-3 rounded-lg bg-zinc-100/70 p-3 dark:bg-zinc-900/40">
                      <div className="h-16 w-28 shrink-0 overflow-hidden rounded-md bg-zinc-200 dark:bg-zinc-800">
                        {resolveMediaUrl(room.thumbnail) && <img src={resolveMediaUrl(room.thumbnail)} alt="" className="h-full w-full object-cover" />}
                      </div>
                      <div className="min-w-0 py-0.5">
                        <p className="truncate text-sm font-medium text-zinc-900 dark:text-white">{room.title}</p>
                        <p className="mt-1 truncate text-xs text-zinc-500">{room.host.name} · {room.viewer_count.toLocaleString()} người xem</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </ResultSection>
            )}

            {data.authors.length > 0 && (
              <ResultSection title="Streamer">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {data.authors.map((author) => (
                    <Link key={author.id} href={author.user.slug ? `/streamer/${author.user.slug}` : "/browse"} className="flex items-center gap-3 rounded-lg bg-zinc-100/70 p-3 dark:bg-zinc-900/40">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-zinc-200 text-sm font-semibold text-zinc-500 dark:bg-zinc-800">
                        {resolveMediaUrl(author.avatar) ? <img src={resolveMediaUrl(author.avatar)} alt="" className="h-full w-full object-cover" /> : author.display_name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-zinc-900 dark:text-white">{author.display_name}</p>
                        <p className="truncate text-xs text-zinc-500">{author.bio || author.user.name}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </ResultSection>
            )}

            {data.games.length > 0 && (
              <ResultSection title="Trò chơi">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                  {data.games.map((game) => (
                    <Link key={game.id} href={game.category ? `/categories/${game.category.slug}` : "/categories"} className="overflow-hidden rounded-lg bg-zinc-100/70 dark:bg-zinc-900/40">
                      <div className="aspect-[4/3] bg-zinc-200 dark:bg-zinc-800">
                        {resolveMediaUrl(game.cover_image) && <img src={resolveMediaUrl(game.cover_image)} alt="" className="h-full w-full object-cover" />}
                      </div>
                      <p className="truncate px-3 py-2 text-sm font-medium text-zinc-900 dark:text-white">{game.name}</p>
                    </Link>
                  ))}
                </div>
              </ResultSection>
            )}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
