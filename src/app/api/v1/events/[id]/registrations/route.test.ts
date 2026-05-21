import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "./route";

const mockSupabase = { from: vi.fn() };

vi.mock("@/lib/supabase", () => ({ createServerClient: () => mockSupabase }));
vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));

import { auth } from "@/lib/auth";

const mockReg = {
  id: "reg_1", event_id: "evt_1", name: "João Silva", email: "joao@example.com",
  phone: null, document: null, checked_in: false, checked_in_at: null,
  kit_delivered: false, kit_delivered_at: null, drawn: false, drawn_at: null,
  lgpd_accepted: true, created_at: new Date().toISOString(),
};

const openConfig = { config: { registration: { enabled: true } } };
const closedConfig = { config: { registration: { enabled: false } } };
const notOpenConfig = { config: { registration: { enabled: true, opensAt: "2099-01-01T00:00:00Z" } } };
const endedConfig = { config: { registration: { enabled: true, closesAt: "2000-01-01T00:00:00Z" } } };

function makeChain(opts: { maybeSingle?: unknown; data?: unknown[]; single?: unknown; singleError?: unknown } = {}) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: opts.maybeSingle ?? null }),
    single: vi.fn().mockResolvedValue({ data: opts.single ?? null, error: opts.singleError ?? null }),
    then: undefined,
    // list result
    data: opts.data ?? [],
    error: null,
  };
}

function makeParams(id = "evt_1") {
  return { params: Promise.resolve({ id }) };
}

function makeReq(body?: unknown) {
  return new NextRequest("http://localhost/api/v1/events/evt_1/registrations", {
    method: body ? "POST" : "GET",
    headers: body ? { "Content-Type": "application/json" } : {},
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
    const chain = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), limit: vi.fn().mockReturnThis(), maybeSingle: vi.fn().mockResolvedValue({ data: null }) };
    mockSupabase.from.mockReturnValue(chain);
    const res = await POST(makeReq(validBody), makeParams());
    expect(res.status).toBe(404);
  });

  it("returns 422 when registration is disabled", async () => {
    const chain = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), limit: vi.fn().mockReturnThis(), maybeSingle: vi.fn().mockResolvedValue({ data: { id: "evt_1", ...closedConfig } }) };
    mockSupabase.from.mockReturnValue(chain);
    const res = await POST(makeReq(validBody), makeParams());
    expect(res.status).toBe(422);
    const body = await res.json() as { error: { code: string } };
    expect(body.error.code).toBe("REGISTRATION_CLOSED");
  });

  it("returns 422 when registration not open yet", async () => {
    const chain = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), limit: vi.fn().mockReturnThis(), maybeSingle: vi.fn().mockResolvedValue({ data: { id: "evt_1", ...notOpenConfig } }) };
    mockSupabase.from.mockReturnValue(chain);
    const res = await POST(makeReq(validBody), makeParams());
    expect(res.status).toBe(422);
    const body = await res.json() as { error: { code: string } };
    expect(body.error.code).toBe("REGISTRATION_NOT_OPEN");
  });

  it("returns 422 when registration ended", async () => {
    const chain = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), limit: vi.fn().mockReturnThis(), maybeSingle: vi.fn().mockResolvedValue({ data: { id: "evt_1", ...endedConfig } }) };
    mockSupabase.from.mockReturnValue(chain);
    const res = await POST(makeReq(validBody), makeParams());
    expect(res.status).toBe(422);
    const body = await res.json() as { error: { code: string } };
    expect(body.error.code).toBe("REGISTRATION_ENDED");
  });

  it("returns 422 when lgpdAccepted is false", async () => {
    const chain = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), limit: vi.fn().mockReturnThis(), maybeSingle: vi.fn().mockResolvedValue({ data: { id: "evt_1", ...openConfig } }) };
    mockSupabase.from.mockReturnValue(chain);
    const res = await POST(makeReq({ ...validBody, lgpdAccepted: false }), makeParams());
    expect(res.status).toBe(422);
  });

  it("returns 409 on duplicate email", async () => {
    let callCount = 0;
    mockSupabase.from.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), limit: vi.fn().mockReturnThis(), maybeSingle: vi.fn().mockResolvedValue({ data: { id: "evt_1", ...openConfig } }) };
      }
      return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), limit: vi.fn().mockReturnThis(), maybeSingle: vi.fn().mockResolvedValue({ data: { id: "reg_existing" } }) };
    });
    const res = await POST(makeReq(validBody), makeParams());
    expect(res.status).toBe(409);
  });

  it("creates registration successfully", async () => {
    let callCount = 0;
    mockSupabase.from.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), limit: vi.fn().mockReturnThis(), maybeSingle: vi.fn().mockResolvedValue({ data: { id: "evt_1", ...openConfig } }) };
      }
      if (callCount === 2) {
        return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), limit: vi.fn().mockReturnThis(), maybeSingle: vi.fn().mockResolvedValue({ data: null }) };
      }
      return { insert: vi.fn().mockReturnThis(), select: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: mockReg, error: null }) };
    });
    const res = await POST(makeReq(validBody), makeParams());
    expect(res.status).toBe(201);
    const body = await res.json() as { id: string; name: string };
    expect(body.id).toBe("reg_1");
    expect(body.name).toBe("João Silva");
  });
});
