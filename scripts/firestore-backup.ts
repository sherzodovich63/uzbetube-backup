import 'dotenv/config';
import { getFirestore } from 'firebase-admin/firestore';
import { initAdmin } from '../src/lib/firebase-admin';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

initAdmin();

async function backup() {
  console.log("🚀 Backup jarayoni boshlandi...");

  const db = getFirestore();

  // R2 bilan ulanish
  const client = new S3Client({
    region: 'auto',
    endpoint: process.env.R2_ENDPOINT,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY as string,
      secretAccessKey: process.env.R2_SECRET_KEY as string,
    },
  });

  console.log("✅ R2 client tayyor.");

  try {
    // Test uchun "movies" kolleksiyasi
    const snapshot = await db.collection('movies').get();
    console.log(`📦 ${snapshot.size} ta document topildi.`);

    const data: any[] = [];
    snapshot.forEach((doc) => data.push({ id: doc.id, ...doc.data() }));

    const json = JSON.stringify(data, null, 2);
    const date = new Date().toISOString().slice(0, 10);

    await client.send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET as string,
        Key: `firestore_backup_${date}.json`,
        Body: json,
        ContentType: 'application/json',
      })
    );

    console.log("🎉 Backup R2 bucketga yuklandi:", `firestore_backup_${date}.json`);
  } catch (e) {
    console.error("❌ Xatolik:", e);
  }
}

backup();
