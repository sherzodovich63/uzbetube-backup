'use client'
import { useEffect, useRef } from 'react'
import Hls from 'hls.js'

export default function VideoPlayer({ src }: { src: string }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  useEffect(() => {
    const video = videoRef.current!
    if (Hls.isSupported()) {
      const hls = new Hls()
      hls.loadSource(src)
      hls.attachMedia(video)
      return () => hls.destroy()
    } else {
      video.src = src // Safari uchun
    }
  }, [src])
  return <video ref={videoRef} controls className="w-full rounded-2xl shadow" />
}
