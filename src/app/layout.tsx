// src/app/layout.tsx
import "./globals.css";
import type { ReactNode } from "react";
import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { cookies } from "next/headers";
import { defaultLocale, type Locale } from "@/i18n/config";
import { ThemeProvider } from "next-themes";
import { UiProvider } from "@/components/ui/UiContext";

export const metadata: Metadata = {
  title: "UzbeTube",
  description: "UzbeTube video platform",
  // 👇 Favicon va manifest qo'shildi
  icons: {
    icon: [
      { url: "/favicon.png?v=6", type: "image/png", sizes: "any" },
      { url: "/favicon.ico?v=6" }, // bo'lsa — optional
    ],
    shortcut: "/favicon.png?v=6",
    apple: "/icons/icon-192.png", // bo'lsa
  },
  manifest: "/manifest.webmanifest",
  themeColor: "#000000",
};

async function getMessages(locale: Locale) {
  try {
    const mod = await import(`@/i18n/locales/${locale}.json`);
    return mod.default;
  } catch {
    const mod = await import("@/i18n/locales/uz.json");
    return mod.default;
  }
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies();
  const locale = (cookieStore.get("locale")?.value || defaultLocale) as Locale;
  const messages = await getMessages(locale);

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className="antialiased">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem storageKey="uzbetube-theme">
            <UiProvider>{children}</UiProvider>
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
