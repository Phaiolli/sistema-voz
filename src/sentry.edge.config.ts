import * as Sentry from "@sentry/nextjs";

/**
 * Edge-runtime Sentry init (middleware/proxy, edge route handlers). No-op unless
 * `NEXT_PUBLIC_SENTRY_DSN` is set. See `sentry.server.config.ts` for the PII note.
 */
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
    tracesSampleRate: 0.1,
    sendDefaultPii: false,
  });
}
