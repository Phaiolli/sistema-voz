import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "./route";

const mockSupabase = { from: vi.fn() };
vi.mock("@/lib/supabase", () => ({ createServerClient: () => mockSupabase }));
vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));

import { auth } from "@/lib/auth";

/**
 * Thenable query chain. Every builder method returns `this`, and awaiting the
 * chain resolves to `result`. `head: true` queries resolve to a `count`,
 * data queries to `{ data }`.
 */
function makeChain(result: unknown) {
  const chain: Record<string, unknown> = {};
  const passthrough = ["select", "eq", "neq", "gte", "order", "in", "limit"];
  for (const m of passthrough) chain[m] = vi.fn(() => chain);
  chain.then = (resolve: (v: unknown) => unknown) =>
    Promise.resolve(result).then(resolve);
  return chain;
}

beforeEach(() => {
  vi.resetAllMocks();
});

describe("GET /api/v1/plataforma/stats — BFLA superadmin gate", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    const res = await GET();
    expect(res.status).toBe(401);
    expect(mockSupabase.from).not.toHaveBeenCalled();
  });

  it.each(["admin", "owner", "mediador"])(
    "returns 403 for role %s (only superadmin allowed)",
    async (role) => {
      vi.mocked(auth).mockResolvedValue({ user: { id: "u1", role } } as never);
      const res = await GET();
      expect(res.status).toBe(403);
      expect(mockSupabase.from).not.toHaveBeenCalled();
    },
  );

  it("happy path: returns aggregated stats for superadmin", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "sa", role: "superadmin" } } as never);

    // The route fires 11 queries via Promise.all in a fixed order. Return a
    // deterministic chain per call: 10 count queries then the paidPayments data.
    const results: unknown[] = [
      { count: 12 }, // totalUsers
      { count: 8 }, // freeUsers
      { count: 3 }, // paidUsers
      { count: 1 }, // superadminUsers
      { count: 4 }, // newUsers30d
      { count: 6 }, // totalEvents
      { count: 2 }, // activeEvents
      { count: 1 }, // draftEvents
      { count: 3 }, // endedEvents
      { count: 2 }, // pendingPayments
      { data: [{ amount: 5990, paid_at: new Date().toISOString() }] }, // paidPayments
    ];
    let call = 0;
    mockSupabase.from.mockImplementation(() => makeChain(results[call++]));

    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    // totalUsers (12) minus superadminUsers (1).
    expect(json.users.total).toBe(11);
    expect(json.users.free).toBe(8);
    expect(json.users.paid).toBe(3);
    expect(json.events.total).toBe(6);
    expect(json.revenue.total).toBe(5990);
    expect(json.payments.paid).toBe(1);
    expect(json.payments.pending).toBe(2);
    expect(Array.isArray(json.monthlyRevenue)).toBe(true);
    expect(json.monthlyRevenue).toHaveLength(6);
  });

  it("happy path with no payments: revenue is zero", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "sa", role: "superadmin" } } as never);
    const counts = Array(10).fill({ count: 0 });
    const results = [...counts, { data: [] }];
    let call = 0;
    mockSupabase.from.mockImplementation(() => makeChain(results[call++]));

    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.revenue.total).toBe(0);
    expect(json.payments.paid).toBe(0);
  });
});
