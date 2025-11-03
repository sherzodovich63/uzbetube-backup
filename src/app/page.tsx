// src/app/page.tsx
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import { MovieCard } from "@/components/MovieCard";
import type { Movie } from "@/types/movie";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

// 🔒 Serverda Firestore o‘qish uchun Admin SDK
import { adminDb } from "@/lib/firebase-admin";

// ✅ HLS client pleer
import VideoPlayerClient from "@/components/VideoPlayerClient";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function toStr(v: unknown): string | undefined {
  return typeof v === "string" ? v : undefined;
}

// 🔧 Firestore Timestamp -> number (ms) ga o‘tkazish
function toMillisSafe(v: any) {
  return v && typeof v?.toMillis === "function" ? v.toMillis() : v ?? null;
}

// 🔧 Movie hujjatini JSON-safe ko‘rinishga keltiramiz
function serializeMovie(data: any): Movie {
  return {
    ...data,
    genres: Array.isArray(data?.genres) ? data.genres : [],
    cast: Array.isArray(data?.cast) ? data.cast : [],
    sources: Array.isArray(data?.sources) ? data.sources : [],
    createdAt: toMillisSafe(data?.createdAt),
    updatedAt: toMillisSafe(data?.updatedAt),
  } as Movie;
}

/* -----------------------------
   1️⃣ Mavjud "movies" (filmlar)
----------------------------- */
async function fetchMovies({
  q,
  year,
  genre,
  cursor,
}: {
  q?: string;
  year?: string;
  genre?: string;
  cursor?: string;
}) {
  let ref = adminDb
    .collection("movies")
    .where("isPublished", "==", true)
    .orderBy("titleLower")
    .limit(24);

  if (year) ref = ref.where("year", "==", Number(year));
  if (genre) ref = ref.where("genres", "array-contains", genre);

  if (q) {
    const s = q.toLowerCase();
    ref = ref.startAt(s).endAt(s + "\uf8ff");
  }

  if (cursor) {
    ref = ref.startAfter(cursor);
  }

  const snap = await ref.get();

  // ✅ MUHIM: doc.id'ni slug sifatida qo‘shamiz
  const items = snap.docs.map((d) =>
    serializeMovie({ slug: d.id, ...(d.data() as any) })
  );

  const nextCursor = items.length
    ? (items[items.length - 1] as any).titleLower
    : null;

  return { items, nextCursor };
}

/* -----------------------------
   2️⃣ Yangi "videos" (upload)
----------------------------- */
async function fetchUploadedVideos() {
  const snap = await adminDb
    .collection("videos")
    .orderBy("createdAt", "desc")
    .limit(12)
    .get();

  const items = snap.docs.map((d) => ({
    id: d.id,
    title: d.data().title as string,
    desc: d.data().desc as string,
    // HLS URL-lar (master.m3u8 yoki sifatlar bo‘yicha)
    hlsUrls: (d.data().hlsUrls || {}) as Record<string, string>,
    poster: (d.data().poster as string | undefined) ?? undefined,
  }));

  return items;
}

/** 🔎 HLS master URL ni tanlab olish (orqaga moslik bilan) */
function pickHlsSrc(hls?: Record<string, string>) {
  if (!hls) return undefined;
  return (
    hls.master ||
    hls["master"] ||
    hls["master.m3u8"] ||
    hls["auto"] ||
    hls["720"] || // fallback: to‘g‘ridan-ts segmentli yoki single stream bo‘lsa
    hls["1080"] ||
    hls["480"] ||
    hls["360"]
  );
}

type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function Home({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const q = toStr(sp.q);
  const year = toStr(sp.year);
  const genre = toStr(sp.genre);
  const cursor = toStr(sp.cursor);

  const [{ items, nextCursor }, uploadedVideos] = await Promise.all([
    fetchMovies({ q, year, genre, cursor }),
    fetchUploadedVideos(),
  ]);

  const t = await getTranslations();

  const baseParams = new URLSearchParams({
    ...(q ? { q } : {}),
    ...(year ? { year } : {}),
    ...(genre ? { genre } : {}),
  });

  return (
    <>
      <Header initial={{ q, year, genre }} />

      <div className="max-w-[1400px] mx-auto px-4 py-4 grid grid-cols-12 gap-6">
        {/* LEFT */}
        <aside className="hidden lg:block lg:col-span-2 xl:col-span-2">
          <Sidebar />
        </aside>

        {/* RIGHT */}
        <main className="col-span-12 lg:col-span-10 xl:col-span-10">
          {items.length === 0 && uploadedVideos.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[50vh] text-center">
              <div className="opacity-80 text-[color:var(--subtle)]">
                <svg
                  width="96"
                  height="96"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                >
                  <rect
                    x="3"
                    y="5"
                    width="18"
                    height="12"
                    rx="2"
                    stroke="currentColor"
                  />
                  <path d="M7 9h6M7 13h10" stroke="currentColor" />
                </svg>
              </div>
              <h2 className="mt-4 text-[color:var(--text)] text-lg font-semibold">
                {t("empty.title")}
              </h2>
              <p className="text-[color:var(--subtle)] text-sm mt-2">
                {t("empty.desc")}
              </p>
              <Link
                href="/upload"
                prefetch={false}
                className="mt-4 px-5 py-2 rounded-full bg-[var(--accent)] hover:brightness-95 transition text-white"
              >
                {t("empty.cta")}
              </Link>
            </div>
          ) : (
            <>
              {/* 🎬 Filmlar */}
              {items.length > 0 && (
                <>
                  <h2 className="text-xl font-semibold mb-3">
                    {t("feed.movies")}
                  </h2>
                  <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4">
                    {items.map((m: Movie) => (
                      <MovieCard key={(m as any).slug} m={m} />
                    ))}
                  </div>
                </>
              )}

              {/* 📺 Yuklangan videolar (HLS pleer) */}
              {uploadedVideos.length > 0 && (
                <>
                  <h2 className="text-xl font-semibold mt-8 mb-3">
                    Foydalanuvchilar yuklagan videolar
                  </h2>
                  <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4">
                    {uploadedVideos.map((v) => {
                      const hlsSrc = pickHlsSrc(v.hlsUrls);
                      return (
                        <div
                          key={v.id}
                          className="border rounded-lg overflow-hidden bg-[color:var(--muted)]"
                        >
                          {/* 👇 HLS master.m3u8 bilan client pleer */}
                          {hlsSrc ? (
                            <VideoPlayerClient
                              src={hlsSrc}
                              poster={v.poster ?? "/favicon.png"}
                              trackId={v.id}
                            />
                          ) : (
                            // Fallback: hls yo‘q bo‘lsa — hech bo‘lmasa yozuv
                            <div className="w-full aspect-video flex items-center justify-center text-sm opacity-70">
                              HLS URL topilmadi
                            </div>
                          )}

                          <div className="p-2">
                            <h3 className="font-medium">{v.title}</h3>
                            <p className="text-sm opacity-80">{v.desc}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}

              {nextCursor && (
                <div className="mt-6 flex justify-center">
                  <a
                    className="px-4 py-2 rounded-xl bg-[color:var(--muted)] hover:bg-[color:var(--muted)]/80 ring-1 ring-[var(--ring)] text-[color:var(--text)]"
                    href={`/?${new URLSearchParams({
                      ...Object.fromEntries(baseParams),
                      cursor: nextCursor,
                    }).toString()}`}
                  >
                    {t("feed.loadMore")}
                  </a>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </>
  );
}
