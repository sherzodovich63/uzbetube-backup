"use client";

import Link from "next/link";
import type { Movie } from "@/types/movie";
import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function MovieCard({ m }: { m: Movie }) {
  // mavjud maydonlar saqlansin
  const thumb =
    (m as any).thumbnail || (m as any).posterUrl || (m as any).image || "/file.svg";
  const views = (m as any).views as number | undefined;
  const duration = (m as any).duration as string | undefined;

  // yangi: preview url (mp4/gif)
  const preview =
    (m as any).previewUrl ||
    (m as any).preview ||
    (m as any).gif ||
    (m as any).teaserUrl;

  // hover holati va video nazorati
  const [hovered, setHovered] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // GIF yoki video ekanini taxmin qilish
  const isGif = typeof preview === "string" && preview.toLowerCase().endsWith(".gif");

  // Share tugmasi (fallback bilan)
  async function handleShare(e: React.MouseEvent) {
    e.preventDefault();
    const url = `${typeof window !== "undefined" ? window.location.origin : ""}/movie/${m.slug}`;
    const data = { title: (m as any).title ?? "UzbeTube", text: (m as any).title ?? "", url };
    // @ts-ignore
    if (navigator.share) {
      try { /* @ts-ignore */ await navigator.share(data); } catch { /* ignore */ }
    } else if (navigator.clipboard) {
      try { await navigator.clipboard.writeText(url); } catch { /* ignore */ }
    }
  }

  // Placeholder funksiyalar (backendga ulab olamiz)
  function handleLike(e: React.MouseEvent) { e.preventDefault(); /* TODO: like endpoint */ }
  function handleWatchLater(e: React.MouseEvent) { e.preventDefault(); /* TODO: watch-later endpoint */ }

  return (
    <Link
      href={`/movie/${(m as any).slug}`}
      className="group rounded-2xl overflow-hidden ring-1 ring-[#1f1f22] bg-[#121216]
                 hover:ring-[#e11d48]/40 transition"
      onMouseEnter={() => {
        setHovered(true);
        // video bo‘lsa auto play
        if (videoRef.current) videoRef.current.play().catch(() => {});
      }}
      onMouseLeave={() => {
        setHovered(false);
        if (videoRef.current) {
          videoRef.current.pause();
          videoRef.current.currentTime = 0;
        }
      }}
    >
      <div className="relative aspect-video bg-[#151519]">
        {/* Asosiy poster */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={thumb}
          alt={(m as any).title}
          loading="lazy"
          className="w-full h-full object-cover group-hover:opacity-95 transition"
        />

        {/* Hover preview (gif yoki mp4) */}
        {preview && (
          <AnimatePresence>
            {hovered && (
              isGif ? (
                // GIF bo‘lsa img overlay
                // eslint-disable-next-line @next/next/no-img-element
                <motion.img
                  key="gif"
                  src={preview}
                  alt=""
                  className="w-full h-full object-cover absolute inset-0"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                />
              ) : (
                // MP4 bo‘lsa video overlay (muted, loop, inline)
                <motion.video
                  key="mp4"
                  ref={videoRef}
                  src={preview}
                  muted
                  loop
                  playsInline
                  className="w-full h-full object-cover absolute inset-0"
                  preload="metadata"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                />
              )
            )}
          </AnimatePresence>
        )}

        {/* Davomiylik badge (mavjud kodingiz saqlangan) */}
        {duration && (
          <span className="absolute bottom-2 right-2 text-[11px] px-1.5 py-0.5 rounded bg-black/70 text-white">
            {duration}
          </span>
        )}

        {/* Glassmorphism quick actions */}
        <div className="absolute top-2 right-2 flex gap-2">
          <button
            aria-label="Like"
            onClick={handleLike}
            className="px-3 py-1.5 rounded-xl bg-white/10 backdrop-blur border border-white/15 text-xs
                       hover:bg-white/20 transition"
          >
            ❤
          </button>
          <button
            aria-label="Share"
            onClick={handleShare}
            className="px-3 py-1.5 rounded-xl bg-white/10 backdrop-blur border border-white/15 text-xs
                       hover:bg-white/20 transition"
          >
            ↗
          </button>
          <button
            aria-label="Watch later"
            onClick={handleWatchLater}
            className="px-3 py-1.5 rounded-xl bg-white/10 backdrop-blur border border-white/15 text-xs
                       hover:bg-white/20 transition"
          >
            ⏱
          </button>
        </div>
      </div>

      <div className="p-3">
        {/* line-clamp fallback (pluginsiz) — saqlab qo‘ydim */}
        <div
          className="text-sm font-semibold leading-snug"
          style={{
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {(m as any).title}
        </div>
        <div className="mt-1 text-xs text-white/60">
          {views ? `${views.toLocaleString()} ko‘rish` : ""}
        </div>
      </div>
    </Link>
  );
}
