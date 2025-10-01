'use client'
import { useState } from 'react'
import { db } from '@/lib/firebase-client'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-')

export default function UploadPage() {
  const [secret, setSecret] = useState('')
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

  // 🔹 Video upload uchun yangi state'lar
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [videoUrl, setVideoUrl] = useState<string>('') // serverdan qaytgan URL (public yoki signed)
  const [uploading, setUploading] = useState(false)
  const [uploadMsg, setUploadMsg] = useState('')

  const allow = process.env.NEXT_PUBLIC_ADMIN_SECRET

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

  // 🔹 Mavjud tahrirlash/o‘chirish bo‘limi
  const [editSlug, setEditSlug] = useState('')
  const updateTitle = async () => {
    await fetch('/api/admin/movies', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug: editSlug, title: form.title }),
    })
  }
  const remove = async () => {
    if (!confirm('O‘chiramizmi?')) return
    await fetch('/api/admin/movies', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug: editSlug }),
    })
  }

  // 🔹 Video yuklash handler
  async function handleVideoUpload() {
    if (!videoFile) return alert('Video fayl tanlang')
    setUploading(true)
    setUploadMsg('Yuklanmoqda...')

    try {
      const fd = new FormData()
      fd.append('file', videoFile)

      const res = await fetch('/api/admin/upload-video', {
        method: 'POST',
        body: fd,
      })
      const data = await res.json()
      if (!res.ok || !data?.ok) throw new Error(data?.error || 'upload_failed')

      setVideoUrl(data.url) // 🔸 public yoki signed URL
      setUploadMsg('Yuklandi ✅')
    } catch (e: any) {
      console.error(e)
      setUploadMsg('Xato: ' + (e.message || 'upload'))
    } finally {
      setUploading(false)
    }
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const slug = slugify(form.title) + (form.year ? '-' + form.year : '')
      const ref = doc(db, 'movies', slug)

      // 🔹 sources massiviga HLS bo‘lsa HLS’ni, video yuklangan bo‘lsa videoUrl’ni ham qo‘shamiz
      const sources: Array<{ type: string; url: string }> = []
      if (form.hls) sources.push({ type: 'hls', url: form.hls })
      if (videoUrl) sources.push({ type: 'file', url: videoUrl })

      await setDoc(ref, {
        title: form.title,
        year: form.year ? Number(form.year) : null,
        description: form.description,
        posterUrl: form.posterUrl,
        isPublished: form.published,
        genres: form.genres ? form.genres.split(',').map((s) => s.trim()) : [],
        cast: form.cast ? form.cast.split(',').map((s) => s.trim()) : [],
        sources, // ⬅️ shu yerda
        createdAt: serverTimestamp(),
      })

      alert('Saqlandi: ' + slug)
      setForm({ title: '', year: '', description: '', posterUrl: '', genres: '', cast: '', hls: '', published: true })
      setVideoFile(null)
      setVideoUrl('')
      setUploadMsg('')
    } catch (e: any) {
      alert(e.message || 'Xatolik')
    } finally {
      setSaving(false)
    }
  }

  // Form helper (sening uslubingni saqladik)
  const set = (k: keyof typeof form) => (e: any) => setForm((p) => ({ ...p, [k]: e.target.value }))

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

        {/* 🔹 HLS URL ixtiyoriy, keyin pipeline qo‘ysang ishlatamiz */}
        <input className="border rounded-xl p-3" placeholder="HLS URL (m3u8)" value={form.hls} onChange={set('hls')} />

        {/* 🔹 VIDEO UPLOAD BLOKI */}
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

        <button
          disabled={saving}
          className="h-11 rounded-xl bg-black text-white font-medium disabled:opacity-60"
        >
          {saving ? 'Saqlanmoqda...' : 'Saqlash'}
        </button>
      </form>

      {/* === Tahrirlash / O‘chirish bo‘limi === */}
      <div className="mt-8 p-4 rounded-xl bg-zinc-900">
        <h2 className="font-semibold mb-2">Tahrirlash / O‘chirish</h2>
        <input
          placeholder="slug"
          value={editSlug}
          onChange={(e) => setEditSlug(e.target.value)}
          className="w-full p-2 rounded bg-zinc-800 mb-2"
        />
        <div className="flex gap-2">
          <button onClick={updateTitle} className="px-3 py-2 rounded bg-white text-black">
            Sarlavhani yangilash
          </button>
          <button onClick={remove} className="px-3 py-2 rounded bg-red-600">
            O‘chirish
          </button>
        </div>
      </div>
    </main>
  )
}
