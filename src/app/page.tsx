import { app } from "@/lib/firebase-client";
import { getFirestore, collection, query, where, orderBy, limit, getDocs, startAfter } from 'firebase/firestore';
import { MovieCard } from '@/components/MovieCard';
import type { Movie } from '@/types/movie';

export const dynamic = 'force-dynamic';

async function fetchMovies({ q, year, genre, cursor }: {
  q?: string; year?: string; genre?: string; cursor?: string;
}) {

  const db = getFirestore(app);
  const base = collection(db, 'movies');

  const parts: any[] = [where('isPublished', '==', true)];
  let order: any[] = [orderBy('titleLower')];

  if (q) {
    const s = q.toLowerCase();
    parts.push(where('titleLower', '>=', s), where('titleLower', '<=', s + '\uf8ff'));
  }
  if (year) parts.push(where('year', '==', Number(year)));
  if (genre) parts.push(where('genres', 'array-contains', genre));

  let qref = query(base, ...parts, ...order, limit(24));
  if (cursor) {
    // cursor — oxirgi hujjatning titleLower qiymati (oddiy variant)
    qref = query(base, ...parts, ...order, startAfter(cursor), limit(24));
  }

  const snap = await getDocs(qref);
  const items = snap.docs.map((d) => d.data() as Movie);
  const nextCursor = items.length ? items[items.length - 1].titleLower : null;
  return { items, nextCursor };
}

export default async function Home({ searchParams }: { searchParams?: Record<string, string> }) {
  const { q, year, genre, cursor } = searchParams || {};
  const { items, nextCursor } = await fetchMovies({ q, year, genre, cursor });

  return (
    <div className="p-4 max-w-6xl mx-auto">
      {/* Filtr panel (clientga ajratish mumkin, hozir soddaroq) */}
      <form className="mb-4 grid gap-2 sm:grid-cols-3">
        <input
          name="q"
          defaultValue={q || ''}
          placeholder="Qidiruv..."
          className="rounded-xl bg-white/10 text-white px-3 py-2 outline-none"
        />
        <input
          name="year"
          defaultValue={year || ''}
          placeholder="Yil (masalan 2019)"
          className="rounded-xl bg-white/10 text-white px-3 py-2 outline-none"
        />
        <input
          name="genre"
          defaultValue={genre || ''}
          placeholder="Janr (action, drama...)"
          className="rounded-xl bg-white/10 text-white px-3 py-2 outline-none"
        />
        <button className="sm:col-span-3 w-full rounded-xl bg-white text-black py-2 font-medium">Filter</button>
      </form>

      {items.length === 0 ? (
        <div className="text-zinc-400">Hech narsa topilmadi.</div>
      ) : (
        <>
          <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4">
            {items.map((m) => <MovieCard key={m.slug} m={m} />)}
          </div>

          {nextCursor && (
            <div className="mt-6 flex justify-center">
              <a
                className="px-4 py-2 rounded-lg bg-zinc-900 text-white"
                href={`/?${new URLSearchParams({ ...(q?{q}:{}) , ...(year?{year}:{}) , ...(genre?{genre}:{}) , cursor: nextCursor }).toString()}`}
              >
                Ko‘proq ko‘rsatish
              </a>
            </div>
          )}
        </>
      )}
    </div>
  );
}
