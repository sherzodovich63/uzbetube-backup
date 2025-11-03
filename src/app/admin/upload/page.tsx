// src/app/admin/upload/page.tsx
'use client'

import { useState } from 'react'
import { getSignedUrl, putToR2 } from '@/lib/r2-upload'

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-')

export default function UploadPage() {
  const [secret, setSecret] = useState('')            // ← admin parol (foydalanuvchi kiritadi)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    title: '',
    year: '',
    description: '',
    posterUrl: '',
    genres: '',
    cast: '',
    hls: '',
    published: true,
  })

  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [videoUrl, setVideoUrl] = useState<string>('') // R2 yuklangandan keyin public URL
  const [uploading, setUploading] = useState(false)
  const [uploadMsg, setUploadMsg] = useState('')

  const allow = process.env.NEXT_PUBLIC_ADMIN_SECRET

  // === ADMIN PAROL TEKSHIRISH (parolni sahifada kiritasan) ===
  if (allow && secret !== allow) {
    return (
      <main className="max-w-md mx-auto p-6">
        <h1 className="text-2xl font-bold mb-3">Admin – kirish</h1>
        <input
          type="password"
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
          placeholder="Parol"
          className="w-full border rounded-xl p-3"
        />
        <p className="text-sm opacity-70 mt-2">
          .env.local → <code>NEXT_PUBLIC_ADMIN_SECRET</code> qiymatini kiriting
        </p>
      </main>
    )
  }

  // === VIDEO YUKLASH (Cloudflare R2, pre-signed URL) ===
  async function handleVideoUpload() {
    if (!videoFile) return alert('Video fayl tanlang')
    setUploading(true)
    setUploadMsg('Yuklanmoqda...')

    try {
      const baseName =
        form.title ? slugify(form.title).slice(0, 60) : slugify(videoFile.name.replace(/\.[^.]+$/, ''))
      const ext = videoFile.name.split('.').pop() || 'mp4'
      const key = `videos/${Date.now()}_${baseName}.${ext}`

      const { putUrl, publicUrl } = await getSignedUrl(key, videoFile.type)
      await putToR2(putUrl, videoFile)

      setVideoUrl(publicUrl)

      // Agar .m3u8 bo'lsa, HLS maydonini auto to'ldiramiz
      if (publicUrl.endsWith('.m3u8') && !form.hls) {
        setForm((p) => ({ ...p, hls: publicUrl }))
      }

      setUploadMsg('Yuklandi ✅')
    } catch (e: any) {
      console.error(e)
      setUploadMsg('Xato: ' + (e.message || 'upload_failed'))
    } finally {
      setUploading(false)
    }
  }

  // === SAQLASH (server API orqali, Admin SDK yozadi) ===
  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const sources: Array<{ type: string; url: string }> = []
      if (form.hls) sources.push({ type: 'hls', url: form.hls })
      if (videoUrl) sources.push({ type: 'file', url: videoUrl })

      const res = await fetch('/api/admin/movies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-secret': secret, 
        },
        body: JSON.stringify({
          title: form.title,
          year: form.year,
          description: form.description,
          posterUrl: form.posterUrl,
          genres: form.genres, // "Pop, Music" ko'rinishida yuboriladi; serverda massivga ajratiladi
          cast: form.cast,
          sources,
          isPublished: form.published,
        }),
      })

      const data = await res.json()
      if (!res.ok || !data?.ok) throw new Error(data?.code || data?.error || 'save_failed')

      alert('Saqlandi: ' + data.slug)

      // Forma reset
      setForm({
        title: '',
        year: '',
        description: '',
        posterUrl: '',
        genres: '',
        cast: '',
        hls: '',
        published: true,
      })
      setVideoFile(null)
      setVideoUrl('')
      setUploadMsg('')
    } catch (e: any) {
      alert(e.message || 'Xatolik')
    } finally {
      setSaving(false)
    }
  }

  const set = (k: keyof typeof form) => (e: any) => setForm((p) => ({ ...p, [k]: e.target.value }))

  // === UI ===
  return (
    <main className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Yangi film qo‘shish</h1>

      <form onSubmit={submit} className="grid gap-4">
        <input className="border rounded-xl p-3" placeholder="Title *" value={form.title} onChange={set('title')} />
        <input className="border rounded-xl p-3" placeholder="Year (2011)" value={form.year} onChange={set('year')} />
        <input className="border rounded-xl p-3" placeholder="Poster URL" value={form.posterUrl} onChange={set('posterUrl')} />
        <input className="border rounded-xl p-3" placeholder="Genres (vergul bilan)" value={form.genres} onChange={set('genres')} />
        <input className="border rounded-xl p-3" placeholder="Cast (vergul bilan)" value={form.cast} onChange={set('cast')} />
        <textarea className="border rounded-xl p-3" placeholder="Description" value={form.description} onChange={set('description')} />

        {/* ixtiyoriy HLS URL (agar m3u8 tayyor bo'lsa) */}
        <input className="border rounded-xl p-3" placeholder="HLS URL (m3u8)" value={form.hls} onChange={set('hls')} />

        {/* Video upload (R2) */}
        <div className="rounded-xl p-4 border border-zinc-700/50">
          <label className="block mb-2 font-medium">Video fayl yuklash</label>
          <div className="flex items-center gap-3">
            <input type="file" accept="video/*" onChange={(e) => setVideoFile(e.target.files?.[0] || null)} />
            <button
              type="button"
              onClick={handleVideoUpload}
              disabled={!videoFile || uploading}
              className="px-4 h-10 rounded-xl bg-white text-black disabled:opacity-60"
            >
              {uploading ? 'Yuklanmoqda...' : 'Videoni yuklash'}
            </button>
          </div>
          <div className="text-sm opacity-70 mt-2">{uploadMsg}</div>

          {videoUrl && (
            <div className="mt-3">
              <div className="text-xs opacity-70">Yuklangan URL:</div>
              <code className="text-xs break-all">{videoUrl}</code>
              <video src={videoUrl} controls className="w-full mt-2 rounded-lg" />
            </div>
          )}
        </div>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={form.published}
            onChange={(e) => setForm((p) => ({ ...p, published: e.target.checked }))}
          />
          <span>Published</span>
        </label>

        <button disabled={saving} className="h-11 rounded-xl bg-black text-white font-medium disabled:opacity-60">
          {saving ? 'Saqlanmoqda...' : 'Saqlash'}
        </button>
      </form>
    </main>
  )
}
