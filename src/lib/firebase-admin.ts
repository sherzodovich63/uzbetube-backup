  // src/lib/firebase-admin.ts
  import {
    getApps,
    getApp,
    initializeApp,
    cert,
    type App,
    type ServiceAccount,
  } from "firebase-admin/app";
  import { getAuth } from "firebase-admin/auth";
  import { getFirestore } from "firebase-admin/firestore";

  /**
   * Admin SDK bitta processda faqat bir marta init bo‘lishi kerak.
   * getApps() bilan bor bo‘lsa olamiz, bo‘lmasa initialize qilamiz.
   */
  let _app: App | null = null;

  function ensureAdmin(): App {
    if (_app) return _app;

    const existing = getApps();
    if (existing.length) {
      _app = getApp();
      return _app;
    }

    // 1) JSON ko‘rinishidagi service accountni o‘qiymiz
    const raw =
      process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON ||
      process.env.FIREBASE_SERVICE_ACCOUNT;

    let serviceAccount: ServiceAccount | null = null;

    if (raw) {
      // JSON ni xavfsiz parse qilamiz
      const parsed = JSON.parse(raw) as Partial<ServiceAccount> & {
        project_id?: string;
        client_email?: string;
        private_key?: string;
      };

      serviceAccount = {
        projectId: parsed.projectId || parsed.project_id!,
        clientEmail: parsed.clientEmail || parsed.client_email!,
        privateKey: (parsed.privateKey || parsed.private_key || "").replace(/\\n/g, "\n"),
      };
    } else {
      // 2) Fallback: uchta alohida ENV dan yig‘ish
      const projectId = process.env.FIREBASE_PROJECT_ID;
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
      // Private key ko‘pincha \n bilan keladi — almashtiramiz
      const privateKey = (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n");

      if (projectId && clientEmail && privateKey) {
        serviceAccount = { projectId, clientEmail, privateKey };
      }
    }

    if (!serviceAccount?.projectId || !serviceAccount?.clientEmail || !serviceAccount?.privateKey) {
      throw new Error(
        "MISSING_ADMIN_CREDS: .env da GOOGLE_APPLICATION_CREDENTIALS_JSON / FIREBASE_SERVICE_ACCOUNT yoki " +
        "FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY ko‘rsatilmagan."
      );
    }

    _app = initializeApp({ credential: cert(serviceAccount) });
    return _app;
  }

  /** 🔒 Admin SDK instancelari */
  export const adminAuth = getAuth(ensureAdmin());

  // ❗️IMPORTANT: `.settings()` NI CHAQIRMAYMIZ — hot-reloadda xato beradi
  const _db = getFirestore(ensureAdmin());

  export const adminDb = _db;
  /** Back-compat alias (agar boshqa joyda shunday nom ishlatilgan bo‘lsa) */
  export const adminDB = _db;

  /** (ixtiyoriy) Qo‘lda chaqirish uchun */
  export function initAdmin(): App {
    return ensureAdmin();
  }
