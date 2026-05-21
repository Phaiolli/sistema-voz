import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "./route";

const mockSupabase = { from: vi.fn() };

vi.mock("@/lib/supabase", () => ({ createServerClient: () => mockSupabase }));
vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));

import { auth } from "@/lib/auth";

const mockReg = {
  id: "reg_1", event_id: "evt_1", name: "João Silva", email: "joao@example.com",
  phone: null, document: null, author_ip: "127.0.0.1", checked_in: false, checked_in_at: null,
  kit_delivered: false, kit_delivered_at: null, drawn: false, drawn_at: null,
  lgpd_accepted: true, created_at: new Date().toISOString(),
};

const openConfig = { config: { registration: { enabled: true } } };
const closedConfig = { config: { registration: { enabled: false } } };
const notOpenConfig = { config: { registration: { enabled: true, opensAt: "2099-01-01T00:00:00Z" } } };
const endedConfig = { config: { registration: { enabled: true, closesAt: "2000-01-01T00:00:00Z" } } };

/** Chain for event lookup (maybeSingle) */
function eventChain(data: unknown) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data }),
  };
}

/** Chain for rate limit check (resolves with count) */
function rateLimitChain(count = 0) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockResolvedValue({ count }),
  };
}

/** Chain for duplicate email check (maybeSingle) */
function duplicateChain(existing: unknown) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: existing }),
  };
}

/** Chain for insert */
function insertChain(data: unknown, insertError: unknown = null) {
  return {
    insert: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data, error: insertError }),
  };
}

function makeParams(id = "evt_1") {
  return { params: Promise.resolve({ id }) };
}

function makeReq(body?: unknown) {
  return new NextRequest("http://localhost/api/v1/events/evt_1/registrations", {
    method: body ? "POST" : "GET",
    headers: body ? { "Content-Type": "application/json", "x-forwarded-for": "127.0.0.1" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
}

beforeEach(() => vi.resetAllMocks());

describe("GET /api/v1/events/[id]/registrations", () => {
  it("returns 401 when unauthenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    const res = await GET(makeReq(), makeParams());
    expect(res.status).toBe(401);
  });

  it("returns 403 for non admin/mediador role", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { role: "guest" } } as never);
    const res = await GET(makeReq(), makeParams());
    expect(res.status).toBe(403);
  });

  it("returns registrations list for admin", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { role: "admin" } } as never);
    const chain = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), order: vi.fn().mockResolvedValue({ data: [mockReg], error: null }) };
    mockSupabase.from.mockReturnValue(chain);
    const res = await GET(makeReq(), makeParams());
    expect(res.status).toBe(200);
    const body = await res.json() as { registrations: unknown[] };
    expect(body.registrations).toHaveLength(1);
  });

  it("allows mediador role", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { role: "mediador" } } as never);
    const chain = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), order: vi.fn().mockResolvedValue({ data: [], error: null }) };
    mockSupabase.from.mockReturnValue(chain);
    const res = await GET(makeReq(), makeParams());
    expect(res.status).toBe(200);
  });
});

describe("POST /api/v1/events/[id]/registrations", () => {
  const validBody = { name: "João Silva", email: "joao@example.com", lgpdAccepted: true };

  it("returns 404 when event not found", async () => {
    mockSupabase.from.mockReturnValue(eventChain(null));
    const res = await POST(makeReq(validBody), makeParams());
    expect(res.status).toBe(404);
  });

  it("returns 422 when registration is disabled", async () => {
    mockSupabase.from.mockReturnValue(eventChain({ id: "evt_1", ...closedConfig }));
    const res = await POST(makeReq(validBody), makeParams());
    expect(res.status).toBe(422);
    const body = await res.json() as { error: { code: string } };
    expect(body.error.code).toBe("REGISTRATION_CLOSED");
  });

  it("returns 422 when registration not open yet", async () => {
    mockSupabase.from.mockReturnValue(eventChain({ id: "evt_1", ...notOpenConfig }));
    const res = await POST(makeReq(validBody), makeParams());
    expect(res.status).toBe(422);
    const body = await res.json() as { error: { code: string } };
    expect(body.error.code).toBe("REGISTRATION_NOT_OPEN");
  });

  it("returns 422 when registration ended", async () => {
    mockSupabase.from.mockReturnValue(eventChain({ id: "evt_1", ...endedConfig }));
    const res = await POST(makeReq(validBody), makeParams());
    expect(res.status).toBe(422);
    const body = await res.json() as { error: { code: string } };
    expect(body.error.code).toBe("REGISTRATION_ENDED");
  });

  it("returns 429 when IP is rate limited", async () => {
    let callCount = 0;
    mockSupabase.from.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return eventChain({ id: "evt_1", ...openConfig });
      return rateLimitChain(5); // at limit
    });
    const res = await POST(makeReq(validBody), makeParams());
    expect(res.status).toBe(429);
    const body = await res.json() as { error: { code: string } };
    expect(body.error.code).toBe("RATE_LIMITED");
  });

  it("returns 422 when lgpdAccepted is false", async () => {
    let callCount = 0;
    mockSupabase.from.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return eventChain({ id: "evt_1", ...openConfig });
      return rateLimitChain(0);
    });
    const res = await POST(makeReq({ ...validBody, lgpdAccepted: false }), makeParams());
    expect(res.status).toBe(422);
  });

  it("returns 409 on duplicate email", async () => {
    let callCount = 0;
    mockSupabase.from.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return eventChain({ id: "evt_1", ...openConfig });
      if (callCount === 2) return rateLimitChain(0);
      return duplicateChain({ id: "reg_existing" });
    });
    const res = await POST(makeReq(validBody), makeParams());
    expect(res.status).toBe(409);
  });

  it("creates registration successfully", async () => {
    let callCount = 0;
    mockSupabase.from.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return eventChain({ id: "evt_1", ...openConfig });
      if (callCount === 2) return rateLimitChain(0);
      if (callCount === 3) return duplicateChain(null);
      return insertChain(mockReg);
    });
    const res = await POST(makeReq(validBody), makeParams());
    expect(res.status).toBe(201);
    const body = await res.json() as { id: string; name: string };
    expect(body.id).toBe("reg_1");
    expect(body.name).toBe("João Silva");
  });
});
