"use client";

import { useEffect, useState } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { app as firebaseApp } from "@/lib/firebase-client";

type Comment = { id: string; userId: string; text: string; createdAt?: any };

export default function VideoComments({ videoId }: { videoId: string }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [text, setText] = useState("");
  const [token, setToken] = useState<string | null>(null);

  const auth = getAuth(firebaseApp);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setToken(user ? await user.getIdToken() : null);
    });
    return () => unsub();
  }, [auth]);

  // Load comments
  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/video/comments?videoId=${encodeURIComponent(videoId)}`);
      if (res.ok) {
        const data = await res.json();
        setComments(data.comments || []);
      }
    })();
  }, [videoId]);

  async function submit() {
    const body = text.trim();
    if (!token || !body) return;

    // optimistic UI
    const tempId = `tmp-${Date.now()}`;
    setComments((prev) => [{ id: tempId, userId: "me", text: body }, ...prev]);
    setText("");

    const res = await fetch(`/api/video/comments?videoId=${encodeURIComponent(videoId)}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ text: body }),
    });

    if (!res.ok) {
      // revert on error
      setComments((prev) => prev.filter((c) => c.id !== tempId));
      alert("Failed to add comment");
      return;
    }

    const real = await res.json();
    setComments((prev) => [{ ...real }, ...prev.filter((c) => c.id !== tempId)]);
  }

  return (
    <div className="mt-6">
      <h3 className="text-lg font-semibold mb-3">Comments</h3>

      <div className="flex gap-2 mb-4">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Write a comment..."
          className="flex-1 border rounded-xl px-3 py-2 bg-background"
        />
        <button
          onClick={submit}
          disabled={!token || !text.trim()}
          className="px-4 py-2 rounded-xl bg-rose-600 text-white disabled:opacity-50"
        >
          Send
        </button>
      </div>

      <ul className="space-y-3">
        {comments.map((c) => (
          <li key={c.id} className="border rounded-xl p-3">
            <p className="text-sm leading-relaxed">{c.text}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
