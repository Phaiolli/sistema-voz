import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "./route";

const mockSupabase = { from: vi.fn() };
vi.mock("@/lib/supabase", () => ({ createServerClient: () => mockSupabase }));
vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));

import { auth } from "@/lib/auth";

function makeChain(result: unknown) {
  const chain: Record<string, unknown> = {};
  for (const m of ["select", "eq", "neq", "in", "order"]) chain[m] = vi.fn(() => chain);
  chain.then = (resolve: (v: unknown) => unknown) =>
    Promise.resolve(result).then(resolve);
  return chain;
}

// Synthetic, non-PII rows.
const userRows = [
  { id: "u1", name: "Org Um", email: "org1@example.test", role: "owner", plan: "free", created_at: "2026-01-01", last_seen_at: "2026-06-01" },
  { id: "u2", name: "Org Dois", email: "org2@example.test", role: "owner", plan: "paid", created_at: "2026-02-01", last_seen_at: null },
];

beforeEach(() => {
  vi.resetAllMocks();
});

describe("GET /api/v1/plataforma/users — BFLA superadmin gate", () => {
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

  it("happy path: returns users with event counts for superadmin", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "sa", role: "superadmin" } } as never);
    let call = 0;
    const results = [
      { data: userRows }, // users query
      { data: [{ organizer_id: "u1" }, { organizer_id: "u1" }, { organizer_id: "u2" }] }, // event counts
    ];
    mockSupabase.from.mockImplementation(() => makeChain(results[call++]));

    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.users).toHaveLength(2);
    expect(json.users[0].id).toBe("u1");
    expect(json.users[0].eventsCount).toBe(2);
    expect(json.users[1].eventsCount).toBe(1);
  });

  it("returns empty list when there are no non-superadmin users", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "sa", role: "superadmin" } } as never);
    mockSupabase.from.mockImplementation(() => makeChain({ data: [] }));
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.users).toEqual([]);
  });
});
