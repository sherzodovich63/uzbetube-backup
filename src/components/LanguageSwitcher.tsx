'use client';

import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { locales, type Locale } from '@/i18n/config';

export default function LanguageSwitcher() {
  const router = useRouter();
  const current = useLocale();

  const onChange = (l: Locale) => {
    // cookie qo'yamiz (1 yil)
    document.cookie = `locale=${l}; Max-Age=${60 * 60 * 24 * 365}; Path=/`;
    router.refresh(); // server components qayta render bo‘ladi
  };

  return (
    <select
      value={current}
      onChange={(e) => onChange(e.target.value as Locale)}
      aria-label="Tilni tanlash"
      className="
        h-9 px-3 rounded-xl
        bg-[color:var(--surface)]         /* fon */
        text-[color:var(--text)]          /* matn rangi */
        ring-1 ring-[var(--ring)]         /* border */
        outline-none
        hover:bg-[color:var(--muted)]/70
        cursor-pointer
        transition-colors duration-150
        appearance-none                   /* default brauzer stili yo‘q */
      "
    >
      {locales.map((l) => (
        <option
          key={l}
          value={l}
          className="bg-[color:var(--surface)] text-[color:var(--text)]"
        >
          {l.toUpperCase()}
        </option>
      ))}
    </select>
  );
}
