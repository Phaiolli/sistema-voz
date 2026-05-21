import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST, DELETE } from "./route";

const mockSupabase = { from: vi.fn() };

vi.mock("@/lib/supabase", () => ({ createServerClient: () => mockSupabase }));
vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));

import { auth } from "@/lib/auth";

const eligible = [
  { id: "reg_1", name: "Maria Santos", email: "maria@example.com" },
  { id: "reg_2", name: "Pedro Lima", email: "pedro@example.com" },
];

function makeSelectChain(data: unknown[] | null, error: unknown = null) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    then: undefined,
    data,
    error,
  };
}

function makeParams(id = "evt_1") {
  return { params: Promise.resolve({ id }) };
}

function makeReq(method: string = "POST") {
  return new NextRequest(`http://localhost/api/v1/events/evt_1/draw`, { method });
}

beforeEach(() => vi.resetAllMocks());

describe("POST /api/v1/events/[id]/draw", () => {
  it("returns 401 when unauthenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    const res = await POST(makeReq(), makeParams());
    expect(res.status).toBe(401);
  });

  it("returns 403 for non-privileged role", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { role: "guest" } } as never);
    const res = await POST(makeReq(), makeParams());
    expect(res.status).toBe(403);
  });

  it("returns 409 when no eligible registrations", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { role: "admin" } } as never);
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      then: undefined,
      data: [],
      error: null,
    });
    const res = await POST(makeReq(), makeParams());
    expect(res.status).toBe(409);
    const body = await res.json() as { error: { code: string } };
    expect(body.error.code).toBe("NO_ELIGIBLE");
  });

  it("draws a winner and marks as drawn", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { role: "admin" } } as never);
    let callCount = 0;
    mockSupabase.from.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          then: undefined,
          data: eligible,
          error: null,
        };
      }
      return {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        then: undefined,
        error: null,
      };
    });
    const res = await POST(makeReq(), makeParams());
    expect(res.status).toBe(200);
    const body = await res.json() as { winner: { id: string; name: string }; remainingCount: number };
    expect(eligible.map((e) => e.id)).toContain(body.winner.id);
    expect(body.remainingCount).toBe(1);
  });

  it("allows mediador role", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { role: "mediador" } } as never);
    let callCount = 0;
    mockSupabase.from.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), then: undefined, data: [eligible[0]], error: null };
      return { update: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), then: undefined, error: null };
    });
    const res = await POST(makeReq(), makeParams());
    expect(res.status).toBe(200);
  });
});

describe("DELETE /api/v1/events/[id]/draw (reset)", () => {
  it("returns 403 for mediador role", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { role: "mediador" } } as never);
    const res = await DELETE(makeReq("DELETE"), makeParams());
    expect(res.status).toBe(403);
  });

  it("resets draw for admin", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { role: "admin" } } as never);
    mockSupabase.from.mockReturnValue({
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      then: undefined,
      error: null,
    });
    const res = await DELETE(makeReq("DELETE"), makeParams());
    expect(res.status).toBe(200);
    const body = await res.json() as { reset: boolean };
    expect(body.reset).toBe(true);
  });
});
