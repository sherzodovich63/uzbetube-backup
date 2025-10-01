// src/lib/firebase-admin.ts
import { getApps, initializeApp, cert, type App, type ServiceAccount } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

let app: App | null = null;

/** Firebase Admin init — bir marta initialize qiladi */
export function initAdmin(): App {
  if (app) return app;

  // .env.local ichidagi JSON (bitta qatorda) — \n larni real newline ga almashtiramiz
  const raw = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
  if (!raw) {
    throw new Error("MISSING_ADMIN_CREDS");
  }

  const parsed = JSON.parse(raw) as ServiceAccount;

  // Ba'zi exportlarda private_key ichida `\\n` bo‘ladi — xavfsiz tomoni uchun almashtirib qo‘yamiz
  if (parsed.private_key?.includes("\\n")) {
    parsed.private_key = parsed.private_key.replace(/\\n/g, "\n");
  }

  app = initializeApp({ credential: cert(parsed) });
  return app;
}

/** Kerak bo‘lsa admin auth’ni qaytaruvchi helper */
export function adminAuth() {
  initAdmin();
  return getAuth();
}

