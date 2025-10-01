import Image from 'next/image';
import Link from 'next/link';
import type { Movie } from '@/types/movie';

export function MovieCard({ m }: { m: Movie }) {
  return (
    <Link href={`/movie/${m.slug}`} className="rounded-2xl overflow-hidden bg-zinc-900 hover:bg-zinc-800 transition">
      <div className="relative w-full aspect-[2/3]">
        {m.poster ? (
          <Image src={m.poster} alt={m.title} fill sizes="(max-width:768px) 50vw, 25vw" className="object-cover" />
        ) : (
          <div className="w-full h-full grid place-items-center text-zinc-600">No Poster</div>
        )}
      </div>
      <div className="p-3">
        <div className="text-white font-medium truncate">{m.title}</div>
        <div className="text-xs text-zinc-400">{m.year ?? '—'}</div>
        {!!m.genres?.length && (
          <div className="mt-2 flex flex-wrap gap-1">
            {m.genres.slice(0, 3).map((g) => (
              <span key={g} className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300">{g}</span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}
