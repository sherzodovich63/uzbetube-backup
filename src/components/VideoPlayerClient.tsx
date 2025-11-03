// src/components/VideoPlayerClient.tsx
"use client";

import VideoPlayer from "@/components/VideoPlayer";

type Props = {
  src: string;
  poster?: string;
  trackId?: string; // views ++ uchun video id
};

export default function VideoPlayerClient({ src, poster, trackId }: Props) {
  return (
    <VideoPlayer
      src={src}
      poster={poster}
      onFirstPlay={async () => {
        if (!trackId) return;
        try {
          await fetch(`/api/videos/${trackId}/views`, { method: "POST" });
        } catch {
          // jim o'tamiz
        }
      }}
    />
  );
}
