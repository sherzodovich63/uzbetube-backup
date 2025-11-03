// src/middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// ✅ i18n: brauzer tilidan cookie qo'yish uchun
import { locales, defaultLocale } from "@/i18n/config";

// Upstash rate-limit (bor bo'lsa avtomatik yoqiladi)
let ratelimit: any = null;
(async () => {
  // Dinamik import - middleware edge muhitida tree-shake bo'ladi
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    const { Ratelimit } = await import("@upstash/ratelimit");
    const { Redis } = await import("@upstash/redis");
    const redis = Redis.fromEnv();
    ratelimit = new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(20, "1 m") }); // 20 req/min/IP
  }
})();

/** Basic auth decoder (Edge-friendly, Buffer ishlatmaymiz) */
function decodeBasicAuth(authHeader: string): { user: string; pass: string } | null {
  if (!authHeader?.startsWith("Basic ")) return null;
  try {
    const b64 = authHeader.slice(6).trim();
    // atob edge muhitida mavjud
    const decoded = atob(b64);
    const idx = decoded.indexOf(":");
    if (idx < 0) return null;
    return { user: decoded.slice(0, idx), pass: decoded.slice(idx + 1) };
  } catch {
    return null;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const isProd = process.env.NODE_ENV === "production";

  // ⚙️ Oldindan "next" javobini tayyorlab qo'yamiz (cookie/header qo'yish uchun)
  const res = NextResponse.next();

  // 0) HTTPS majburiy (prod)
  const proto = req.headers.get("x-forwarded-proto");
  if (isProd && proto && proto !== "https") {
    const url = new URL(req.url);
    url.protocol = "https:";
    return NextResponse.redirect(url);
  }

  // 0.1) 🌐 i18n locale cookie (faqat public yo'llarda)
  // admin/api emas bo'lsa, 'locale' cookie yo'q bo'lsa — qo'yib yuboramiz
  if (!pathname.startsWith("/admin") && !pathname.startsWith("/api")) {
    const have = req.cookies.get("locale")?.value;
    if (!have) {
      const al = (req.headers.get("accept-language") || "").toLowerCase();
      const guess = locales.find((l) => al.startsWith(l)) || defaultLocale;
      res.cookies.set("locale", guess, {
        path: "/",
        maxAge: 60 * 60 * 24 * 365, // 1 yil
      });
    }
  }

  // 1) IP allowlist (faqat /admin yo'llari uchun, ixtiyoriy)
  if (pathname.startsWith("/admin")) {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      (req as any).ip ||
      "0.0.0.0";

    const allowed = (process.env.ADMIN_IPS ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    if (allowed.length && !allowed.includes(ip)) {
      return NextResponse.json({ error: "IP not allowed" }, { status: 403 });
    }
  }

  // 2) /api/* ga rate-limit (Upstash sozlangan bo'lsa)
  if (pathname.startsWith("/api/") && ratelimit) {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      (req as any).ip ||
      "0.0.0.0";
    const { success, reset } = await ratelimit.limit(`api:${ip}`);
    if (!success) {
      return new NextResponse("Too Many Requests", {
        status: 429,
        headers: {
          "Retry-After": String(Math.max(1, Math.ceil((reset - Date.now()) / 1000))),
        },
      });
    }
  }

  // 3) /admin/* uchun RBAC (cookie-based login yoki Basic Auth fallback)
  if (pathname.startsWith("/admin")) {
    const session = req.cookies.get("sherz_session")?.value;
    const role = req.cookies.get("sherz_role")?.value; // "admin" | "editor" | "user"
    const adminFlag = req.cookies.get("admin")?.value; // "1" bo'lsa admin (Firebase oqimingdan)

    const hasCookieAccess =
      Boolean(session) && (role === "admin" || role === "editor" || adminFlag === "1");

    // Agar cookie-based auth o'tgan bo'lsa — ruxsat beramiz
    if (hasCookieAccess) {
      // /admin/login sahifasida turgan bo'lsa va allaqachon login bo'lgan bo'lsa — dashboardga yo'naltiramiz
      if (pathname.startsWith("/admin/login")) {
        const url = req.nextUrl.clone();
        url.pathname = "/admin";
        return NextResponse.redirect(url);
      }
      // locale cookie allaqachon qo'yilgan bo'lishi mumkin (yuqorida)
      res.headers.set("x-request-start", String(Date.now()));
      return res;
    }

    // Cookie yo'q/yetarli emas -> Basic Auth fallback (agar env berilgan bo'lsa)
    const U = process.env.BASIC_USER;
    const P = process.env.BASIC_PASS;

    if (U && P) {
      const auth = req.headers.get("authorization") || "";
      const creds = decodeBasicAuth(auth);

      // Authorization yo'q yoki noto'g'ri bo'lsa — prompt
      if (!creds || creds.user !== U || creds.pass !== P) {
        const prompt = new NextResponse("Authentication required", { status: 401 });
        prompt.headers.set("WWW-Authenticate", 'Basic realm="Admin Area"');
        return prompt;
      }

      // Basic Auth muvaffaqiyatli: session/cookie qo'yib yuboramiz (admin sifatida)
      const ok = NextResponse.next();
      const baseCookie = {
        httpOnly: true,
        secure: isProd,
        sameSite: "lax" as const,
        path: "/",
        maxAge: 60 * 60 * 8, // 8 soat
      };
      ok.cookies.set("sherz_session", "1", baseCookie);
      ok.cookies.set("sherz_role", "admin", baseCookie);
      ok.cookies.set("admin", "1", baseCookie);

      // Agar /admin/login bo'lsa — dashboardga redirect
      if (pathname.startsWith("/admin/login")) {
        const url = req.nextUrl.clone();
        url.pathname = "/admin";
        return NextResponse.redirect(url);
      }
      ok.headers.set("x-request-start", String(Date.now()));
      return ok;
    }

    // Cookie yo'q, Basic Auth ham yo'q -> login sahifaga yuboramiz
    const loginPath = "/login"; // yoki "/admin/login"
    const url = req.nextUrl.clone();
    url.pathname = loginPath;
    if (search) url.search = search;
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // 4) Odaty — locale cookie qo'yilgan bo'lishi mumkin
  res.headers.set("x-request-start", String(Date.now()));
  return res;
}

// ❗ matcher'ni kengaytirdik: public sahifalarda locale cookie qo'yish uchun
export const config = {
  matcher: ["/admin/:path*", "/api/:path*", "/((?!_next|.*\\..*).*)"],
};
