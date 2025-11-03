"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { app } from "@/lib/firebase-client";
import { Loader2, ShieldCheck } from "lucide-react";

// 🔧 Env flag: NEXT_PUBLIC_SMS_ENABLED=true bo‘lsa telefon login ko‘rinadi
const SMS_ENABLED = process.env.NEXT_PUBLIC_SMS_ENABLED === "true";

// ⚡ PhoneLogin ni faqat kerak bo‘lsa (flag true) yuklaymiz
const PhoneLogin = SMS_ENABLED
  ? dynamic(() => import("./PhoneLogin"), { ssr: false })
  : null;

const auth = getAuth(app);
const provider = new GoogleAuthProvider();

function cx(...a: (string | false | undefined)[]) {
  return a.filter(Boolean).join(" ");
}

export default function LoginPage() {
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onGoogle() {
    try {
      setErr(null);
      setLoadingGoogle(true);
      await signInWithPopup(auth, provider);
      window.location.href = "/";
    } catch (e: any) {
      setErr(e?.message || "Google orqali kirishda xatolik.");
    } finally {
      setLoadingGoogle(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-80px)] grid place-items-center px-4">
      <div className="w-full max-w-[520px] rounded-2xl bg-[color:var(--surface)] ring-1 ring-[var(--ring)] p-6">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-[var(--accent)]" />
          <h1 className="text-xl font-semibold">Kirish</h1>
        </div>
        <p className="mt-1 text-sm text-[color:var(--subtle)]">
          Google orqali {SMS_ENABLED ? "yoki telefon raqami bilan " : ""}hisobga kiring.
        </p>

        {/* Google login */}
        <button
          onClick={onGoogle}
          disabled={loadingGoogle}
          className={cx(
            "mt-5 w-full h-11 rounded-xl bg-white text-black flex items-center justify-center gap-2",
            "ring-1 ring-[var(--ring)] hover:brightness-95 transition",
            loadingGoogle && "opacity-75 cursor-not-allowed"
          )}
        >
          {loadingGoogle ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <img
              alt=""
              src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
              className="w-5 h-5"
            />
          )}
          Google bilan kirish
        </button>

        {/* Divider */}
        {SMS_ENABLED && (
          <div className="my-5 grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-[color:var(--subtle)]">
            <hr className="border-[var(--ring)]" />
            <span className="text-xs">yoki</span>
            <hr className="border-[var(--ring)]" />
          </div>
        )}

        {/* Telefon (SMS) login – faqat flag yoqilganda */}
        {SMS_ENABLED && PhoneLogin && <PhoneLogin />}

        {/* Terms */}
        <p className="mt-4 text-xs text-[color:var(--subtle)]">
          Kirish tugmasini bosish orqali siz bizning{" "}
          <a className="underline hover:opacity-80" href="/terms">
            foydalanish shartlari
          </a>{" "}
          va{" "}
          <a className="underline hover:opacity-80" href="/privacy">
            maxfiylik siyosati
          </a>
          ga rozilik bildirasiz.
        </p>

        {/* Error */}
        {err && (
          <div className="mt-4 text-sm text-red-400">{err}</div>
        )}
      </div>
    </div>
  );
}
