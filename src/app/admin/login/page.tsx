"use client";
import { useState } from "react";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { app } from "@/lib/firebase-client";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);

 async function googleLogin() {
  try {
    setLoading(true);
    const auth = getAuth(app);
    const provider = new GoogleAuthProvider();
    const cred = await signInWithPopup(auth, provider);
    const idToken = await cred.user.getIdToken();

    console.log("[login] token oldik, API ga yuboramiz");

    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 20_000);

    const res = await fetch("/api/session/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
      signal: ctl.signal,
    }).catch((e) => {
      throw new Error("API fetch failed: " + e.message);
    });
    clearTimeout(t);

    const ct = res.headers.get("content-type") || "";
    if (!ct.includes("application/json")) {
      const text = await res.text();
      throw new Error("API non-JSON: " + text.slice(0, 200));
    }

    const data = await res.json();
    if (!res.ok) throw new Error(data?.error ?? "unknown_error");

    location.href = data.admin ? "/admin/upload" : "/";
  } catch (e: any) {
    if (e?.name === "AbortError") {
      alert("API javobi 20 soniyada kelmadi (timeout).");
    } else {
      alert("Google login xatosi: " + (e?.message ?? e));
    }
  } finally {
    setLoading(false);
  }
}


  return (
    <main className="min-h-[60vh] grid place-items-center">
      <button
        onClick={googleLogin}
        disabled={loading}
        className="px-5 py-3 rounded-xl bg-white text-black font-medium"
      >
        {loading ? "Kutilmoqda..." : "Google bilan kirish"}
      </button>
    </main>
  );
}
