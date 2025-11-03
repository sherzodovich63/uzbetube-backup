"use client";
import { useEffect, useRef, useState } from "react";
// Agar alias chiziq tortsa, vaqtincha shuni ishlat: "../../../lib/firebase"
import { auth, googleProvider, db } from "@/lib/firebase-client";

import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  onAuthStateChanged,
  ConfirmationResult,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";

function normalizeUzPhone(input: string) {
  let p = input.replace(/\s|-/g, "");
  if (p.startsWith("998")) p = "+" + p;
  if (!p.startsWith("+")) p = "+998" + p.replace(/^0+/, "");
  return p;
}

export default function PhoneLogin() {
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [confirmObj, setConfirmObj] = useState<ConfirmationResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(0);

  const verifierRef = useRef<RecaptchaVerifier | null>(null);
  const unsubAuthRef = useRef<(() => void) | null>(null);

  // User hujjatini yaratish/yangilash
  useEffect(() => {
    unsubAuthRef.current = onAuthStateChanged(auth, async (u) => {
      if (!u) return;
      const ref = doc(db, "users", u.uid);
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        await setDoc(ref, {
          displayName: u.displayName || "",
          photoURL: u.photoURL || "",
          roles: { admin: false },
          createdAt: Date.now(),
        });
      }
    });
    return () => {
      unsubAuthRef.current?.();
      try {
        // @ts-ignore – private API cleanup
        verifierRef.current?.clear?.();
      } catch {}
      verifierRef.current = null;
    };
  }, []);

  // Resend cooldown taymeri
  useEffect(() => {
    if (!resendIn) return;
    const t = setInterval(() => setResendIn((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [resendIn]);

  async function setupCaptcha() {
    if (verifierRef.current) return verifierRef.current;
    verifierRef.current = new RecaptchaVerifier(auth, "recaptcha-container", {
      size: "invisible",
    });
    await verifierRef.current.render();
    return verifierRef.current;
  }

  async function sendCode() {
    setErr(null);
    const normalized = normalizeUzPhone(phone);
    if (!/^\+\d{10,15}$/.test(normalized)) {
      setErr("Telefon raqam noto‘g‘ri. Misol: +998901234567");
      return;
    }
    if (resendIn > 0) return;

    try {
      setBusy(true);
      const verifier = await setupCaptcha();
      const conf = await signInWithPhoneNumber(auth, normalized, verifier);
      setConfirmObj(conf);
      setResendIn(30);
      alert("SMS yuborildi. Kodingizni kiriting.");
    } catch (e: any) {
      console.error(e);
      setErr(e?.message || "SMS yuborishda xatolik.");
    } finally {
      setBusy(false);
    }
  }

  async function verifyCode() {
    setErr(null);
    if (!confirmObj) return;
    if (!code || code.length < 4) {
      setErr("SMS kodni kiriting.");
      return;
    }
    try {
      setBusy(true);
      await confirmObj.confirm(code);
    } catch (e: any) {
      console.error(e);
      setErr(e?.message || "Kod noto‘g‘ri yoki muddati o‘tgan.");
    } finally {
      setBusy(false);
    }
  }

 return (
  <div className="space-y-3">
    {err && (
      <div className="text-red-500 text-sm border border-red-500/40 rounded px-3 py-2">
        {err}
      </div>
    )}

    {!confirmObj ? (
      <>
        <input
          className="w-full border px-3 py-2 rounded"
          placeholder="+998901234567"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          inputMode="tel"
          autoComplete="tel"
        />
        <button
          className="border px-3 py-2 rounded disabled:opacity-60"
          onClick={sendCode}
          disabled={busy || resendIn > 0}
        >
          {resendIn > 0
            ? `Qayta yuborish (${resendIn}s)`
            : "SMS yuborish"}
        </button>
      </>
    ) : (
      <>
        <input
          className="w-full border px-3 py-2 rounded"
          placeholder="SMS kod"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          inputMode="numeric"
          autoComplete="one-time-code"
        />
        <div className="flex items-center gap-2">
          <button
            className="border px-3 py-2 rounded disabled:opacity-60"
            onClick={verifyCode}
            disabled={busy}
          >
            Kodni tasdiqlash
          </button>
          <button
            className="text-sm underline disabled:opacity-60"
            onClick={sendCode}
            disabled={busy || resendIn > 0}
            title="Kodni qayta yuborish"
          >
            {resendIn > 0 ? `(${resendIn}s)` : "Qayta yuborish"}
          </button>
        </div>
      </>
    )}

    {/* reCAPTCHA konteyneri – DOMda bo‘lishi shart */}
    <div id="recaptcha-container" />
  </div>
);
} 