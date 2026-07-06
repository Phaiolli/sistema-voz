import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

// Static security headers. Content-Security-Policy is intentionally NOT here:
// it is built per-request with a fresh nonce in `src/proxy.ts` so `script-src`
// no longer needs `'unsafe-inline'`. Keeping it out avoids a duplicate/conflicting
// CSP header.
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  experimental: {
    authInterrupts: true,
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

// Sentry wraps the config to inject the client SDK and (in CI, when
// SENTRY_AUTH_TOKEN is set) upload source maps. Source-map upload is skipped
// automatically when the auth token is absent, so local builds are unaffected.
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
});
