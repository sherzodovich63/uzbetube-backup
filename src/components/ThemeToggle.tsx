"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Sun, Moon, Monitor } from "lucide-react";

type Props = {
  size?: "sm" | "md"; // ixtiyoriy: UI moslashuvi
};

export default function ThemeToggle({ size = "md" }: Props) {
  const { theme, setTheme, systemTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  // resolvedTheme -> "light" | "dark" (system bo'lsa ham real aktivini beradi)
  const isLight = resolvedTheme === "light";
  const isDark = resolvedTheme === "dark";
  const isSystem = theme === "system"; // foydalanuvchi tanlovi (cookie/localStorage)

  const wrap = size === "sm" ? "h-8 p-0.5" : "h-9 p-1";
  const btn  = size === "sm" ? "h-7 w-7" : "h-8 w-8";
  const icon = size === "sm" ? "h-4 w-4" : "h-5 w-5";

  return (
    <div
      className={`inline-flex items-center rounded-xl bg-[color:var(--surface)]/80
                  ring-1 ring-[var(--ring)] backdrop-blur ${wrap}`}
      role="group"
      aria-label="Theme switcher"
    >
      {/* Light */}
      <button
        onClick={() => setTheme("light")}
        aria-pressed={isLight && !isSystem}
        title="Light mode"
        className={`${btn} grid place-items-center rounded-lg
                    transition-all duration-150 outline-none
                    ${isLight && !isSystem
                      ? "bg-[color:var(--muted)] text-[color:var(--text)] shadow-sm"
                      : "text-[color:var(--subtle)] hover:bg-[color:var(--muted)]/60"}
                    focus-visible:ring-2 focus-visible:ring-[var(--accent)]/60`}
        type="button"
      >
        <Sun className={`${icon} transition-transform ${isLight ? "rotate-0" : "-rotate-12"}`} />
      </button>

      {/* Divider */}
      <div className="mx-0.5 h-5 w-px bg-[color:var(--ring)]/70" aria-hidden />

      {/* System (tizimga moslash) */}
      <button
        onClick={() => setTheme("system")}
        aria-pressed={isSystem}
        title={`System (${systemTheme ?? "auto"})`}
        className={`${btn} grid place-items-center rounded-lg
                    transition-all duration-150 outline-none
                    ${isSystem
                      ? "bg-[color:var(--muted)] text-[color:var(--text)] shadow-sm"
                      : "text-[color:var(--subtle)] hover:bg-[color:var(--muted)]/60"}
                    focus-visible:ring-2 focus-visible:ring-[var(--accent)]/60`}
        type="button"
      >
        <Monitor className={`${icon}`} />
      </button>

      {/* Divider */}
      <div className="mx-0.5 h-5 w-px bg-[color:var(--ring)]/70" aria-hidden />

      {/* Dark */}
      <button
        onClick={() => setTheme("dark")}
        aria-pressed={isDark && !isSystem}
        title="Dark mode"
        className={`${btn} grid place-items-center rounded-lg
                    transition-all duration-150 outline-none
                    ${isDark && !isSystem
                      ? "bg-[color:var(--muted)] text-[color:var(--text)] shadow-sm"
                      : "text-[color:var(--subtle)] hover:bg-[color:var(--muted)]/60"}
                    focus-visible:ring-2 focus-visible:ring-[var(--accent)]/60`}
        type="button"
      >
        <Moon className={`${icon} transition-transform ${isDark ? "rotate-0" : "rotate-12"}`} />
      </button>
    </div>
  );
}
