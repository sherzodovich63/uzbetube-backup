'use client';
import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase-client';
import {
  doc, getDoc,
  collection, query, where, limit, getDocs
} from 'firebase/firestore';
import VideoPlayer from '@/components/VideoPlayer';
export { generateMovieMetadata as generateMetadata } from './seo';

export default function MoviePage({ params }: { params: { slug: string } }) {
  const [movie, setMovie] = useState<any | null>(null);
  const [similar, setSimilar] = useState<any[]>([]);

  // Asosiy filmni olish
  useEffect(() => {
    getDoc(doc(db, 'movies', params.slug)).then((snap) => {
      setMovie(snap.exists() ? snap.data() : null);
    });
  }, [params.slug]);

  // O‘xshash filmlar
  useEffect(() => {
    if (!movie) return;
    const mainGenre = movie?.genres?.[0];
    if (!mainGenre) return;

    const q = query(
      collection(db, 'movies'),
      where('isPublished', '==', true),
      where('genres', 'array-contains', mainGenre),
      limit(8)
    );

    getDocs(q)
      .then((snap) => {
        const items = snap.docs
          .map((d) => d.data() as any)
          .filter((x) => x.slug !== movie.slug);
        setSimilar(items);
      })
      .catch((err) => console.error('Similar fetch error', err));
  }, [movie]);

  if (!movie || !movie.isPublished) {
    return <div className="p-6">Topilmadi</div>;
  }

  const src = movie.sources?.[0]?.url as string | undefined;

  return (
    <main className="max-w-5xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">
        {movie.title} {movie.year ? `(${movie.year})` : ''}
      </h1>

      {src ? <VideoPlayer src={src} /> : <div>Video manzili mavjud emas</div>}

      {movie.description && (
        <p className="opacity-80">{movie.description}</p>
      )}

      {similar.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold mt-8 mb-4">O‘xshash filmlar</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {similar.map((s) => (
              <a key={s.slug} href={`/movie/${s.slug}`} className="block rounded bg-zinc-900 p-2">
                <img
                  src={s.posterUrl || '/placeholder.png'}
                  alt={s.title}
                  className="w-full h-40 object-cover rounded"
                />
                <div className="mt-2 text-sm">{s.title}</div>
              </a>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
