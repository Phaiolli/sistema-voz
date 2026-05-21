import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "./route";

const mockSupabase = { from: vi.fn() };

vi.mock("@/lib/supabase", () => ({ createServerClient: () => mockSupabase }));
vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));

import { auth } from "@/lib/auth";

const mockUserRow = {
  id: "usr_med", name: "Mediador", email: "med@exemplo.com",
  role: "mediador", created_at: new Date().toISOString(), last_seen_at: null,
};

function makeChain(maybeSingleData?: unknown) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: maybeSingleData ?? null }),
    then: (resolve: (v: { data: unknown; error: unknown }) => unknown) =>
      Promise.resolve({ data: [], error: null }).then(resolve),
  };
}

function makeParams(id = "evt_1") {
  return { params: Promise.resolve({ id }) };
}

function makeReq(body?: unknown) {
  return new NextRequest("http://localhost/api/v1/events/evt_1/mediators", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
}

beforeEach(() => vi.resetAllMocks());

describe("GET /api/v1/events/[id]/mediators", () => {
  it("returns 401 without auth", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    const res = await GET(new NextRequest("http://localhost"), makeParams());
    expect(res.status).toBe(401);
  });

  it("returns 403 for mediador", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { role: "mediador" } } as never);
    const res = await GET(new NextRequest("http://localhost"), makeParams());
    expect(res.status).toBe(403);
  });

  it("returns mediator list for admin", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { role: "admin" } } as never);
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({
        data: [{ user_id: "usr_med", created_at: new Date().toISOString(), users: mockUserRow }],
        error: null,
      }),
    };
    mockSupabase.from.mockReturnValue(chain);
    const res = await GET(new NextRequest("http://localhost"), makeParams());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.mediators).toHaveLength(1);
    expect(json.mediators[0].user.id).toBe("usr_med");
  });
});

describe("POST /api/v1/events/[id]/mediators", () => {
  it("returns 422 for missing userId", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { role: "admin" } } as never);
    const res = await POST(makeReq({}), makeParams());
    expect(res.status).toBe(422);
  });

  it("returns 404 when user not found", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { role: "admin" } } as never);
    mockSupabase.from.mockReturnValue(makeChain(null));
    const res = await POST(makeReq({ userId: "usr_unknown" }), makeParams());
    expect(res.status).toBe(404);
  });

  it("returns 422 when user is not mediador", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { role: "admin" } } as never);
    mockSupabase.from.mockReturnValue(makeChain({ id: "usr_admin", role: "admin" }));
    const res = await POST(makeReq({ userId: "usr_admin" }), makeParams());
    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json.error.code).toBe("INVALID_ROLE");
  });

  it("returns 409 when assignment already exists", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { role: "admin" } } as never);
    const chain = makeChain({ id: "usr_med", role: "mediador" });
    chain.maybeSingle
      .mockResolvedValueOnce({ data: { id: "usr_med", role: "mediador" } })
      .mockResolvedValueOnce({ data: { event_id: "evt_1" } });
    mockSupabase.from.mockReturnValue(chain);
    const res = await POST(makeReq({ userId: "usr_med" }), makeParams());
    expect(res.status).toBe(409);
  });

  it("creates assignment and returns 201", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { role: "admin" } } as never);
    const chain = makeChain();
    chain.maybeSingle
      .mockResolvedValueOnce({ data: { id: "usr_med", role: "mediador" } })
      .mockResolvedValueOnce({ data: null });
    const insertChain = { insert: vi.fn().mockResolvedValue({ error: null }) };
    mockSupabase.from
      .mockReturnValueOnce(chain)
      .mockReturnValueOnce(chain)
      .mockReturnValue(insertChain);
    const res = await POST(makeReq({ userId: "usr_med" }), makeParams());
    expect(res.status).toBe(201);
  });
});
