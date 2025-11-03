"use client";

import {useTranslations} from "next-intl";

export default function EmptyState() {
  const t = useTranslations("empty");
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {/* icon joyingiz shu yerda bo‘lsin */}
      <h2 className="mt-4 text-xl font-semibold text-[color:var(--text)]">
        {t("title")}
      </h2>
      <p className="mt-2 text-[color:var(--subtle)]">
        {t("desc")}
      </p>
      <button className="mt-6 px-5 h-10 rounded-xl bg-[var(--accent)] text-white">
        {t("cta")}
      </button>
    </div>
  );
}
