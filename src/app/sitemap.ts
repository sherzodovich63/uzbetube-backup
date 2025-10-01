import { initClient } from '@/lib/firebase-client';
import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';

export default async function sitemap() {
  initClient();
  const db = getFirestore();
  const q  = query(collection(db, 'movies'), where('isPublished','==', true));
  const snap = await getDocs(q);
  const base = process.env.NEXT_PUBLIC_SITE_URL!;
  return snap.docs.map(d => {
    const m = d.data() as any;
    return {
      url: `${base}/movie/${m.slug}`,
      lastModified: new Date(m.updatedAt || m.createdAt || Date.now()),
    };
  });
}
