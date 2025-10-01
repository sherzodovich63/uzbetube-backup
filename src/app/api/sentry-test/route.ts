import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    throw new Error("Sentry test error – UZBETUBE");
  } catch (e) {
    Sentry.captureException(e);
    return NextResponse.json({ sentry: "captured" }, { status: 500 });
  }
}
