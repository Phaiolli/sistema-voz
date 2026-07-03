import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "./route";

const mockSupabase = { from: vi.fn() };
vi.mock("@/lib/supabase", () => ({ createServerClient: () => mockSupabase }));
vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));

import { auth } from "@/lib/auth";

function makeChain(data: unknown, subData: unknown = null) {
  const chain: Record<string, unknown> = {};
  for (const m of ["select", "eq", "order", "limit"]) chain[m] = vi.fn(() => chain);
  // Subscription lookup (from("users")…maybeSingle) resolves first; the payments
  // query awaits the chain (thenable). Same chain object serves both.
  chain.maybeSingle = vi.fn(() => Promise.resolve({ data: subData }));
  chain.then = (resolve: (v: unknown) => unknown) =>
    Promise.resolve({ data }).then(resolve);
  return chain;
}

beforeEach(() => {
  vi.resetAllMocks();
});

describe("GET /api/v1/me/plan — own plan and payment history", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    const res = await GET();
    expect(res.status).toBe(401);
    expect(mockSupabase.from).not.toHaveBeenCalled();
  });

  it("returns 401 when session has no user id", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { plan: "free" } } as never);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns plan, totals and mapped payments for the owner", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "usr_owner", plan: "paid" } } as never);
    mockSupabase.from.mockReturnValue(
      makeChain([
        { id: "pay_1", amount: 5990, currency: "brl", status: "paid", created_at: "2026-06-01", paid_at: "2026-06-01", event_data: { name: "Evento Um" }, event_id: "evt_1" },
        { id: "pay_2", amount: 5990, currency: "brl", status: "pending", created_at: "2026-06-02", paid_at: null, event_data: null, event_id: null },
      ]),
    );

    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.plan).toBe("paid");
    // Only the paid payment counts toward totals.
    expect(json.totalEvents).toBe(1);
    expect(json.totalSpent).toBe(5990);
    expect(json.payments).toHaveLength(2);
    expect(json.payments[0].eventName).toBe("Evento Um");
    expect(json.payments[1].eventName).toBeNull();
  });

  it("defaults plan to 'free' and totals to zero when there are no payments", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "usr_owner" } } as never);
    mockSupabase.from.mockReturnValue(makeChain(null));
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.plan).toBe("free");
    expect(json.totalSpent).toBe(0);
    expect(json.payments).toEqual([]);
  });
});
