// src/app/api/session/login/route.ts
import { NextResponse, NextRequest } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { initAdmin } from "@/lib/firebase-admin";
import bcrypt from "bcryptjs";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    initAdmin();

    // body ni olish — Firebase idToken yoki username+password ikkala variantni qabul qilamiz
    const body: any = await req.json().catch(() => ({} as any));

    // COOKIE OPTIONS (secure prod-da)
    const secure = process.env.NODE_ENV === "production";
    const cookieOpts = {
      httpOnly: true,
      secure,
      sameSite: "lax" as const,
      path: "/",
      maxAge: 60 * 60 * 24, // 1 day
    };

    // 1) Agar idToken kelgan bo'lsa — original Firebase oqimi (o'zgarmadi, faqat sherz_role qo'shildi)
    const { idToken, username, password } = body;

    if (idToken) {
      // Firebase tokenni tekshir
      const decoded = await getAuth().verifyIdToken(idToken).catch((e) => {
        console.error("verifyIdToken failed:", e);
        return null;
      });

      if (!decoded) {
        return NextResponse.json({ ok: false, error: "invalid_token" }, { status: 401 });
      }

      // ADMIN EMAILS orqali tekshiruv
      const admins = (process.env.ADMIN_EMAILS || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const isAdmin = decoded.email ? admins.includes(decoded.email) : false;

      const res = NextResponse.json({ ok: true, admin: isAdmin });

      // doimiy: token cookie (seniing avvalgi oqiming)
      res.cookies.set("idToken", idToken, cookieOpts);

      // admin flag cookie (sana: agar admin bo'lsa 1, bo'lmasa o'chir)
      if (isAdmin) {
        res.cookies.set("admin", "1", cookieOpts);
        // qo'shimcha: RBAC uchun sherz_role cookie ham qo'yamiz (agar kerak bo'lsa)
        res.cookies.set("sherz_role", "admin", cookieOpts);
        // session cookie ham qo'yish: ba'zi middleware'lar session borligini tekshirsa
        res.cookies.set("sherz_session", "1", cookieOpts);
      } else {
        // agar admin emas bo'lsa admin cookie'ni o'chirish
        res.cookies.set("admin", "", { ...cookieOpts, maxAge: 0 });
        res.cookies.set("sherz_role", "", { ...cookieOpts, maxAge: 0 });
      }

      return res;
    }

    // 2) Agar username+password kelsa — local basic form-based login (bcrypt bilan)
    if (username && password) {
      const expectedUser = process.env.ADMIN_USER || "admin";
      const expectedHash = process.env.ADMIN_HASH;
      if (username !== expectedUser || !expectedHash) {
        return NextResponse.json({ ok: false, error: "invalid_credentials" }, { status: 401 });
      }

      const ok = await bcrypt.compare(password, expectedHash).catch((e) => {
        console.error("bcrypt.compare error:", e);
        return false;
      });

      if (!ok) {
        return NextResponse.json({ ok: false, error: "invalid_credentials" }, { status: 401 });
      }

      // muvaffaqiyat — cookie'lar o'rnatilsin
      const res = NextResponse.json({ ok: true, admin: true });

      // bizda idToken yo'q bu holatda — lekin admin flag va session qo'yamiz
      res.cookies.set("sherz_session", "1", cookieOpts);
      res.cookies.set("sherz_role", "admin", cookieOpts);
      res.cookies.set("admin", "1", cookieOpts);

      // agar xohlasang — shunchaki note: idToken cookie'ni bo'shatib qo'yamiz (agar avval bo'lsa)
      res.cookies.set("idToken", "", { ...cookieOpts, maxAge: 0 });

      return res;
    }

    // Hech qanday mos keluvchi credential kelmadi
    return NextResponse.json({ ok: false, error: "no_credentials" }, { status: 400 });
  } catch (e) {
    console.error("login error:", e);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
