import * as Sentry from "@sentry/nextjs";

/**
 * Server-side Sentry init. No-op unless `NEXT_PUBLIC_SENTRY_DSN` is set, so the
 * SDK stays inert in local/dev and any environment without the DSN.
 *
 * `sendDefaultPii: false` keeps request IP, headers and cookies out of events
 * (LGPD data minimisation — ADR-008). Do not raise it without a privacy review.
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
