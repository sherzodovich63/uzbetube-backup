import VideoPlayer from "@/components/VideoPlayer";

export default function TestVideoPage() {
  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-4">Test Video</h1>

      <VideoPlayer
        src="/hls/movie/master.m3u8"   // 👈 shu yo‘l — to‘g‘risi shu!
        poster="/poster.jpg"
        autoPlay={false}
        className="max-w-5xl mx-auto"
        forceHlsJsOnSafari={false}
      />
    </div>
  );
}
