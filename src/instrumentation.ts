import * as Sentry from "@sentry/nextjs";

/**
 * Next.js instrumentation hook. Loads the runtime-appropriate Sentry config
 * (each is a no-op without `NEXT_PUBLIC_SENTRY_DSN`).
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

/** Reports uncaught errors from nested React Server Components to Sentry. */
export const onRequestError = Sentry.captureRequestError;
