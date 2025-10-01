export default function RootLoading() {
  return (
    <div className="p-6 grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4">
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className="h-64 rounded-2xl bg-zinc-900 animate-pulse" />
      ))}
    </div>
  );
}
