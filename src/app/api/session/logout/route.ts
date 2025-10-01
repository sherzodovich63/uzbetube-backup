// app/admin/logout/route.ts
import { NextResponse } from "next/server";

export async function GET() {
  // 1) Cookie-larni tozalash (biz qo'ygan session/cookie'lar)
  const base = { httpOnly: true, sameSite: "lax" as const, path: "/" };

  const res = new NextResponse("Logged out", { status: 200 });
  res.cookies.set("sherz_session", "", { ...base, maxAge: 0 });
  res.cookies.set("sherz_role", "", { ...base, maxAge: 0 });
  res.cookies.set("admin", "", { ...base, maxAge: 0 });
  res.cookies.set("idToken", "", { ...base, maxAge: 0 });

  // 2) Basic Auth ishlatgan eski brauzer credential’ini ham bekor qilish uchun:
  res.headers.set(
    "WWW-Authenticate",
    `Basic realm="Admin Area (logged out ${Date.now()})"`
  );

  return res;
}
