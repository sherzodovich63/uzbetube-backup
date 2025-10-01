// src/app/api/admin/movies/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getFirestore, serverTimestamp } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import "@/lib/firebase-admin"; // init once
import { z } from "zod";

const MovieSchema = z.object({
  title: z.string().min(1),
  year: z.number().int().min(1900).max(new Date().getFullYear() + 1),
  poster: z.string().url(),
  genres: z.array(z.string()).min(1),
  description: z.string().min(1),
  cast: z.array(z.string()).optional().default([]),
  hls: z.string().url(),
  published: z.boolean().optional().default(false),
  slug: z.string().optional(), // optional; auto-generate if empty
});

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\u0400-\u04FF\s-]/g, "") // lotin/kirilni ruxsat qilamiz
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

async function requireAdmin(req: NextRequest) {
  // ID token: (1) Authorization: Bearer <token> yoki (2) cookie "idToken"
  const hdr = req.headers.get("authorization") || "";
  const bearer = hdr.startsWith("Bearer ") ? hdr.slice(7) : null;
  const token = bearer ?? req.cookies.get("idToken")?.value;
  if (!token) throw new Error("UNAUTHENTICATED");

  const decoded = await getAuth().verifyIdToken(token);
  if (!decoded.admin) throw new Error("FORBIDDEN");
  return decoded;
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin(req);
    const body = await req.json();
    const parsed = MovieSchema.parse(body);

    const db = getFirestore();
    const doc = {
      ...parsed,
      slug: parsed.slug && parsed.slug.length ? slugify(parsed.slug) : slugify(parsed.title),
      titleLower: parsed.title.toLowerCase(),
      isPublished: parsed.published ?? false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await db.collection("movies").doc(doc.slug).set(doc, { merge: false });
    return NextResponse.json({ ok: true, slug: doc.slug }, { status: 201 });
  } catch (e: any) {
    const msg = e?.message || "Bad Request";
    const code =
      msg === "UNAUTHENTICATED" ? 401 :
      msg === "FORBIDDEN" ? 403 :
      e instanceof z.ZodError ? 400 : 500;
    return NextResponse.json({ ok: false, error: msg }, { status: code });
  }
}

export async function PUT(req: NextRequest) {
  try {
    await requireAdmin(req);
    const body = await req.json();
    const slug = slugify(String(body.slug || ""));
    if (!slug) throw new Error("slug_required");

    const patch = {} as any;
    if (body.title) {
      patch.title = String(body.title);
      patch.titleLower = String(body.title).toLowerCase();
    }
    if (typeof body.published === "boolean") patch.isPublished = body.published;
    if (body.poster) patch.poster = String(body.poster);
    if (Array.isArray(body.genres)) patch.genres = body.genres;
    if (body.description) patch.description = String(body.description);
    if (Array.isArray(body.cast)) patch.cast = body.cast;
    if (body.hls) patch.hls = String(body.hls);

    patch.updatedAt = serverTimestamp();

    const db = getFirestore();
    await db.collection("movies").doc(slug).set(patch, { merge: true });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    const msg = e?.message || "Bad Request";
    const code =
      msg === "UNAUTHENTICATED" ? 401 :
      msg === "FORBIDDEN" ? 403 :
      msg === "slug_required" ? 400 : 500;
    return NextResponse.json({ ok: false, error: msg }, { status: code });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await requireAdmin(req);
    const body = await req.json();
    const slug = slugify(String(body.slug || ""));
    if (!slug) throw new Error("slug_required");

    const db = getFirestore();
    await db.collection("movies").doc(slug).delete();
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    const msg = e?.message || "Bad Request";
    const code =
      msg === "UNAUTHENTICATED" ? 401 :
      msg === "FORBIDDEN" ? 403 :
      msg === "slug_required" ? 400 : 500;
    return NextResponse.json({ ok: false, error: msg }, { status: code });
  }
}
