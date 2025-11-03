"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Search, Menu, Upload } from "lucide-react";
import { useMemo } from "react";

import UserAvatar from "@/components/UserAvatar";
import { useUi } from "@/components/ui/UiContext";
import ThemeToggle from "@/components/ThemeToggle";
import LanguageSwitcher from "@/components/LanguageSwitcher";

// ✨ i18n
import { useTranslations } from "next-intl";

type Initial = { q?: string; year?: string; genre?: string };
type HeaderProps = { initial?: Initial };

export default function Header({ initial }: HeaderProps) {
  const tCat = useTranslations("categories");
  const tSearch = useTranslations("search");
  const tAuth = useTranslations("auth");
  const tAria = useTranslations("aria");

  const sp = useSearchParams();
  const { toggleSidebar } = useUi();

  const defaults = useMemo<Initial>(
    () => ({
      q: sp.get("q") ?? initial?.q ?? "",
      year: sp.get("year") ?? initial?.year ?? "",
      genre: sp.get("genre") ?? initial?.genre ?? "",
    }),
    [sp, initial]
  );

  // 🏷️ Chiplar uchun barqaror ID + tarjima
  const tabs: { id: "home" | "film" | "serial" | "sport" | "music" | "podcast"; genre?: string }[] =
    useMemo(
      () => [
        { id: "home" },
        { id: "film", genre: "film" },
        { id: "serial", genre: "serial" },
        { id: "sport", genre: "sport" },
        { id: "music", genre: "musiqa" },
        { id: "podcast", genre: "podkast" },
      ],
      []
    );

  function hrefFor(genre?: string) {
    const p = new URLSearchParams(sp.toString());
    if (genre) p.set("genre", genre);
    else p.delete("genre");
    return "/?" + p.toString();
  }

  const isActive = (genre?: string) => (sp.get("genre") ?? "") === (genre ?? "");

  return (
    <header className="sticky top-0 z-50 bg-[color:var(--surface)]/90 backdrop-blur border-b border-[var(--ring)]">
      {/* Top bar */}
      <div className="max-w-[1400px] mx-auto px-4 py-2.5 flex items-center gap-3">
        {/* Menu (sidebar toggle) — faqat mobil */}
        <button
          onClick={toggleSidebar}
          className="lg:hidden h-9 w-9 rounded-xl grid place-items-center hover:bg-[color:var(--muted)]"
          aria-label={tAria("open_menu")}
          title={tAria("open_menu")}
          type="button"
        >
          <Menu className="w-5 h-5 text-[color:var(--text)]/80" />
        </button>

        {/* Logo */}
        <Link href="/" aria-label={tAria("logo")} className="flex items-center">
          <span className="text-lg font-extrabold tracking-tight text-[color:var(--text)]">
            Uzbe<span className="text-[var(--accent)]">Tube</span>
          </span>
        </Link>

        {/* Search (GET) */}
        <form className="flex-1 flex justify-center" action="/" method="GET">
          <div className="relative w-full max-w-[720px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[color:var(--subtle)]" />
            <input
              type="search"
              name="q"
              defaultValue={defaults.q}
              placeholder={tSearch("placeholder")}
              className="w-full h-10 pl-9 pr-3 rounded-xl bg-[color:var(--muted)] text-sm
                         text-[color:var(--text)] placeholder:text-[color:var(--subtle)]
                         border-0 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            />
            {defaults.year ? <input type="hidden" name="year" defaultValue={defaults.year} /> : null}
            {defaults.genre ? <input type="hidden" name="genre" defaultValue={defaults.genre} /> : null}
          </div>
        </form>

        {/* Actions (o‘ng) */}
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <LanguageSwitcher />

          {/* Upload */}
          <Link
            href="/upload"
            aria-label={tAria("upload")}
            title={tAria("upload")}
            className="inline-flex h-9 px-3 items-center justify-center rounded-xl
                       bg-[color:var(--muted)] text-[color:var(--text)]/80 text-sm
                       hover:bg-[color:var(--muted)]/80 leading-none"
          >
            <Upload className="w-4 h-4" />
          </Link>

          {/* Kirish */}
          <Link
            href="/login"
            className="inline-flex h-9 px-4 items-center justify-center rounded-xl
                       bg-[var(--accent)] text-white text-sm font-medium leading-none
                       hover:brightness-95 transition"
          >
            {tAuth("login")}
          </Link>

          {/* Foydalanuvchi avatari */}
          <UserAvatar />
        </div>
      </div>

      {/* Tabs / category chips */}
      <div className="max-w-[1400px] mx-auto px-4 pb-2 overflow-x-auto no-scrollbar">
        <nav className="flex gap-2">
          {tabs.map((tab) => {
            const active = isActive(tab.genre);
            const label =
              tab.id === "home"
                ? tCat("home")
                : tCat(
                    tab.id === "film"
                      ? "films"
                      : tab.id === "serial"
                      ? "series"
                      : tab.id // sport/music/podcast kalitlari bir xil
                  );

            return (
              <Link
                key={tab.id}
                href={hrefFor(tab.genre)}
                aria-current={active ? "page" : undefined}
                className={[
                  "px-3 py-1.5 rounded-full text-sm whitespace-nowrap",
                  active
                    ? "bg-[var(--accent)] text-white"
                    : "border border-[var(--ring)] hover:bg-[color:var(--muted)] text-[color:var(--text)]/80",
                ].join(" ")}
              >
                {label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
