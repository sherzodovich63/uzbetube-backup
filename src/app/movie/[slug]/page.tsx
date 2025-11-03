// src/app/movie/[slug]/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Header from "@/components/Header";
import VideoPlayer from "@/components/VideoPlayer";
import SuggestedList from "@/components/SuggestedList";
import ChannelBar from "@/components/ChannelBar";
import VideoActions from "@/components/VideoActions";
import VideoComments from "@/components/VideoComments";
import { useTranslations } from "next-intl";
import { db } from "@/lib/firebase-client";
import { doc, getDoc, collection, query, where, limit, getDocs } from "firebase/firestore";

/* ================= Types ================= */
type MovieDoc = {
  slug: string;
  title: string;
  year?: number;
  description?: string;
  isPublished?: boolean;
  posterUrl?: string;
  thumbnail?: string;
  duration?: string;      // "PT2H3M" yoki "02:03:01"
  genres?: string[];
  sources?: { url: string }[];
  channel?: string;
  views?: number;
  uploadDate?: string;
  thumbsVtt?: string;     // ixtiyoriy: sprite VTT yo‘li
  intro?: { start: number; end: number }; // ixtiyoriy: Skip intro
};

/* ============== PROXY + HLS master tanlov (kuchaytirilgan) ============== */
function ensureHttp(u?: string) {
  if (!u) return "";
  // data://, blob://, file:// ni bloklaymiz
  if (!/^https?:\/\//i.test(u)) return "";
  return u.trim();
}

function wrapProxy(raw?: string) {
  const s = ensureHttp(raw);
  if (!s) return "";
  // allaqachon proxy bo‘lsa, qayta o‘rama
  if (s.startsWith("/api/stream?u=")) return s;
  return "/api/stream?u=" + encodeURIComponent(s);
}

function pickHlsMaster(sources?: { url: string }[]): string {
  const all = sources?.map(s => ensureHttp(s.url)).filter(Boolean) ?? [];
  if (all.length === 0) return "";

  // 1) master.m3u8
  let hls = all.find(u => /\/master\.m3u8(\?|$)/i.test(u)) ||
            all.find(u => /master\.m3u8/i.test(u));

  // 2) index.m3u8 -> master.m3u8
  if (!hls) {
    const cand = all.find(u => /\/index\.m3u8(\?|$)/i.test(u)) ?? all[0];
    if (cand) {
      hls = cand
        .replace(/\/(240p|360p|480p|540p|720p|1080p|1440p|2160p)\/index\.m3u8$/i, "/master.m3u8")
        .replace(/\/index\.m3u8$/i, "/master.m3u8");
    }
  }
  return hls || "";
}

/* ======================= PAGE ======================= */
export default function MoviePage() {
  const { slug: slugParam } = useParams<{ slug: string }>();
  const slug = typeof slugParam === "string" ? decodeURIComponent(slugParam) : "";
  const t = useTranslations("movie");

  const [movie, setMovie] = useState<MovieDoc | null>(null);
  const [similar, setSimilar] = useState<MovieDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const mounted = useRef(true);

  /* ========== 1) Filmni olish ========== */
  useEffect(() => {
    mounted.current = true;
    setMovie(null);
    setLoadErr(null);
    setLoading(true);

    (async () => {
      try {
        if (!slug) return;
        const snap = await getDoc(doc(db, "movies", slug));
        if (!mounted.current) return;

        if (snap.exists()) setMovie(snap.data() as MovieDoc);
        else setMovie(null);
      } catch (e: any) {
        if (mounted.current) setLoadErr(e?.message || "load_failed");
      } finally {
        if (mounted.current) setLoading(false);
      }
    })();

    return () => {
      mounted.current = false;
    };
  }, [slug]);

  /* ========== 2) O‘xshash filmlar ========== */
  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!movie) return;
      try {
        const mainGenre = movie.genres?.[0];
        const base = collection(db, "movies");

        const qref = mainGenre
          ? query(
              base,
              where("isPublished", "==", true),
              where("genres", "array-contains", mainGenre),
              limit(12)
            )
          : query(base, where("isPublished", "==", true), limit(12));

        const snap = await getDocs(qref);
        if (cancelled) return;

        const items = snap.docs
          .map((d) => d.data() as MovieDoc)
          .filter((x) => x.slug !== movie.slug && x.isPublished);

        // unique by slug
        const uniq = items.filter(
          (x, i, arr) => arr.findIndex((y) => y.slug === x.slug) === i
        );
        setSimilar(uniq);
      } catch (err) {
        if (!cancelled) console.error("Similar fetch error", err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [movie]);

  /* ========== 3) SEO title ========== */
  useEffect(() => {
    if (!movie?.title) return;
    document.title = `${movie.title}${movie.year ? ` (${movie.year})` : ""} — UzbeTube`;
  }, [movie?.title, movie?.year]);

  /* ========== 4) Views +1 (bir marta) ========== */
  const viewSent = useRef(false);
  useEffect(() => {
    if (!movie?.isPublished || !slug || viewSent.current) return;
    viewSent.current = true;

    const tmo = setTimeout(async () => {
      try {
        await fetch(`/api/videos/${encodeURIComponent(slug)}/views`, { method: "POST" });
        setMovie((prev) => (prev ? { ...prev, views: (prev.views ?? 0) + 1 } : prev));
      } catch {}
    }, 1500);

    return () => clearTimeout(tmo);
  }, [movie?.isPublished, slug]);

  /* ========== 5) JSON-LD ========== */
  const jsonLd = useMemo(() => {
    if (!movie) return null;
    const poster = movie.thumbnail || movie.posterUrl;
    const mp4 = movie.sources?.find((s) => s.url?.toLowerCase().endsWith(".mp4"))?.url;
    const hls = pickHlsMaster(movie.sources) || undefined;

    return {
      "@context": "https://schema.org",
      "@type": "VideoObject",
      name: movie.title,
      description: movie.description ?? "",
      thumbnailUrl: poster ? [poster] : [],
      uploadDate: movie.uploadDate ?? new Date().toISOString(),
      duration: movie.duration,
      contentUrl: mp4,
      embedUrl: hls,
    };
  }, [movie]);

  /* ========== 6) Not Found / Error ========== */
  if (!loading && (!slug || !movie || !movie.isPublished)) {
    return (
      <>
        <Header />
        <main className="mx-auto max-w-[1280px] px-4 py-16 text-center text-white/60">
          {loadErr ? t("notFound") : t("notFound")}
        </main>
      </>
    );
  }

  /* ========== 7) HLS manzili (faqat movie kelganda) ========== */
  const srcRaw = movie ? pickHlsMaster(movie.sources) : "";
  const src = wrapProxy(srcRaw);
  const thumb = movie?.posterUrl || movie?.thumbnail || "/file.svg";

  // ► Skip intro (agar bor bo‘lsa)
  const skips = movie?.intro
    ? [{ kind: "intro" as const, start: Math.max(0, movie.intro.start), end: Math.max(movie.intro.end, movie.intro.start + 1) }]
    : [];

  /* ========== 8) Layout (YouTube-style) ========== */
  return (
    <>
      <Header />
      <main className="min-h-screen bg-[#0a0a0a]">
        {/* 🎬 VIDEO BLOK */}
        <div className="mx-auto w-full max-w-[1600px] px-2 sm:px-4">
          <div
            className={[
              // muammo: ba’zi temalarda tashqi o‘ram aspect bilan to‘qnashadi — VideoPlayer o‘zi aspect-video qo‘yadi
              "rounded-2xl overflow-hidden bg-black ring-1 ring-[#2a2a33] shadow-lg",
            ].join(" ")}
          >
            {loading ? (
              <div className="aspect-video animate-pulse bg-[#151519]" />
            ) : src ? (
              <VideoPlayer
                src={src}
                poster={thumb as any}
                autoPlay={false}
                // PREMIUM: resume, media session title
                videoId={`mv-${movie!.slug}`}
                title={`${movie!.title}${movie!.year ? ` (${movie!.year})` : ""}`}
                // thumbnails vtt (bo‘lsa)
                thumbnailsVttUrl={movie?.thumbsVtt}
                // skip intro (bo‘lsa)
                chapters={[]}
                subtitles={[]}
                // @ts-ignore – VideoPlayer ichida "skips" bor (biz qo‘shganmiz)
                skips={skips}
              />
            ) : (
              <div className="aspect-video grid place-items-center text-white/60">
                {t("sourceMissing")}
              </div>
            )}
          </div>
        </div>

        {jsonLd && (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
          />
        )}

        {/* 📄 VIDEO OSTIDAGI MA’LUMOT */}
        <div className="mx-auto mt-5 w-full max-w-[1400px] px-2 sm:px-4">
          <h1 className="text-2xl font-semibold text-white leading-tight">
            {movie?.title} {movie?.year ? `(${movie.year})` : ""}
          </h1>

          <p className="mt-1 text-sm text-white/60">
            {t("views", { count: movie?.views ?? 0 })}
            {movie?.genres?.length ? ` • ${movie.genres.join(", ")}` : ""}
          </p>

          {/* 🎥 Ikki ustunli layout */}
          <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
            <section>
              <ChannelBar
                channel={{ name: movie?.channel ?? "UzbeTube Kino" }}
                views={movie?.views}
                onSubscribeAction={() => console.log("Subscribed!")}
              />

              {/* Aktsiyalar */}
              <div className="mt-3">
                <VideoActions
                  initialLiked={false}
                  initialSaved={false}
                  likeCount={movie?.views ?? 0}
                  onLikeAction={() => console.log("Liked!")}
                  onShareAction={async () => {
                    const url =
                      typeof window !== "undefined"
                        ? `${window.location.origin}/movie/${encodeURIComponent(slug)}`
                        : `/movie/${encodeURIComponent(slug)}`;
                    try {
                      // @ts-ignore
                      if (navigator.share) await navigator.share({ title: movie?.title, url });
                      else if (navigator.clipboard) await navigator.clipboard.writeText(url);
                    } catch {}
                  }}
                  onSaveAction={() => console.log("Saved!")}
                  onMoreAction={() => console.log("More clicked")}
                />
              </div>

              {/* Ta’rif bloki */}
              {movie?.description && (
                <div className="mt-4 rounded-2xl ring-1 ring-[#2a2a33] bg-[#121216]">
                  <div className="p-4 space-y-2 text-sm">
                    <div className="font-semibold">{t("description")}</div>
                    <p className="text-white/70 whitespace-pre-line">{movie.description}</p>
                    <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs text-white/50">
                      {movie.year && <div><b>{t("year")}:</b> {movie.year}</div>}
                      {movie.duration && <div><b>{t("duration")}:</b> {movie.duration}</div>}
                      {movie.genres?.length ? <div><b>{t("genre")}:</b> {movie.genres.join(", ")}</div> : null}
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-6">
                <VideoComments videoId={slug} />
              </div>
            </section>

            {/* Tavsiya videolar */}
            <aside className="hidden xl:block">
              {loading ? (
                <div className="flex flex-col gap-3">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="flex gap-3">
                      <div className="w-[168px] aspect-video rounded-xl bg-[#151519] animate-pulse" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 rounded bg-[#151519] animate-pulse" />
                        <div className="h-3 w-1/2 rounded bg-[#151519] animate-pulse" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <SuggestedList
                  items={similar.map((s) => ({
                    slug: s.slug,
                    title: s.title,
                    thumb: s.posterUrl || s.thumbnail,
                    durationStr: s.duration,
                    channel: { name: s.channel ?? "UzbeTube" },
                    views: s.views ?? 0,
                    year: s.year,
                  }))}
                />
              )}
            </aside>
          </div>
        </div>
      </main>
    </>
  );
}
