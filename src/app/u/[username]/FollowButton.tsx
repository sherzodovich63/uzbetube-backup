// src/app/u/[username]/FollowButton.tsx
"use client";
import { useEffect, useState } from "react";

export default function FollowButton({ username }: { username: string }) {
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch(`/api/follow/${username}`)
      .then(r => r.json())
      .then(d => { if (alive) setFollowing(!!d.following); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [username]);

  const toggle = async () => {
    setLoading(true);
    const r = await fetch(`/api/follow/${username}`, { method: "POST" });
    if (r.ok) {
      const j = await r.json();
      setFollowing(!!j.following);
    }
    setLoading(false);
  };

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`rounded-xl px-4 py-2 font-medium ${
        following ? "bg-neutral-800" : "bg-rose-600 hover:bg-rose-700"
      }`}
    >
      {loading ? "..." : following ? "Subscribed" : "Subscribe"}
    </button>
  );
}
