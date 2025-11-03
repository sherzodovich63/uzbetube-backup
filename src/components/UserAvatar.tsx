"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

type Me = {
  uid: string;
  username?: string;
  image?: string | null;
};

export default function UserAvatar() {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    fetch("/api/session", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => { if (alive) setMe(j?.user ?? null); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  // login bo'lmasa avatar ko'rsatmaymiz
  if (loading || !me) return null;

  const href = me.username ? `/u/${me.username}` : "/settings";
  const src = me.image || "/logo.jpg"; // fallback rasm

  return (
    <Link href={href} className="ml-1" aria-label="Profil">
      <Image
        src={src}
        alt="Avatar"
        width={36}
        height={36}
        className="rounded-full object-cover ring-1 ring-white/10 hover:ring-white/30 transition"
      />
    </Link>
  );
}
