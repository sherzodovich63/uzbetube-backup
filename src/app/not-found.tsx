export default function NotFound() {
  return (
    <main className="min-h-[60vh] grid place-items-center p-8 text-center">
      <div>
        <h1 className="text-3xl font-bold mb-2">404 — Sahifa topilmadi</h1>
        <p className="text-zinc-400">Manzilni tekshiring yoki bosh sahifaga qayting.</p>
        <a href="/" className="inline-block mt-4 px-4 py-2 rounded bg-white text-black">
          Bosh sahifa
        </a>
      </div>
    </main>
  );
}
