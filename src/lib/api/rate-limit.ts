/**
 * In-memory sliding-window rate limiter (zero-dependency).
 *
 * Suitable for a single-instance deployment. State is per-process and resets on
 * restart, and it is NOT shared across serverless instances — see ADR 011 for
 * the trade-offs and the path to a shared store (e.g. Upstash) if we scale out.
 */

interface RateLimitOptions {
  /** Maximum number of hits allowed within the window. */
  max: number;
  /** Window length in milliseconds. */
  windowMs: number;
}

interface RateLimitResult {
  /** `true` when the hit is allowed; `false` when the limit is exceeded. */
  ok: boolean;
  /** Seconds until the next hit would be allowed (only set when blocked). */
  retryAfter?: number;
}

const hits = new Map<string, number[]>();

/**
 * Records a hit for `key` and reports whether it is within the limit.
 *
 * @param key - identifier to throttle on (e.g. `"login:" + email`).
 * @param options - `max` hits per `windowMs`.
 */
export function rateLimit(key: string, options: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  const windowStart = now - options.windowMs;

  const timestamps = (hits.get(key) ?? []).filter((t) => t > windowStart);

  // Drop fully-expired keys so the Map doesn't grow unbounded with stale keys.
  if (timestamps.length === 0) hits.delete(key);

  if (timestamps.length >= options.max) {
    hits.set(key, timestamps);
    const oldest = timestamps[0];
    const retryAfter = Math.ceil((oldest + options.windowMs - now) / 1000);
    return { ok: false, retryAfter: Math.max(retryAfter, 1) };
  }

  timestamps.push(now);
  hits.set(key, timestamps);
  return { ok: true };
}

/** Clears all recorded hits. Intended for test isolation only. */
export function resetRateLimit(): void {
  hits.clear();
}
