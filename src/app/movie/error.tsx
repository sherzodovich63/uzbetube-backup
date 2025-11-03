"use client";
export default function Error({ error, reset }: { error: any; reset: () => void }) {
  console.error(error);
  return (
    <div className="max-w-[900px] mx-auto px-4 py-16 text-center">
      <div className="text-xl font-semibold">Xatolik yuz berdi</div>
      <div className="text-white/60 mt-2">Qayta urining yoki bosh sahifaga qayting.</div>
      <button onClick={reset} className="mt-6 px-4 py-2 rounded-xl bg-[#e11d48] hover:bg-[#cc0f3e]">
        Qayta urinish
      </button>
    </div>
  );
}
