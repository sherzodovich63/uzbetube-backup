// next.config.ts
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { withSentryConfig } from "@sentry/nextjs";

// next-intl: request config faylini (src/i18n/request.ts) avtomatik topadi
const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // HLS statik fayllar uchun to‘g‘ri MIME + CORS
  async headers() {
    return [
      {
        source: "/hls/:path*.m3u8",
        headers: [
          { key: "Content-Type", value: "application/vnd.apple.mpegurl" },
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Cache-Control", value: "public, max-age=0, must-revalidate" },
        ],
      },
      {
        source: "/hls/:path*.ts",
        headers: [
          { key: "Content-Type", value: "video/mp2t" },
          { key: "Access-Control-Allow-Origin", value: "*" },
        ],
      },
    ];
  },
};

// Avval next-intl, keyin Sentry bilan o‘raymiz (mavjud sozlamang saqlanadi)
export default withSentryConfig(withNextIntl(nextConfig), {
  silent: true,
});
