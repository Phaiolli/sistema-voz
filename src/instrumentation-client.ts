import * as Sentry from "@sentry/nextjs";

/**
 * Browser-side Sentry init. No-op unless `NEXT_PUBLIC_SENTRY_DSN` is set.
 *
 * Session Replay is disabled (it captures the DOM, i.e. potential PII); only
 * error/performance events are sent, with `sendDefaultPii: false`. The Sentry
 * ingest host is allow-listed in the CSP `connect-src` (see `src/proxy.ts`).
 */
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV,
    tracesSampleRate: 0.1,
    sendDefaultPii: false,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
  });
}

/** Instruments client-side navigations for tracing. */
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
