import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { DELETE, GET } from "./route";

vi.mock("@/lib/supabase", () => ({ createServerClient: () => mockSupabase }));

const mockNotQ = vi.fn();
const mockNotR = vi.fn();

const mockSupabase = {
  from: vi.fn((table: string) => ({
    update: vi.fn().mockReturnValue({
      lt: vi.fn().mockReturnValue({
        not: table === "questions" ? mockNotQ : mockNotR,
      }),
    }),
  })),
};

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
  mockSupabase.from.mockImplementation((table: string) => ({
    update: vi.fn().mockReturnValue({
      lt: vi.fn().mockReturnValue({
        not: table === "questions" ? mockNotQ : mockNotR,
      }),
    }),
  }));
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
});

describe("GET /api/v1/internal/cleanup (Vercel Cron)", () => {
  it("returns 401 when no Authorization header", async () => {
    const res = await GET(makeReq(undefined, "GET"));
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
