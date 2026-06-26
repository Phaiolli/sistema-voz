import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
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

  it("allows hits up to the limit", () => {
    expect(rateLimit("login:a@test", opts)).toEqual({ ok: true });
    expect(rateLimit("login:a@test", opts)).toEqual({ ok: true });
    expect(rateLimit("login:a@test", opts)).toEqual({ ok: true });
  });

  it("blocks the hit that exceeds the limit and reports retryAfter", () => {
    rateLimit("login:b@test", opts);
    rateLimit("login:b@test", opts);
    rateLimit("login:b@test", opts);

    const blocked = rateLimit("login:b@test", opts);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfter).toBeGreaterThan(0);
    expect(blocked.retryAfter).toBeLessThanOrEqual(60);
  });

  it("retryAfter is at least 1 second even at the window edge", () => {
    rateLimit("login:edge", opts);
    rateLimit("login:edge", opts);
    rateLimit("login:edge", opts);
    // Advance almost the full window so the oldest hit is about to expire.
    vi.advanceTimersByTime(59_999);
    const blocked = rateLimit("login:edge", opts);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfter).toBe(1);
  });

  it("slides the window: old hits expire and the limit resets", () => {
    rateLimit("login:c@test", opts);
    rateLimit("login:c@test", opts);
    rateLimit("login:c@test", opts);
    expect(rateLimit("login:c@test", opts).ok).toBe(false);

    // Move past the window — all prior hits fall outside it.
    vi.advanceTimersByTime(60_001);
    expect(rateLimit("login:c@test", opts)).toEqual({ ok: true });
  });

  it("partial slide: only the expired hits free up a slot", () => {
    rateLimit("login:d", opts); // t=0
    vi.advanceTimersByTime(30_000);
    rateLimit("login:d", opts); // t=30s
    rateLimit("login:d", opts); // t=30s
    expect(rateLimit("login:d", opts).ok).toBe(false); // 3 in window

    // Advance so only the first hit (t=0) expires; two remain.
    vi.advanceTimersByTime(30_001); // now t=60.001s
    expect(rateLimit("login:d", opts).ok).toBe(true); // back under limit
  });

  it("tracks keys independently", () => {
    rateLimit("ip:1", opts);
    rateLimit("ip:1", opts);
    rateLimit("ip:1", opts);
    expect(rateLimit("ip:1", opts).ok).toBe(false);
    // A different key is unaffected.
    expect(rateLimit("ip:2", opts).ok).toBe(true);
  });

  it("resetRateLimit clears all recorded hits", () => {
    rateLimit("ip:reset", opts);
    rateLimit("ip:reset", opts);
    rateLimit("ip:reset", opts);
    expect(rateLimit("ip:reset", opts).ok).toBe(false);
    resetRateLimit();
    expect(rateLimit("ip:reset", opts).ok).toBe(true);
  });

  it("max=1 blocks the second immediate hit", () => {
    const strict = { max: 1, windowMs: 10_000 };
    expect(rateLimit("strict", strict).ok).toBe(true);
    expect(rateLimit("strict", strict).ok).toBe(false);
  });
});
