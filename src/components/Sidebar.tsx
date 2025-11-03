"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Home, Film, Tv, Music, Mic2, Trophy, X } from "lucide-react";
import { useUi } from "@/components/ui/UiContext";

// i18n
import { useTranslations } from "next-intl";

type IconType = React.ComponentType<{ className?: string }>;

const items: { id: "home" | "film" | "serial" | "sport" | "music" | "podcast"; href: string; icon: IconType }[] = [
  { id: "home",   href: "/",             icon: Home  },
  { id: "film",   href: "/?genre=film",  icon: Film  },
  { id: "serial", href: "/?genre=serial",icon: Tv    },
  { id: "sport",  href: "/?genre=sport", icon: Trophy},
  { id: "music",  href: "/?genre=musiqa",icon: Music },
  { id: "podcast",href: "/?genre=podkast",icon: Mic2 },
];

function isActiveHref(href: string, pathname: string, sp: URLSearchParams) {
  if (href === "/") {
    return pathname === "/" && (sp.get("genre") ?? "") === "";
  }
  const g = new URLSearchParams(href.split("?")[1] || "").get("genre");
  return pathname === "/" && (sp.get("genre") ?? "") === (g ?? "");
}

function Item({
  href,
  Icon,
  label,
  active,
  onClick,
}: {
  href: string;
  Icon: IconType;
  label: string;
  active: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={[
        "flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all duration-200",
        "outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/60",
        active
          ? "bg-[var(--accent)] text-white shadow-md"
          : "text-[color:var(--text)]/90 hover:text-[color:var(--text)] hover:bg-[color:var(--muted)]",
      ].join(" ")}
    >
      <Icon className={`w-5 h-5 ${active ? "text-white" : "text-[color:var(--text)]/70"}`} />
      <span>{label}</span>
    </Link>
  );
}

export default function Sidebar() {
  const tCat = useTranslations("categories"); // <-- nav o'rniga categories
  const pathname = usePathname();
  const sp = useSearchParams();
  const { isSidebarOpen, closeSidebar } = useUi();

  const DesktopAside = (
    <aside className="hidden lg:block bg-[color:var(--surface)] h-[calc(100vh-64px)] p-3 rounded-2xl sticky top-[64px] ring-1 ring-[var(--ring)]">
      <nav className="flex flex-col gap-1">
        {items.map(({ id, href, icon: Icon }) => {
          const active = isActiveHref(href, pathname, sp);
          const label =
            id === "home"
              ? tCat("home")
              : id === "film"
              ? tCat("films")
              : id === "serial"
              ? tCat("series")
              : tCat(id); // sport | music | podcast
          return (
            <Item
              key={id}
              href={href}
              Icon={Icon}
              label={label}
              active={active}
            />
          );
        })}
      </nav>
    </aside>
  );

  const MobileDrawer = (
    <>
      {isSidebarOpen && (
        <button
          onClick={closeSidebar}
          aria-label="Close"
          className="lg:hidden fixed inset-0 bg-[color:var(--bg)]/60 backdrop-blur-[1px] z-40"
        />
      )}

      <aside
        className={[
          "lg:hidden fixed left-0 top-0 z-50 h-screen w-72 bg-[color:var(--surface)] p-3 rounded-r-2xl",
          "ring-1 ring-[var(--ring)] transition-transform duration-200 ease-in-out",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-base font-semibold text-[color:var(--text)]">
            Uzbe<span className="text-[var(--accent)]">Tube</span>
          </span>
          <button
            onClick={closeSidebar}
            className="h-8 w-8 grid place-items-center rounded-lg hover:bg-[color:var(--muted)] focus-visible:ring-2 focus-visible:ring-[var(--accent)]/60 outline-none"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-[color:var(--text)]/70" />
          </button>
        </div>

        <nav className="flex flex-col gap-1">
          {items.map(({ id, href, icon: Icon }) => {
            const active = isActiveHref(href, pathname, sp);
            const label =
              id === "home"
                ? tCat("home")
                : id === "film"
                ? tCat("films")
                : id === "serial"
                ? tCat("series")
                : tCat(id);
            return (
              <Item
                key={id}
                href={href}
                Icon={Icon}
                label={label}
                active={active}
                onClick={closeSidebar}
              />
            );
          })}
        </nav>
      </aside>
    </>
  );

  return (
    <>
      {DesktopAside}
      {MobileDrawer}
    </>
  );
}
