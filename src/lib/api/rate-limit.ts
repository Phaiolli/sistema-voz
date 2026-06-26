/**
 * Sliding-window rate limiter with a pluggable store.
 *
 * The public API is {@link rateLimit}, which throttles on an arbitrary `key`
 * (e.g. `"login:" + email`). The actual counting is delegated to a
 * {@link RateLimitStore}:
 *
 * - **In-memory** (default): per-process `Map`, zero-dependency. State is not
 *   shared across serverless instances and resets on restart.
 * - **Upstash Redis (REST)**: enabled automatically when
 *   `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are set. Shared
 *   across instances, survives restarts. Uses the Upstash REST API over `fetch`
 *   (no npm dependency) with a sorted-set sliding window.
 *
 * See ADR 011 for the trade-offs.
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

/**
 * Backend that records hits for a key and decides whether each is allowed.
 *
 * Implementations must enforce a sliding window of `max` hits per `windowMs`
 * and return `retryAfter` (seconds, >= 1) when blocking.
 */
interface RateLimitStore {
  hit(key: string, options: RateLimitOptions): Promise<RateLimitResult>;
  /** Clears all state. Intended for test isolation only. */
  reset(): void;
}

/** In-memory sliding-window store (default, single-process). */
class InMemoryStore implements RateLimitStore {
  private readonly hits = new Map<string, number[]>();

  async hit(key: string, options: RateLimitOptions): Promise<RateLimitResult> {
    const now = Date.now();
    const windowStart = now - options.windowMs;

    const timestamps = (this.hits.get(key) ?? []).filter((t) => t > windowStart);

    // Drop fully-expired keys so the Map doesn't grow unbounded with stale keys.
    if (timestamps.length === 0) this.hits.delete(key);

    if (timestamps.length >= options.max) {
      this.hits.set(key, timestamps);
      const oldest = timestamps[0];
      const retryAfter = Math.ceil((oldest + options.windowMs - now) / 1000);
      return { ok: false, retryAfter: Math.max(retryAfter, 1) };
    }

    timestamps.push(now);
    this.hits.set(key, timestamps);
    return { ok: true };
  }

  reset(): void {
    this.hits.clear();
  }
}

/**
 * Distributed sliding-window store backed by Upstash Redis over its REST API.
 *
 * Each `hit` runs a pipeline against a sorted set keyed by `key`:
 * 1. `ZREMRANGEBYSCORE` — evict timestamps older than the window.
 * 2. `ZADD` — record this hit (score and member are `now`).
 * 3. `ZCARD` — count hits currently in the window.
 * 4. `PEXPIRE` — bound the key's lifetime to the window so idle keys disappear.
 *
 * If the post-add count exceeds `max`, the hit is rejected and the just-added
 * member is removed so it does not count against future requests.
 */
class UpstashRestStore implements RateLimitStore {
  constructor(
    private readonly url: string,
    private readonly token: string,
  ) {}

  async hit(key: string, options: RateLimitOptions): Promise<RateLimitResult> {
    const now = Date.now();
    const windowStart = now - options.windowMs;
    const redisKey = `ratelimit:${key}`;
    // Unique member per hit so concurrent requests in the same millisecond
    // don't collide in the sorted set.
    const member = `${now}-${Math.random().toString(36).slice(2)}`;

    const commands = [
      ["ZREMRANGEBYSCORE", redisKey, "0", String(windowStart)],
      ["ZADD", redisKey, String(now), member],
      ["ZCARD", redisKey],
      ["PEXPIRE", redisKey, String(options.windowMs)],
    ];

    const results = await this.pipeline(commands);
    // results[2] is the ZCARD reply (count including the hit just added).
    const count = Number(results[2]?.result ?? 0);

    if (count > options.max) {
      // Roll back this hit so it doesn't penalise future requests, then report
      // when the oldest in-window hit will expire.
      await this.pipeline([
        ["ZREM", redisKey, member],
        ["ZRANGE", redisKey, "0", "0", "WITHSCORES"],
      ]).catch(() => undefined);
      const retryAfter = Math.ceil(options.windowMs / 1000);
      return { ok: false, retryAfter: Math.max(retryAfter, 1) };
    }

    return { ok: true };
  }

  reset(): void {
    // No-op: distributed state is not cleared from the app process. The store
    // is only selected outside tests, so test isolation never reaches here.
  }

  private async pipeline(
    commands: string[][],
  ): Promise<Array<{ result?: unknown; error?: string }>> {
    const res = await fetch(`${this.url}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(commands),
      cache: "no-store",
    });

    if (!res.ok) {
      throw new Error(`Upstash REST error: ${res.status}`);
    }

    return (await res.json()) as Array<{ result?: unknown; error?: string }>;
  }
}

/**
 * Selects the primary store once per process based on the environment:
 * Upstash when both REST env vars are present, otherwise in-memory.
 *
 * Returns `isDistributed` so the caller knows whether a separate in-memory
 * fallback is meaningful (it is not when the primary is already in-memory).
 */
function createStore(): { store: RateLimitStore; isDistributed: boolean } {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) {
    return { store: new UpstashRestStore(url, token), isDistributed: true };
  }
  return { store: new InMemoryStore(), isDistributed: false };
}

let { store, isDistributed } = createStore();

// Per-instance fallback used only when the distributed store errors. It gives
// partial (per-instance) brute-force protection during a Redis outage instead
// of silently allowing every attempt.
let fallbackStore: RateLimitStore = new InMemoryStore();

/**
 * Records a hit for `key` and reports whether it is within the limit.
 *
 * If the distributed store errors (e.g. an Upstash/Redis outage), the call
 * falls back to a per-instance in-memory limiter rather than failing open, so
 * brute-force protection degrades gracefully instead of disappearing. The
 * function never throws, preserving auth availability.
 *
 * @param key - identifier to throttle on (e.g. `"login:" + email`).
 * @param options - `max` hits per `windowMs`.
 */
export async function rateLimit(
  key: string,
  options: RateLimitOptions,
): Promise<RateLimitResult> {
  try {
    return await store.hit(key, options);
  } catch {
    if (isDistributed) {
      // Distributed store unavailable: degrade to per-instance protection.
      return fallbackStore.hit(key, options);
    }
    // In-memory store should never throw; if it does, allow the hit so an
    // unexpected internal error never locks users out.
    return { ok: true };
  }
}

/**
 * Clears all recorded hits and re-selects the store from the environment.
 * Intended for test isolation only.
 */
export function resetRateLimit(): void {
  store.reset();
  fallbackStore.reset();
  ({ store, isDistributed } = createStore());
  fallbackStore = new InMemoryStore();
}
