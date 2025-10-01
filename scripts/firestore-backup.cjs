// scripts/firestore-backup.cjs
require("dotenv").config({ path: ".env.local" });

const admin = require("firebase-admin");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { gzipSync } = require("node:zlib");
const pathPrefix = process.env.BACKUP_PREFIX || "backups/firestore"; // ixtiyoriy

function initAdminFromEnv() {
  if (admin.apps.length) return;
  const raw = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
  if (!raw) throw new Error("GOOGLE_APPLICATION_CREDENTIALS_JSON is missing in .env(.local)");
  const creds = JSON.parse(raw);
  if (creds.private_key) creds.private_key = creds.private_key.replace(/\\n/g, "\n");
  admin.initializeApp({ credential: admin.credential.cert(creds) });
}

async function listAllCollections(db) {
  // Agar muayyan kolleksiyalarni xohlasang, ENV orqali ber: BACKUP_COLLECTIONS=movies,users,comments
  const envList = (process.env.BACKUP_COLLECTIONS || "").split(",").map(s => s.trim()).filter(Boolean);
  if (envList.length) return envList;

  const top = await db.listCollections();   // top-level kolleksiyalar
  return top.map(c => c.id);
}

async function main() {
  console.log("🚀 Backup started…");
  initAdminFromEnv();
  const db = admin.firestore();

  const collections = await listAllCollections(db);
  if (!collections.length) {
    console.log("⚠️  Hech qanday kolleksiya topilmadi, bo'sh json saqlanadi.");
  } else {
    console.log("📚 Kolleksiyalar:", collections.join(", "));
  }

  // Hammasini o‘qib to‘plab chiqamiz
  const dump = {};
  for (const name of collections) {
    const snap = await db.collection(name).get();
    const arr = [];
    snap.forEach(doc => arr.push({ id: doc.id, ...doc.data() }));
    dump[name] = arr;
  }

  const json = JSON.stringify(dump, null, 2);
  const gz = gzipSync(Buffer.from(json));

  // Tartibli nom: backups/firestore/2025/10/01/firestore_2025-10-01T15-30-00Z.json.gz
  const now = new Date();
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(now.getUTCDate()).padStart(2, "0");
  const iso = now.toISOString().replace(/[:]/g, "-"); // Windows safe

  const key = `${pathPrefix}/${yyyy}/${mm}/${dd}/firestore_${iso}.json.gz`;

  const s3 = new S3Client({
    region: "auto",
    endpoint: process.env.R2_ENDPOINT,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY,
      secretAccessKey: process.env.R2_SECRET_KEY,
    },
  });

  await s3.send(new PutObjectCommand({
    Bucket: process.env.R2_BUCKET,
    Key: key,
    Body: gz,
    ContentType: "application/json",
    ContentEncoding: "gzip",
  }));

  console.log("🎉 Uploaded to R2:", key);
}

main().catch(e => {
  console.error("❌ Backup failed:", e);
  process.exit(1);
});
