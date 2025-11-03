"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

type Me = {
  uid: string;
  username?: string;
  image?: string | null;
  email?: string | null;
};

export default function AvatarMenu() {
  const [me, setMe] = useState<Me | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    fetch("/api/session", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (!alive) return;
        setMe(j?.user ?? null);
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  const logout = async () => {
    await fetch("/api/session/logout", { method: "POST" });
    window.location.reload();
  };

  // Hali login bo'lmagan bo'lsa — oddiy "Kirish" tugmasini ko'rsatamiz
  if (!me && !loading) {
    return (
      <Link
        href="/login"
        className="rounded-xl bg-rose-600 px-4 py-2 text-white hover:bg-rose-700 transition"
      >
        Kirish
      </Link>
    );
  }

  // Yuklanayotganda kichik skelet
  if (loading) {
    return <div className="h-9 w-9 animate-pulse rounded-full bg-neutral-700/40" />;
  }

  // Avatar + dropdown
  const avatarSrc = me?.image || "/logo.jpg"; // fallback rasming bor ekan

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((s) => !s)}
        className="inline-flex items-center gap-2 rounded-full ring-1 ring-white/10 hover:ring-white/25 transition"
        aria-label="Account"
      >
        <Image
          src={avatarSrc}
          alt="avatar"
          width={36}
          height={36}
          className="rounded-full object-cover"
        />
      </button>

      {open && (
        <div
          className="absolute right-0 mt-2 w-48 overflow-hidden rounded-xl border border-white/10 bg-neutral-900/90 backdrop-blur shadow-lg"
          onMouseLeave={() => setOpen(false)}
        >
          <div className="px-3 py-2 text-xs text-neutral-400">
            {me?.email || me?.username || "Hisob"}
          </div>
          <div className="h-px bg-white/10" />

          <Link
            href={me?.username ? `/u/${me.username}` : "/settings"}
            className="block px-4 py-2 hover:bg-white/5"
          >
            Profil
          </Link>

          <Link href="/upload" className="block px-4 py-2 hover:bg-white/5">
            Video yuklash
          </Link>

          <Link href="/settings" className="block px-4 py-2 hover:bg-white/5">
            Sozlamalar
          </Link>

          <button
            onClick={logout}
            className="block w-full px-4 py-2 text-left text-rose-400 hover:bg-rose-500/10"
          >
            Chiqish
          </button>
        </div>
      )}
    </div>
  );
}
