import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from "vitest";
import { rateLimit, resetRateLimit } from "./rate-limit";

beforeEach(() => {
  resetRateLimit();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-06-25T12:00:00.000Z"));
});

afterEach(() => {
  vi.useRealTimers();
  resetRateLimit();
});

describe("rateLimit", () => {
  const opts = { max: 3, windowMs: 60_000 };

  it("allows hits up to the limit", async () => {
    expect(await rateLimit("login:a@test", opts)).toEqual({ ok: true });
    expect(await rateLimit("login:a@test", opts)).toEqual({ ok: true });
    expect(await rateLimit("login:a@test", opts)).toEqual({ ok: true });
  });

  it("blocks the hit that exceeds the limit and reports retryAfter", async () => {
    await rateLimit("login:b@test", opts);
    await rateLimit("login:b@test", opts);
    await rateLimit("login:b@test", opts);

    const blocked = await rateLimit("login:b@test", opts);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfter).toBeGreaterThan(0);
    expect(blocked.retryAfter).toBeLessThanOrEqual(60);
  });

  it("retryAfter is at least 1 second even at the window edge", async () => {
    await rateLimit("login:edge", opts);
    await rateLimit("login:edge", opts);
    await rateLimit("login:edge", opts);
    // Advance almost the full window so the oldest hit is about to expire.
    vi.advanceTimersByTime(59_999);
    const blocked = await rateLimit("login:edge", opts);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfter).toBe(1);
  });

  it("slides the window: old hits expire and the limit resets", async () => {
    await rateLimit("login:c@test", opts);
    await rateLimit("login:c@test", opts);
    await rateLimit("login:c@test", opts);
    expect((await rateLimit("login:c@test", opts)).ok).toBe(false);

    // Move past the window — all prior hits fall outside it.
    vi.advanceTimersByTime(60_001);
    expect(await rateLimit("login:c@test", opts)).toEqual({ ok: true });
  });

  it("partial slide: only the expired hits free up a slot", async () => {
    await rateLimit("login:d", opts); // t=0
    vi.advanceTimersByTime(30_000);
    await rateLimit("login:d", opts); // t=30s
    await rateLimit("login:d", opts); // t=30s
    expect((await rateLimit("login:d", opts)).ok).toBe(false); // 3 in window

    // Advance so only the first hit (t=0) expires; two remain.
    vi.advanceTimersByTime(30_001); // now t=60.001s
    expect((await rateLimit("login:d", opts)).ok).toBe(true); // back under limit
  });

  it("tracks keys independently", async () => {
    await rateLimit("ip:1", opts);
    await rateLimit("ip:1", opts);
    await rateLimit("ip:1", opts);
    expect((await rateLimit("ip:1", opts)).ok).toBe(false);
    // A different key is unaffected.
    expect((await rateLimit("ip:2", opts)).ok).toBe(true);
  });

  it("resetRateLimit clears all recorded hits", async () => {
    await rateLimit("ip:reset", opts);
    await rateLimit("ip:reset", opts);
    await rateLimit("ip:reset", opts);
    expect((await rateLimit("ip:reset", opts)).ok).toBe(false);
    resetRateLimit();
    expect((await rateLimit("ip:reset", opts)).ok).toBe(true);
  });

  it("max=1 blocks the second immediate hit", async () => {
    const strict = { max: 1, windowMs: 10_000 };
    expect((await rateLimit("strict", strict)).ok).toBe(true);
    expect((await rateLimit("strict", strict)).ok).toBe(false);
  });
});

describe("rateLimit — store selection", () => {
  const opts = { max: 2, windowMs: 60_000 };
  const ENV_URL = "UPSTASH_REDIS_REST_URL";
  const ENV_TOKEN = "UPSTASH_REDIS_REST_TOKEN";

  beforeEach(() => {
    delete process.env[ENV_URL];
    delete process.env[ENV_TOKEN];
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    delete process.env[ENV_URL];
    delete process.env[ENV_TOKEN];
    vi.unstubAllGlobals();
    resetRateLimit();
  });

  it("uses the in-memory store when Upstash env vars are absent", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    // Re-select the store with no env vars present.
    resetRateLimit();

    expect((await rateLimit("mem:key", opts)).ok).toBe(true);
    // In-memory never touches the network.
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("uses the Upstash REST store when both env vars are present", async () => {
    process.env[ENV_URL] = "https://example.upstash.io";
    process.env[ENV_TOKEN] = "test-token";

    // Pipeline reply order matches the commands: ZREMRANGEBYSCORE, ZADD,
    // ZCARD, PEXPIRE. ZCARD (index 2) returns the in-window count.
    const fetchSpy: Mock<(url: string, init?: RequestInit) => Promise<unknown>> = vi.fn(
      async () => ({
        ok: true,
        json: async () => [{ result: 0 }, { result: 1 }, { result: 1 }, { result: 1 }],
      }),
    );
    vi.stubGlobal("fetch", fetchSpy);
    resetRateLimit();

    const res = await rateLimit("upstash:key", opts);
    expect(res.ok).toBe(true);
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe("https://example.upstash.io/pipeline");
    const headers = init?.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer test-token");
  });

  it("Upstash store blocks once the in-window count exceeds max", async () => {
    process.env[ENV_URL] = "https://example.upstash.io";
    process.env[ENV_TOKEN] = "test-token";

    const fetchSpy = vi.fn(async () => ({
      ok: true,
      // ZCARD (index 2) reports 3 hits with max=2 → blocked. The rollback
      // pipeline (ZREM + ZRANGE) is the second call and may return anything.
      json: async () => [
        { result: 0 },
        { result: 1 },
        { result: 3 },
        { result: 1 },
      ],
    }));
    vi.stubGlobal("fetch", fetchSpy);
    resetRateLimit();

    const res = await rateLimit("upstash:blocked", opts);
    expect(res.ok).toBe(false);
    expect(res.retryAfter).toBeGreaterThanOrEqual(1);
  });

  it("degrades to a per-instance in-memory limiter when the Upstash store errors", async () => {
    process.env[ENV_URL] = "https://example.upstash.io";
    process.env[ENV_TOKEN] = "test-token";

    const fetchSpy = vi.fn(async () => ({ ok: false, status: 500, json: async () => [] }));
    vi.stubGlobal("fetch", fetchSpy);
    resetRateLimit();

    // Hits within the limit are still allowed (availability preserved)...
    expect((await rateLimit("upstash:err", opts)).ok).toBe(true);
    expect((await rateLimit("upstash:err", opts)).ok).toBe(true);
    // ...but the fallback still enforces the limit (no full fail-open).
    expect((await rateLimit("upstash:err", opts)).ok).toBe(false);
  });

  it("never throws on store error (auth availability preserved)", async () => {
    process.env[ENV_URL] = "https://example.upstash.io";
    process.env[ENV_TOKEN] = "test-token";

    const fetchSpy = vi.fn(async () => {
      throw new Error("network down");
    });
    vi.stubGlobal("fetch", fetchSpy);
    resetRateLimit();

    await expect(rateLimit("upstash:throw", opts)).resolves.toEqual({ ok: true });
  });
});
