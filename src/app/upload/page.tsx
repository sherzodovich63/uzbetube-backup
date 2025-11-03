"use client";
import { useState } from "react";
import { uploadToR2 } from "@/lib/cloudflare";
import { addVideoData } from "@/lib/firestore";
import { getAuth } from "firebase/auth";

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [uploading, setUploading] = useState(false);

  const handleUpload = async () => {
    if (!file) return alert("Fayl tanlang!");
    setUploading(true);
    try {
      const user = getAuth().currentUser;
      if (!user) return alert("Avval login qiling!");

      // Cloudflare R2 ga yuklash
      const videoUrl = await uploadToR2(file, `videos/${Date.now()}_${file.name}`);

      // Hozircha faqat 1 sifatli HLS (keyinchalik 360p-1080p qo‘shamiz)
      const hlsUrls = { 720: videoUrl };

      // Firestore ga metadata yozish
      await addVideoData({
        title,
        desc,
        ownerId: user.uid,
        hlsUrls,
      });

      alert("Video yuklandi ✅");
      setTitle("");
      setDesc("");
      setFile(null);
    } catch (err) {
      console.error(err);
      alert("Xatolik!");
    }
    setUploading(false);
  };

  return (
    <div className="flex flex-col items-center p-8">
      <h1 className="text-2xl font-bold mb-4">Video yuklash</h1>
      <input
        type="text"
        placeholder="Sarlavha"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="border rounded p-2 mb-2 w-80"
      />
      <textarea
        placeholder="Tavsif"
        value={desc}
        onChange={(e) => setDesc(e.target.value)}
        className="border rounded p-2 mb-2 w-80"
      />
      <input
        type="file"
        accept="video/*"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
      />
      <button
        onClick={handleUpload}
        disabled={uploading}
        className="bg-red-500 text-white px-4 py-2 mt-4 rounded"
      >
        {uploading ? "Yuklanmoqda..." : "Yuklash"}
      </button>
    </div>
  );
}
