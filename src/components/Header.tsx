'use client'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { LogoutBtn } from "@/components/LogoutBtn";

export default function AppHeader() {
  const [q, setQ] = useState('')
  const router = useRouter()

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    router.push('/?q=' + encodeURIComponent(q))
  }

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search)
    setQ(sp.get('q') ?? '')
  }, [])

 const showUpload = process.env.NEXT_PUBLIC_SHOW_UPLOAD === 'true'

  return (
  <header className="sticky top-0 z-40 bg-black/70 backdrop-blur border-b border-white/10">
    <div className="max-w-6xl mx-auto flex items-center gap-4 p-3">

      {/* Logo */}
      <Link href="/" className="font-bold text-white flex items-center gap-2">
        <Image src="/logo.jpg" alt="UzbeTube" width={28} height={28} className="rounded" />
        <span className="hidden sm:inline">UzbeTube</span>
      </Link>

      {/* Qidiruv formasi (o‘ngga surish uchun ml-auto) */}
      <form onSubmit={onSubmit} className="ml-auto flex items-center gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Qidiruv..."
          className="rounded-xl bg-white/10 text-white px-3 py-2 outline-none"
        />
      </form>

      {/* (ixtiyoriy) Upload link — faqat showUpload true bo‘lsa */}
      {showUpload && (
        <nav>
          <Link href="/admin/upload" className="underline text-white">
            Upload
          </Link>
        </nav>
      )}

      {/* 🔑 Logout tugma — eng o‘ngda */}
      <LogoutBtn />
    </div>
  </header>
);

