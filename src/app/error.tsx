'use client';

export default function Error({ error, reset }: { error: any; reset: () => void }) {
  return (
    <main className="min-h-[60vh] grid place-items-center p-8 text-center">
      <div>
        <h1 className="text-2xl font-bold mb-2">Xatolik yuz berdi</h1>
        <p className="text-red-400">{String(error?.message ?? 'Noma’lum xato')}</p>
        <button onClick={() => reset()} className="mt-4 px-4 py-2 rounded bg-white text-black">
          Qayta urinish
        </button>
      </div>
    </main>
  );
}
