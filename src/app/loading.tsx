export default function Loading() {
  return (
    <div className="max-w-[1400px] mx-auto px-4 py-6">
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="rounded-2xl overflow-hidden ring-1 ring-[#1f1f22]">
            <div className="aspect-video bg-[#151519] animate-pulse" />
            <div className="p-3 space-y-2">
              <div className="h-4 bg-[#151519] rounded animate-pulse" />
              <div className="h-3 w-1/2 bg-[#151519] rounded animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
