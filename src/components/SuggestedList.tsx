// src/components/SuggestedList.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

/** Tavsiya element tipi */
export type SuggestedItem = {
  id?: string;
  slug: string;                  // /movie/[slug]
  title: string;
  thumb?: string;                // 16:9 poster/thumbnail
  durationStr?: string;          // "12:34"
  channel?: { name: string; verified?: boolean };
  views?: number;
  uploadedAgo?: string;          // "2 days ago"
  year?: number;                 // alternativ ko'rsatish
};

/** Props:
 *  - items: tayyor ro'yxat (fetch qilinmaydi)
 *  - videoId yoki currentId: backenddan fetch qiladi
 */
type Props = {
  items?: SuggestedItem[];
  videoId?: string;       // asosiy nom
  currentId?: string;     // eski chaqiruvlar uchun alias
  className?: string;
};

/** Compact number (12.3K, 4.1M) */
function compact(n?: number) {
  if (!n) return "0";
  try {
    return Intl.NumberFormat(undefined, { notation: "compact" }).format(n);
  } catch {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
    if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
    return String(n);
  }
}

export default function SuggestedList(props: Props) {
  const [list, setList] = useState<SuggestedItem[]>(props.items ?? []);
  const [loading, setLoading] = useState<boolean>(!props.items);
  const [error, setError] = useState<string | null>(null);

  // 🔁 videoId/currentId ni birxillashtiramiz
  const fetchId = props.videoId ?? props.currentId;

  // items bo'lmasa, API'dan tavsiyalarni olamiz
  useEffect(() => {
    if (props.items?.length) return;       // tayyor ro'yxat bo'lsa, fetch shart emas
    if (!fetchId) return;

    const ctrl = new AbortController();
    setLoading(true);
    setError(null);

    fetch(`/api/videos/${fetchId}/suggested`, { signal: ctrl.signal })
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data = (await r.json()) as SuggestedItem[];
        setList(Array.isArray(data) ? data : []);
      })
      .catch((e) => {
        if (e.name !== "AbortError") setError("Tavsiyalarni yuklab bo‘lmadi.");
      })
      .finally(() => setLoading(false));

    return () => ctrl.abort();
  }, [fetchId, props.items]);

  const hasData = useMemo(() => list && list.length > 0, [list]);

  if (loading) {
    // Skeleton: 6 ta item
    return (
      <div className={props.className ?? ""}>
        <div className="flex flex-col gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="grid grid-cols-[168px_1fr] gap-3 animate-pulse">
              <div className="h-24 w-[168px] rounded-xl bg-[#1c1c22]" />
              <div className="space-y-2">
                <div className="h-4 w-3/4 rounded bg-[#1c1c22]" />
                <div className="h-3 w-1/2 rounded bg-[#1c1c22]" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={props.className ?? ""}>
        <p className="text-sm text-red-400">{error}</p>
      </div>
    );
  }

  if (!hasData) {
    return (
      <div className={props.className ?? ""}>
        <p className="text-white/60 text-sm">O‘xshash videolar topilmadi.</p>
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-3 ${props.className ?? ""}`}>
      {list.map((v) => {
        const key = v.id ?? v.slug;
        const rightMeta =
          v.uploadedAgo ? ` • ${v.uploadedAgo}` : v.year ? ` • ${v.year}` : "";

        return (
          <Link
            key={key}
            href={`/movie/${v.slug}`}
            className="group grid grid-cols-[168px_1fr] gap-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500/60"
          >
            {/* Thumbnail */}
            <div className="relative rounded-xl overflow-hidden aspect-video w-[168px] bg-[#151519] ring-1 ring-[#2a2a33]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={v.thumb || "/file.svg"}
                alt={v.title}
                className="h-full w-full object-cover transition group-hover:opacity-90"
                loading="lazy"
                decoding="async"
              />
              {v.durationStr && (
                <span
                  className="absolute bottom-1 right-1 text-[11px] px-1.5 py-0.5 rounded bg-black/75 text-white"
                  aria-label={`Duration ${v.durationStr}`}
                >
                  {v.durationStr}
                </span>
              )}
            </div>

            {/* Matnlar */}
            <div className="min-w-0">
              <h3 className="text-[15px] leading-5 font-medium line-clamp-2 group-hover:underline">
                {v.title}
              </h3>

              <div className="mt-1 text-xs text-white/60 space-x-1">
                <span>{v.channel?.name ?? "UzbeTube"}</span>
                {v.channel?.verified && (
                  <span aria-label="verified" title="Verified">✔️</span>
                )}
                <span className="before:content-['•'] before:mx-1">
                  {compact(v.views)} ko‘rish
                </span>
                {rightMeta && <span>{rightMeta}</span>}
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
