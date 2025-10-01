import { NextRequest, NextResponse } from "next/server";
import Busboy from "busboy";
import { initAdmin } from "@/lib/firebase-admin"; // sendagi initAdmin
import { getStorage } from "firebase-admin/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    initAdmin();
    const bucket = getStorage().bucket();

    const contentType = req.headers.get("content-type") || "";
    if (!contentType.startsWith("multipart/form-data")) {
      return NextResponse.json({ ok: false, error: "multipart_required" }, { status: 400 });
    }

    const bb = Busboy({ headers: { "content-type": contentType } });

    let uploadPromise: Promise<string> | null = null;

    const stream = req.body as unknown as NodeJS.ReadableStream;
    stream.pipe(bb);

    bb.on("file", (_name, file, info) => {
      const { filename, mimeType } = info;
      const destPath = `videos/${Date.now()}-${filename}`;

      const cloudStream = bucket.file(destPath).createWriteStream({
        contentType: mimeType,
        resumable: false,
        public: true,
        metadata: { contentType: mimeType, cacheControl: "public, max-age=31536000" },
      });

      uploadPromise = new Promise((resolve, reject) => {
        file.on("error", reject);
        cloudStream.on("error", reject);
        cloudStream.on("finish", async () => {
          // public URL
          const publicUrl = `https://storage.googleapis.com/${bucket.name}/${destPath}`;
          resolve(publicUrl);
        });
        file.pipe(cloudStream);
      });
    });

    await new Promise<void>((resolve, reject) => {
      bb.on("error", reject);
      bb.on("finish", () => resolve());
    });

    const url = await uploadPromise;
    if (!url) return NextResponse.json({ ok: false, error: "no_file" }, { status: 400 });

    return NextResponse.json({ ok: true, url });
  } catch (e: any) {
    console.error("upload error:", e);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
