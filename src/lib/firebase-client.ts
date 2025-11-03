// src/lib/firebase-client.ts
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const config = {
  apiKey:        process.env.NEXT_PUBLIC_FB_API_KEY,
  authDomain:    process.env.NEXT_PUBLIC_FB_AUTH_DOMAIN,
  projectId:     process.env.NEXT_PUBLIC_FB_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FB_STORAGE_BUCKET,
  appId:         process.env.NEXT_PUBLIC_FB_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FB_MEASUREMENT_ID,
};

// Bitta marta init qilamiz (SSR/CSRda xavfsiz)
export const app: FirebaseApp = getApps().length ? getApp() : initializeApp(config);

// 🔽 Mavjud eksportlar (o‘zgarmadi)
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// 🔽 Google login provider
export const googleProvider = new GoogleAuthProvider();

// ------------------------------------------------------
// ✅ Moslik uchun: ba’zi joylarda `initClient()` kutilishi mumkin.
// Hech narsa buzmaydi; shunchaki `app`ni qaytaramiz.
// ------------------------------------------------------
export function initClient(): FirebaseApp {
  return app;
}

// (ixtiyoriy) Devda config yo‘q bo‘lsa console.warn chiqarsin
if (process.env.NODE_ENV !== "production") {
  const missing = Object.entries(config)
    .filter(([, v]) => !v)
    .map(([k]) => k);
  if (missing.length) {
    // Bu faqat ogohlantirish – ishga xalaqit bermaydi
    // console.warn("[firebase-client] Missing env:", missing.join(", "));
  }
}
