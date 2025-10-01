import type { Metadata } from 'next';
import { initClient } from '@/lib/firebase-client';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

export async function generateMovieMetadata({ params }: any): Promise<Metadata> {
  initClient();
  const db = getFirestore();
  const snap = await getDoc(doc(db, 'movies', params.slug));
  if (!snap.exists() || !snap.data().isPublished) return { title: 'Not found' };

  const m = snap.data() as any;
  const base = process.env.NEXT_PUBLIC_SITE_URL!;
  const url  = `${base}/movie/${params.slug}`;
  const img  = m.poster || undefined;
  const desc = m.description || `${m.title}${m.year ? ` (${m.year})` : ''}`;

  return {
    title: m.title,
    description: desc,
    alternates: { canonical: url },
    openGraph: { title: m.title, description: desc, url, images: img ? [img] : undefined },
    twitter: { card: 'summary_large_image', title: m.title, description: desc, images: img ? [img] : undefined },
  };
}
