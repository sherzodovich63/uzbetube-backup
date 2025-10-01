import { NextResponse } from "next/server";
import { logRequest } from "@/lib/log";

export async function GET(req: Request) {
  const t0 = Date.now();
  // bu yerda backend ishlarini qilasan
  const res = NextResponse.json({ ok: true }, { status: 200 });

  logRequest(new URL(req.url).pathname, res.status, t0);
  return res;
}
