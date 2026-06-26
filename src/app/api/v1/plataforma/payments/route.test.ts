import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "./route";

const mockSupabase = { from: vi.fn() };
vi.mock("@/lib/supabase", () => ({ createServerClient: () => mockSupabase }));
vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));

import { auth } from "@/lib/auth";

function makeChain(result: unknown) {
  const chain: Record<string, unknown> = {};
  for (const m of ["select", "eq", "in", "order", "limit"]) chain[m] = vi.fn(() => chain);
  chain.then = (resolve: (v: unknown) => unknown) =>
    Promise.resolve(result).then(resolve);
  return chain;
}

// Synthetic payment rows (no real PII).
const paymentRows = [
  {
    id: "pay_1",
    owner_id: "u1",
    event_id: "evt_1",
    amount: 5990,
    currency: "brl",
    status: "paid",
    stripe_session_id: "cs_1",
    stripe_payment_intent_id: "pi_1",
    created_at: "2026-06-01",
    paid_at: "2026-06-01",
  },
  {
    id: "pay_2",
    owner_id: "u2",
    event_id: null,
    amount: 5990,
    currency: "brl",
    status: "pending",
    stripe_session_id: "cs_2",
    stripe_payment_intent_id: null,
    created_at: "2026-06-02",
    paid_at: null,
  },
];

beforeEach(() => {
  vi.resetAllMocks();
});

describe("GET /api/v1/plataforma/payments — BFLA superadmin gate", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    const res = await GET();
    expect(res.status).toBe(401);
    expect(mockSupabase.from).not.toHaveBeenCalled();
  });

  it.each(["admin", "owner", "mediador"])(
    "returns 403 for role %s",
    async (role) => {
      vi.mocked(auth).mockResolvedValue({ user: { id: "u1", role } } as never);
      const res = await GET();
      expect(res.status).toBe(403);
      expect(mockSupabase.from).not.toHaveBeenCalled();
    },
  );

  it("happy path: returns enriched payments for superadmin", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "sa", role: "superadmin" } } as never);
    let call = 0;
    const results = [
      { data: paymentRows }, // payments
      { data: [{ id: "u1", name: "Org Um", email: "org1@example.test" }, { id: "u2", name: "Org Dois", email: "org2@example.test" }] }, // owners
      { data: [{ id: "evt_1", name: "Evento Um" }] }, // events
    ];
    mockSupabase.from.mockImplementation(() => makeChain(results[call++]));

    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.payments).toHaveLength(2);
    expect(json.payments[0].ownerName).toBe("Org Um");
    expect(json.payments[0].eventName).toBe("Evento Um");
    // event_id null -> "—"
    expect(json.payments[1].eventName).toBe("—");
    expect(json.payments[1].ownerName).toBe("Org Dois");
  });

  it("returns empty list when there are no payments", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "sa", role: "superadmin" } } as never);
    mockSupabase.from.mockImplementation(() => makeChain({ data: [] }));
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.payments).toEqual([]);
  });
});
