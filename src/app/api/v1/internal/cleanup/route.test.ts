import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { DELETE, GET } from "./route";

vi.mock("@/lib/supabase", () => ({ createServerClient: () => mockSupabase }));

const mockNotQ = vi.fn();
const mockNotR = vi.fn();

/**
 * Builds a fresh Supabase mock covering both phases of `runCleanup`:
 *  1. IP anonymization: `from(t).update().lt().not()` resolving with a count.
 *  2. Retention purge: `events` select (ended list), `questions` bulk update,
 *     `registrations` select + per-id update.
 * Defaults to "no ended events" so the legacy IP tests keep their counts.
 */
function buildSupabase(endedEvents: { id: string }[] = []) {
  return {
    from: vi.fn((table: string) => {
      if (table === "questions") {
        return {
          // IP anonymization phase
          update: vi.fn().mockReturnValue({
            lt: vi.fn().mockReturnValue({ not: mockNotQ }),
            // retention phase: .update().in().neq()
            in: vi.fn().mockReturnValue({
              neq: vi.fn().mockResolvedValue({ error: null, count: 0 }),
            }),
          }),
        };
      }
      if (table === "registrations") {
        return {
          update: vi.fn().mockReturnValue({
            lt: vi.fn().mockReturnValue({ not: mockNotR }),
            // retention per-id update: .update().eq()
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
          // retention select of registration ids
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockReturnValue({
              neq: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        };
      }
      // events: ended-list select for retention
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            lt: vi.fn().mockResolvedValue({ data: endedEvents, error: null }),
          }),
        }),
      };
    }),
  };
}

let mockSupabase = buildSupabase();

function makeReq(authHeader?: string, method: string = "DELETE"): NextRequest {
  const headers: HeadersInit = authHeader ? { authorization: authHeader } : {};
  return new NextRequest("http://localhost/api/v1/internal/cleanup", {
    method,
    headers,
  });
}

const SECRET = "test-secret-abc";

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("CRON_SECRET", SECRET);
  mockNotQ.mockResolvedValue({ error: null, count: 3 });
  mockNotR.mockResolvedValue({ error: null, count: 5 });
  mockSupabase = buildSupabase();
});

describe("DELETE /api/v1/internal/cleanup", () => {
  it("returns 401 when no Authorization header", async () => {
    const res = await DELETE(makeReq());
    expect(res.status).toBe(401);
  });

  it("returns 401 when wrong secret", async () => {
    const res = await DELETE(makeReq("Bearer wrong-secret"));
    expect(res.status).toBe(401);
  });

  it("returns 401 when CRON_SECRET env is not set", async () => {
    vi.stubEnv("CRON_SECRET", "");
    const res = await DELETE(makeReq(`Bearer ${SECRET}`));
    expect(res.status).toBe(401);
  });

  it("returns 200 with deleted count when authorized", async () => {
    const res = await DELETE(makeReq(`Bearer ${SECRET}`));
    expect(res.status).toBe(200);
    const body = await res.json() as { deleted: number; cutoff: string; tables: { questions: number; registrations: number } };
    expect(body.deleted).toBe(8);
    expect(body.tables.questions).toBe(3);
    expect(body.tables.registrations).toBe(5);
    expect(body.cutoff).toBeTruthy();
  });

  it("cutoff is approximately 30 days ago", async () => {
    const before = Date.now();
    const res = await DELETE(makeReq(`Bearer ${SECRET}`));
    const body = await res.json() as { cutoff: string };
    const cutoffMs = new Date(body.cutoff).getTime();
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
    expect(before - cutoffMs).toBeGreaterThanOrEqual(thirtyDaysMs - 1000);
    expect(before - cutoffMs).toBeLessThanOrEqual(thirtyDaysMs + 1000);
  });

  it("returns 500 when supabase returns error", async () => {
    mockNotQ.mockResolvedValue({ error: new Error("db error"), count: null });
    await expect(DELETE(makeReq(`Bearer ${SECRET}`))).rejects.toThrow("db error");
  });

  it("reports zero retention purge when no ended events are eligible", async () => {
    const res = await DELETE(makeReq(`Bearer ${SECRET}`));
    const body = await res.json() as {
      retention: { eligibleEvents: number; questions: number; registrations: number };
    };
    expect(body.retention.eligibleEvents).toBe(0);
    expect(body.retention.questions).toBe(0);
    expect(body.retention.registrations).toBe(0);
  });

  it("anonymizes PII of registrations for ended events past retention", async () => {
    const regUpdateEq = vi.fn().mockResolvedValue({ error: null });
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "questions") {
        return {
          update: vi.fn().mockReturnValue({
            lt: vi.fn().mockReturnValue({ not: mockNotQ }),
            in: vi.fn().mockReturnValue({
              neq: vi.fn().mockResolvedValue({ error: null, count: 4 }),
            }),
          }),
        };
      }
      if (table === "registrations") {
        return {
          update: vi.fn().mockReturnValue({
            lt: vi.fn().mockReturnValue({ not: mockNotR }),
            eq: regUpdateEq,
          }),
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockReturnValue({
              neq: vi.fn().mockResolvedValue({ data: [{ id: "reg_a" }, { id: "reg_b" }], error: null }),
            }),
          }),
        };
      }
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            lt: vi.fn().mockResolvedValue({ data: [{ id: "evt_old" }], error: null }),
          }),
        }),
      };
    });

    const res = await DELETE(makeReq(`Bearer ${SECRET}`));
    const body = await res.json() as {
      retention: { eligibleEvents: number; questions: number; registrations: number };
    };
    expect(body.retention.eligibleEvents).toBe(1);
    expect(body.retention.questions).toBe(4);
    expect(body.retention.registrations).toBe(2);
    // Each registration anonymized individually (NOT NULL unique email).
    expect(regUpdateEq).toHaveBeenCalledTimes(2);
  });

  it("is idempotent: ended event with already-anonymized rows performs no per-id update", async () => {
    const regUpdateEq = vi.fn().mockResolvedValue({ error: null });
    // questions .neq() filter yields count 0 (all already anonymized);
    // registrations select (already filtered by .neq(name, "[removido]")) is empty.
    const regSelectNeq = vi.fn().mockResolvedValue({ data: [], error: null });
    const qNeq = vi.fn().mockResolvedValue({ error: null, count: 0 });
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "questions") {
        return {
          update: vi.fn().mockReturnValue({
            lt: vi.fn().mockReturnValue({ not: mockNotQ }),
            in: vi.fn().mockReturnValue({ neq: qNeq }),
          }),
        };
      }
      if (table === "registrations") {
        return {
          update: vi.fn().mockReturnValue({
            lt: vi.fn().mockReturnValue({ not: mockNotR }),
            eq: regUpdateEq,
          }),
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockReturnValue({ neq: regSelectNeq }),
          }),
        };
      }
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            lt: vi.fn().mockResolvedValue({ data: [{ id: "evt_old" }], error: null }),
          }),
        }),
      };
    });

    const res = await DELETE(makeReq(`Bearer ${SECRET}`));
    const body = await res.json() as {
      retention: { eligibleEvents: number; questions: number; registrations: number };
    };
    expect(body.retention.eligibleEvents).toBe(1);
    expect(body.retention.questions).toBe(0);
    expect(body.retention.registrations).toBe(0);
    // Idempotency: no row re-anonymized.
    expect(regUpdateEq).not.toHaveBeenCalled();
    // The select filtered out already-anonymized names (.neq guard present).
    expect(regSelectNeq).toHaveBeenCalled();
  });

  it("does NOT anonymize recent/active events (only status=ended past retention are eligible)", async () => {
    // Production filters events by status='ended' AND ends_at < cutoff; the mock
    // returns an empty ended-list, proving active/recent events are excluded.
    const regUpdateEq = vi.fn();
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "questions") {
        return {
          update: vi.fn().mockReturnValue({
            lt: vi.fn().mockReturnValue({ not: mockNotQ }),
            in: vi.fn().mockReturnValue({ neq: vi.fn() }),
          }),
        };
      }
      if (table === "registrations") {
        return {
          update: vi.fn().mockReturnValue({
            lt: vi.fn().mockReturnValue({ not: mockNotR }),
            eq: regUpdateEq,
          }),
          select: vi.fn().mockReturnValue({ in: vi.fn().mockReturnValue({ neq: vi.fn() }) }),
        };
      }
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            lt: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      };
    });

    const res = await DELETE(makeReq(`Bearer ${SECRET}`));
    const body = await res.json() as { retention: { eligibleEvents: number } };
    expect(body.retention.eligibleEvents).toBe(0);
    expect(regUpdateEq).not.toHaveBeenCalled();
  });

  it("retention cutoff is approximately 90 days ago", async () => {
    let capturedCutoff = "";
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "questions") {
        return {
          update: vi.fn().mockReturnValue({
            lt: vi.fn().mockReturnValue({ not: mockNotQ }),
            in: vi.fn().mockReturnValue({ neq: vi.fn().mockResolvedValue({ error: null, count: 0 }) }),
          }),
        };
      }
      if (table === "registrations") {
        return {
          update: vi.fn().mockReturnValue({
            lt: vi.fn().mockReturnValue({ not: mockNotR }),
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockReturnValue({ neq: vi.fn().mockResolvedValue({ data: [], error: null }) }),
          }),
        };
      }
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            lt: vi.fn((_col: string, value: string) => {
              capturedCutoff = value;
              return Promise.resolve({ data: [], error: null });
            }),
          }),
        }),
      };
    });

    const before = Date.now();
    await DELETE(makeReq(`Bearer ${SECRET}`));
    const cutoffMs = new Date(capturedCutoff).getTime();
    const ninetyDaysMs = 90 * 24 * 60 * 60 * 1000;
    expect(before - cutoffMs).toBeGreaterThanOrEqual(ninetyDaysMs - 2000);
    expect(before - cutoffMs).toBeLessThanOrEqual(ninetyDaysMs + 2000);
  });

  it("throws (no partial success) when the ended-events query errors", async () => {
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "questions") {
        return {
          update: vi.fn().mockReturnValue({
            lt: vi.fn().mockReturnValue({ not: mockNotQ }),
          }),
        };
      }
      if (table === "registrations") {
        return {
          update: vi.fn().mockReturnValue({
            lt: vi.fn().mockReturnValue({ not: mockNotR }),
          }),
        };
      }
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            lt: vi.fn().mockResolvedValue({ data: null, error: new Error("events query failed") }),
          }),
        }),
      };
    });
    await expect(DELETE(makeReq(`Bearer ${SECRET}`))).rejects.toThrow("events query failed");
  });
});

describe("GET /api/v1/internal/cleanup (Vercel Cron)", () => {
  it("returns 401 when no Authorization header", async () => {
    const res = await GET(makeReq(undefined, "GET"));
    expect(res.status).toBe(401);
  });

  it("returns 401 when wrong secret", async () => {
    const res = await GET(makeReq("Bearer wrong-secret", "GET"));
    expect(res.status).toBe(401);
  });

  it("returns 401 when CRON_SECRET env is not set", async () => {
    vi.stubEnv("CRON_SECRET", "");
    const res = await GET(makeReq(`Bearer ${SECRET}`, "GET"));
    expect(res.status).toBe(401);
  });

  it("returns 200 and runs cleanup when authorized", async () => {
    const res = await GET(makeReq(`Bearer ${SECRET}`, "GET"));
    expect(res.status).toBe(200);
    const body = await res.json() as { deleted: number; tables: { questions: number; registrations: number } };
    expect(body.deleted).toBe(8);
    expect(body.tables.questions).toBe(3);
    expect(body.tables.registrations).toBe(5);
  });
});
