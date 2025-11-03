// src/app/api/admin/movies/route.ts
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";

export const runtime = "nodejs";

// ✅ Validatsiya sxemasi (stringdan coercion bilan)
const MovieSchema = z.object({
  title: z.string().min(1),
  year: z.coerce.number().int().min(1900).max(new Date().getFullYear() + 1).optional(),
  posterUrl: z.string().url().optional(),
  genres: z.string().optional(), // vergul bilan string
  description: z.string().optional(),
  cast: z.string().optional(),
  hls: z.string().optional(),
  sources: z.array(z.object({ type: z.string(), url: z.string().url() })).optional(),
  isPublished: z.boolean().optional().default(true),
});

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\u0400-\u04FF\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function json(data: any, status = 200) {
  const res = NextResponse.json(data, { status });
  res.headers.set("Cache-Control", "no-store");
  return res;
}

/**
 * ✅ Secret orqali oddiy admin himoya (Bearer token shart emas)
 */
function checkSecret(req: NextRequest) {
  const clientSecret = req.headers.get("x-admin-secret") || "";
  const serverSecret = process.env.NEXT_PUBLIC_ADMIN_SECRET || "";
  if (!serverSecret || clientSecret !== serverSecret) {
    throw Object.assign(new Error("UNAUTHORIZED"), { code: 401 });
  }
}

/* -------------------------------------------------------------------------- */
/* 🟢 CREATE (POST) */
/* -------------------------------------------------------------------------- */
export async function POST(req: NextRequest) {
  try {
    checkSecret(req);
    const body = await req.json();
    const parsed = MovieSchema.parse(body);

    const slug = slugify(parsed.title + (parsed.year ? `-${parsed.year}` : ""));
    const ref = adminDb.collection("movies").doc(slug);

    const exists = (await ref.get()).exists;
    if (exists) return json({ ok: false, code: "SLUG_EXISTS" }, 409);

    const genres = parsed.genres
      ? parsed.genres.split(",").map((g) => g.trim()).filter(Boolean)
      : [];
    const cast = parsed.cast
      ? parsed.cast.split(",").map((c) => c.trim()).filter(Boolean)
      : [];

    const doc = {
      title: parsed.title,
      titleLower: parsed.title.toLowerCase(),
      year: parsed.year ?? null,
      description: parsed.description ?? "",
      posterUrl: parsed.posterUrl ?? "",
      genres,
      cast,
      hls: parsed.hls ?? "",
      isPublished: parsed.isPublished ?? true,
      sources: parsed.sources ?? [],
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    await ref.set(doc);
    return json({ ok: true, slug }, 201);
  } catch (e: any) {
    console.error("POST /api/admin/movies error:", e);
    const code = e?.code || (e instanceof z.ZodError ? 400 : 500);
    const msg =
      e instanceof z.ZodError
        ? { code: "VALIDATION_ERROR", issues: e.issues }
        : { code: e.message || "UNKNOWN" };
    return json({ ok: false, ...msg }, code);
  }
}

/* -------------------------------------------------------------------------- */
/* 🟡 UPDATE (PUT) */
/* -------------------------------------------------------------------------- */
export async function PUT(req: NextRequest) {
  try {
    checkSecret(req);
    const body = await req.json();
    const slug = slugify(String(body.slug || ""));
    if (!slug) return json({ ok: false, code: "slug_required" }, 400);

    const patch: Record<string, any> = { updatedAt: FieldValue.serverTimestamp() };
    if (body.title) {
      patch.title = body.title;
      patch.titleLower = body.title.toLowerCase();
    }
    if (body.description) patch.description = body.description;
    if (body.posterUrl) patch.posterUrl = body.posterUrl;
    if (body.genres)
      patch.genres = body.genres.split(",").map((s: string) => s.trim());
    if (body.cast)
      patch.cast = body.cast.split(",").map((s: string) => s.trim());
    if (body.hls) patch.hls = body.hls;
    if (typeof body.isPublished === "boolean") patch.isPublished = body.isPublished;

    await adminDb.collection("movies").doc(slug).set(patch, { merge: true });
    return json({ ok: true });
  } catch (e: any) {
    console.error("PUT /api/admin/movies error:", e);
    return json({ ok: false, code: e.message || "UNKNOWN" }, e?.code || 500);
  }
}

/* -------------------------------------------------------------------------- */
/* 🔴 DELETE */
/* -------------------------------------------------------------------------- */
export async function DELETE(req: NextRequest) {
  try {
    checkSecret(req);
    const body = await req.json();
    const slug = slugify(String(body.slug || ""));
    if (!slug) return json({ ok: false, code: "slug_required" }, 400);

    await adminDb.collection("movies").doc(slug).delete();
    return json({ ok: true });
  } catch (e: any) {
    console.error("DELETE /api/admin/movies error:", e);
    return json({ ok: false, code: e.message || "UNKNOWN" }, e?.code || 500);
  }
}
