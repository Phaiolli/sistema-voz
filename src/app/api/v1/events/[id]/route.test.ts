import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET, PATCH, DELETE } from "./route";

const mockSupabase = { from: vi.fn() };

vi.mock("@/lib/supabase", () => ({ createServerClient: () => mockSupabase }));
vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));

import { auth } from "@/lib/auth";

const mockRow = {
  id: "evt_1", slug: "evt-slug", name: "Evento", starts_at: "2025-06-01T14:00:00Z",
  ends_at: "2025-06-01T18:00:00Z", place: "Local", address: "", status: "draft",
  about: "", theme: {}, config: {}, organizer_id: "usr_1",
  created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
};

function makeChain(maybeSingleData?: unknown, singleData?: unknown, singleError?: unknown) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: maybeSingleData ?? null }),
    single: vi.fn().mockResolvedValue({ data: singleData ?? null, error: singleError ?? null }),
  };
}

function makeParams(id = "evt_1") {
  return { params: Promise.resolve({ id }) };
}

beforeEach(() => vi.resetAllMocks());

describe("GET /api/v1/events/[id]", () => {
  it("returns 401 without auth", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    const res = await GET(new NextRequest("http://localhost"), makeParams());
    expect(res.status).toBe(401);
  });

  it("returns 404 when event not found", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { role: "admin" } } as never);
    mockSupabase.from.mockReturnValue(makeChain(null));
    const res = await GET(new NextRequest("http://localhost"), makeParams());
    expect(res.status).toBe(404);
  });

  it("returns event for admin", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { role: "admin" } } as never);
    mockSupabase.from.mockReturnValue(makeChain(mockRow));
    const res = await GET(new NextRequest("http://localhost"), makeParams());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.id).toBe("evt_1");
  });
});

describe("PATCH /api/v1/events/[id]", () => {
  function makeReq(body: unknown) {
    return new NextRequest("http://localhost", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  it("returns 403 for mediador", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { role: "mediador" } } as never);
    const res = await PATCH(makeReq({ name: "X" }), makeParams());
    expect(res.status).toBe(403);
  });

  it("returns 422 when body is not valid JSON", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { role: "admin" } } as never);
    const req = new NextRequest("http://localhost", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: "not-json{{",
    });
    const res = await PATCH(req, makeParams());
    expect(res.status).toBe(422);
  });

  it("returns 404 when update fails with PGRST116", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { role: "admin" } } as never);
    mockSupabase.from.mockReturnValue(makeChain(null, null, { code: "PGRST116", message: "not found" }));
    const res = await PATCH(makeReq({ name: "Novo Nome" }), makeParams());
    expect(res.status).toBe(404);
  });

  it("returns 409 on slug conflict with another event", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { role: "admin" } } as never);
    mockSupabase.from.mockReturnValue(makeChain({ id: "other_evt" }));
    const res = await PATCH(makeReq({ slug: "outro-slug" }), makeParams());
    expect(res.status).toBe(409);
  });

  it("updates event and returns 200", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { role: "admin" } } as never);
    const updatedRow = { ...mockRow, name: "Atualizado" };
    const chain = makeChain(null, updatedRow, null);
    mockSupabase.from.mockReturnValue(chain);
    const res = await PATCH(makeReq({ name: "Atualizado" }), makeParams());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.id).toBe("evt_1");
  });
});

describe("DELETE /api/v1/events/[id]", () => {
  it("returns 401 without auth", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    const res = await DELETE(new NextRequest("http://localhost"), makeParams());
    expect(res.status).toBe(401);
  });

  it("returns 204 on success", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { role: "admin" } } as never);
    const deleteChain = {
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: null }),
    };
    mockSupabase.from.mockReturnValue(deleteChain);
    const res = await DELETE(new NextRequest("http://localhost"), makeParams());
    expect(res.status).toBe(204);
  });
});
