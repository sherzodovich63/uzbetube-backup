import type { Metadata } from 'next';
import AppHeader from '@/components/Header';
import './globals.css';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: 'UzbeTube', template: '%s | UzbeTube' },
  icons: [
    { rel: 'icon', url: '/favicon.ico' },
    { rel: 'icon', url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    { rel: 'icon', url: '/icon-48.png', sizes: '48x48', type: 'image/png' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const orgJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'UzbeTube',
    url: siteUrl,
    logo: `${siteUrl}/logo.jpg`, // public/logo.jpg bo'lsa
  };

  return (
    <html lang="uz">
      <head>
        <link rel="canonical" href={siteUrl} />
        {/* PWA (ixtiyoriy, keyingi bosqich uchun foydali) */}
        <link rel="manifest" href="/manifest.webmanifest" />
        <meta name="theme-color" content="#000000" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />

        <script
          type="application/ld+json"
          // @ts-ignore
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
        />
      </head>
      <body className="antialiased">
        <AppHeader />
        {children}
      </body>
    </html>
  );
}
