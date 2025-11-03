import { app } from "@/lib/firebase-client";
import { getFirestore, collection, getDocs, query, where } from "firebase/firestore";

export default async function sitemap() {
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
  const db = getFirestore(app);
  const snap = await getDocs(query(collection(db, "movies"), where("isPublished", "==", true)));

  const movieUrls = snap.docs.map((d) => {
    const m: any = d.data();
    return {
      url: `${base}/movie/${m.slug}`,
      lastModified: new Date().toISOString(),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    };
  });

  return [
    { url: `${base}/`, lastModified: new Date().toISOString(), changeFrequency: "daily" as const, priority: 1 },
    ...movieUrls,
  ];
}
