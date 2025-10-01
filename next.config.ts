const { withSentryConfig } = require("@sentry/nextjs");

const nextConfig = {
  reactStrictMode: true,
  // boshqa sozlamalaring shu yerda
};

module.exports = withSentryConfig(nextConfig, { silent: true });
