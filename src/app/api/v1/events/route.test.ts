import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "./route";

// plan-limits mock — values overridden per test via vi.mocked
vi.mock("@/lib/plan-limits", () => ({
  getOwnerEventCount: vi.fn().mockResolvedValue(0),
  isOwnerPro: vi.fn().mockResolvedValue(false),
  FREE_EVENT_LIMIT: 1,
}));

import { getOwnerEventCount, isOwnerPro } from "@/lib/plan-limits";

const mockSupabase = { from: vi.fn() };

vi.mock("@/lib/supabase", () => ({ createServerClient: () => mockSupabase }));
vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));

import { auth } from "@/lib/auth";

const mockEventRow = {
  id: "evt_1",
  slug: "evento-teste",
  name: "Evento Teste",
  starts_at: "2025-06-01T14:00:00Z",
  ends_at: "2025-06-01T18:00:00Z",
  place: "Auditório",
  address: "Rua X",
  status: "draft",
  about: "",
  theme: {},
  config: {},
  organizer_id: "usr_admin",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

function makeChain(data: unknown, error: unknown = null) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: null }),
    single: vi.fn().mockResolvedValue({ data, error }),
    then: (resolve: (v: { data: unknown; error: unknown }) => unknown) =>
      Promise.resolve({ data, error }).then(resolve),
  };
}

beforeEach(() => vi.resetAllMocks());

describe("GET /api/v1/events", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns 403 when role is mediador", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { role: "mediador" } } as never);
    const res = await GET();
    expect(res.status).toBe(403);
  });

  it("returns event list for admin", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { role: "admin" } } as never);
    const chain = makeChain([mockEventRow]);
    mockSupabase.from.mockReturnValue(chain);
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.events).toHaveLength(1);
    expect(json.events[0].id).toBe("evt_1");
    expect(json.events[0]).not.toHaveProperty("organizer_id");
  });

  // SW3 — superadmin gets the same global view as admin.
  it("returns the full event list for superadmin", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { role: "superadmin", id: "su" } } as never);
    const chain = makeChain([mockEventRow]);
    mockSupabase.from.mockReturnValue(chain);
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.events).toHaveLength(1);
    // No organizer_id filter applied for superadmin (platform-wide view).
    expect(chain.eq).not.toHaveBeenCalledWith("organizer_id", expect.anything());
  });
});

describe("POST /api/v1/events", () => {
  const validBody = {
    name: "Novo Evento",
    slug: "novo-evento",
    startsAt: "2025-07-01T10:00",
    endsAt: "2025-07-01T16:00",
    place: "Teatro Municipal",
  };

  function makeRequest(body: unknown) {
    return new NextRequest("http://localhost/api/v1/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  it("returns 401 when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(401);
  });

  it("returns 422 for invalid body", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { role: "admin", id: "usr_1" } } as never);
    const res = await POST(makeRequest({ name: "X" }));
    expect(res.status).toBe(422);
  });

  it("returns 422 when body is not valid JSON", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { role: "admin", id: "usr_1" } } as never);
    const req = new NextRequest("http://localhost/api/v1/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not-json{{",
    });
    const res = await POST(req);
    expect(res.status).toBe(422);
  });

  it("returns 409 for duplicate slug", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { role: "admin", id: "usr_1" } } as never);
    const chain = makeChain(mockEventRow);
    chain.maybeSingle.mockResolvedValue({ data: { id: "existing" } });
    mockSupabase.from.mockReturnValue(chain);
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(409);
  });

  it("creates event and returns 201", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { role: "admin", id: "usr_admin" } } as never);
    const chain = makeChain(mockEventRow);
    chain.maybeSingle.mockResolvedValue({ data: null });
    mockSupabase.from.mockReturnValue(chain);
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.id).toBe("evt_1");
    expect(json).not.toHaveProperty("password_hash");
  });
});

describe("GET /api/v1/events — owner filtering", () => {
  it("returns only owner events when role is owner", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { role: "owner", id: "usr_owner" },
    } as never);
    const ownerRow = { ...mockEventRow, organizer_id: "usr_owner" };
    const chain = makeChain([ownerRow]);
    mockSupabase.from.mockReturnValue(chain);
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.events).toHaveLength(1);
    // eq must have been called with organizer_id filter
    expect(chain.eq).toHaveBeenCalledWith("organizer_id", "usr_owner");
  });

  it("does not apply organizer_id filter when role is admin", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { role: "admin", id: "usr_admin" },
    } as never);
    const chain = makeChain([mockEventRow]);
    mockSupabase.from.mockReturnValue(chain);
    const res = await GET();
    expect(res.status).toBe(200);
    expect(chain.eq).not.toHaveBeenCalledWith("organizer_id", expect.anything());
  });
});

describe("POST /api/v1/events — owner plan limits", () => {
  const ownerValidBody = {
    name: "Evento Owner",
    slug: "evento-owner",
    startsAt: "2025-07-01T10:00",
    endsAt: "2025-07-01T16:00",
    place: "Salão",
  };

  function makeOwnerRequest(body: unknown) {
    return new NextRequest("http://localhost/api/v1/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  it("creates event (201) when owner has 0 events", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { role: "owner", id: "usr_owner" },
    } as never);
    vi.mocked(getOwnerEventCount).mockResolvedValue(0);
    const chain = makeChain(mockEventRow);
    chain.maybeSingle.mockResolvedValue({ data: null });
    mockSupabase.from.mockReturnValue(chain);
    const res = await POST(makeOwnerRequest(ownerValidBody));
    expect(res.status).toBe(201);
  });

  it("returns 402 PAYMENT_REQUIRED when owner already has 1 event on free plan", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { role: "owner", id: "usr_owner" },
    } as never);
    vi.mocked(getOwnerEventCount).mockResolvedValue(1);
    vi.mocked(isOwnerPro).mockResolvedValue(false);
    const res = await POST(makeOwnerRequest(ownerValidBody));
    expect(res.status).toBe(402);
    const json = await res.json();
    expect(json.error.code).toBe("PAYMENT_REQUIRED");
    expect(json.error.checkoutRequired).toBe(true);
  });

  // ADR-018: a pro subscriber bypasses the free-event limit entirely.
  it("creates event (201) for a pro owner already over the free limit", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { role: "owner", id: "usr_pro" },
    } as never);
    vi.mocked(getOwnerEventCount).mockResolvedValue(5);
    vi.mocked(isOwnerPro).mockResolvedValue(true);
    const chain = makeChain(mockEventRow);
    chain.maybeSingle.mockResolvedValue({ data: null });
    mockSupabase.from.mockReturnValue(chain);
    const res = await POST(makeOwnerRequest(ownerValidBody));
    expect(res.status).toBe(201);
  });
});
