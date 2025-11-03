"use client";

import { useState } from "react";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { app } from "@/lib/firebase-client";
import PhoneLogin from "./PhoneLogin";

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

      // admin bo‘lsa admin panelga, bo‘lmasa bosh sahifaga
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
    <main className="min-h-[70vh] flex items-start justify-center py-10">
      <div className="w-full max-w-md space-y-6">
        <h1 className="text-xl font-bold">Kirish</h1>

        {/* Google bilan kirish */}
        <button
          onClick={googleLogin}
          disabled={loading}
          className="w-full px-5 py-3 rounded-xl bg-white text-black font-medium disabled:opacity-60"
        >
          {loading ? "Kutilmoqda..." : "Google bilan kirish"}
        </button>

        {/* Ajratuvchi */}
        <div className="flex items-center gap-4">
          <div className="h-px flex-1 bg-white/20" />
          <span className="text-sm text-white/70">yoki</span>
          <div className="h-px flex-1 bg-white/20" />
        </div>

        {/* Telefon raqam bilan kirish (SMS) */}
        <PhoneLogin />
      </div>
    </main>
  );
}
