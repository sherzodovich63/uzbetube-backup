"use client";

import { useMemo, useState } from "react";

type Props = {
  /** ✅ page.tsx dan keladigan ixtiyoriy id (TS xatosini yo'qotadi) */
  videoId?: string;

  initialLiked?: boolean;
  initialSaved?: boolean;
  likeCount?: number;
  onLikeAction?: (next: boolean) => void;
  onShareAction?: () => void;
  onSaveAction?: (next: boolean) => void;
  onMoreAction?: () => void;
  className?: string;
};

export default function VideoActions({
  videoId,            // <- hozircha faqat tip uchun; xohlasangiz ichida ishlatasiz
  initialLiked = false,
  initialSaved = false,
  likeCount,
  onLikeAction,
  onShareAction,
  onSaveAction,
  onMoreAction,
  className = "",
}: Props) {
  const [liked, setLiked] = useState(initialLiked);
  const [saved, setSaved] = useState(initialSaved);

  const likeLabel = useMemo(() => {
    const base = "Yoqqan";
    if (typeof likeCount !== "number") return base + (liked ? " • Siz" : "");
    const delta =
      liked && !initialLiked ? 1 :
      !liked && initialLiked ? -1 : 0;
    return `${base} ${formatCount(likeCount + delta)}${liked ? " • Siz" : ""}`;
  }, [liked, likeCount, initialLiked]);

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Btn
        ariaLabel="Yoqqan"
        active={liked}
        onClick={() => {
          const next = !liked;
          setLiked(next);
          onLikeAction?.(next);
          // Istasangiz: if (videoId) fetch(`/api/videos/${videoId}/like`, { method:"POST", body: JSON.stringify({ like: next }) })
        }}
        leadingIcon={<ThumbIcon filled={liked} />}
      >
        {likeLabel}
      </Btn>

      <Btn ariaLabel="Ulashish" onClick={() => onShareAction?.()} leadingIcon={<ShareIcon />}>
        Ulashish
      </Btn>

      <Btn
        ariaLabel="Saqlash"
        active={saved}
        onClick={() => {
          const next = !saved;
          setSaved(next);
          onSaveAction?.(next);
          // Istasangiz: if (videoId) fetch(`/api/videos/${videoId}/save`, { method:"POST", body: JSON.stringify({ save: next }) })
        }}
        leadingIcon={<SaveIcon filled={saved} />}
      >
        {saved ? "Saqlandi" : "Saqlash"}
      </Btn>

      <Btn ariaLabel="Boshqa amallar" onClick={() => onMoreAction?.()}>…</Btn>
    </div>
  );
}

/* ------- UI helpers ------- */

function Btn({
  children,
  onClick,
  ariaLabel,
  active,
  leadingIcon,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  ariaLabel?: string;
  active?: boolean;
  leadingIcon?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={onClick}
      className={`px-3 py-1.5 rounded-xl border text-sm flex items-center gap-1.5 transition
        border-[#2a2a33] hover:bg-[#151519] ${active ? "bg-[#151519]" : ""}`}
    >
      {leadingIcon}
      <span className="whitespace-nowrap">{children}</span>
    </button>
  );
}

function ThumbIcon({ filled }: { filled?: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"}
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 9V5a3 3 0 0 0-3-3l-2 7" />
      <path d="M7 11v8a2 2 0 0 0 2 2h7.28a2 2 0 0 0 1.94-1.52l1.38-6A2 2 0 0 0 17.67 11H14z" />
      <path d="M7 11H4a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h3" />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7" />
      <path d="M16 6l-4-4-4 4" />
      <path d="M12 2v14" />
    </svg>
  );
}

function SaveIcon({ filled }: { filled?: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21l-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function formatCount(n: number) {
  if (typeof n !== "number" || Number.isNaN(n)) return "";
  if (n < 1_000) return `${n}`;
  if (n < 1_000_000) return `${+(n / 1_000).toFixed(n % 1_000 ? 1 : 0)}K`;
  if (n < 1_000_000_000) return `${+(n / 1_000_000).toFixed(n % 1_000_000 ? 1 : 0)}M`;
  return `${+(n / 1_000_000_000).toFixed(n % 1_000_000_000 ? 1 : 0)}B`;
}
