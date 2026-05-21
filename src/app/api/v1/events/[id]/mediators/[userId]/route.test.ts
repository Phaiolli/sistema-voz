import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { DELETE } from "./route";

const mockSupabase = { from: vi.fn() };

vi.mock("@/lib/supabase", () => ({ createServerClient: () => mockSupabase }));
vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));

import { auth } from "@/lib/auth";

function makeParams(id = "evt_1", userId = "usr_med") {
  return { params: Promise.resolve({ id, userId }) };
}

beforeEach(() => vi.resetAllMocks());

describe("DELETE /api/v1/events/[id]/mediators/[userId]", () => {
  it("returns 401 without auth", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    const res = await DELETE(new NextRequest("http://localhost"), makeParams());
    expect(res.status).toBe(401);
  });

  it("returns 403 for mediador role", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { role: "mediador" } } as never);
    const res = await DELETE(new NextRequest("http://localhost"), makeParams());
    expect(res.status).toBe(403);
  });

  it("returns 404 when assignment not found", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { role: "admin" } } as never);
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null }),
    };
    mockSupabase.from.mockReturnValue(chain);
    const res = await DELETE(new NextRequest("http://localhost"), makeParams());
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error.code).toBe("NOT_FOUND");
  });

  it("returns 204 on successful deletion", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { role: "admin" } } as never);
    const deleteChain = {
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
    };
    deleteChain.eq
      .mockReturnValueOnce(deleteChain)
      .mockResolvedValueOnce({ error: null });
    const selectChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { event_id: "evt_1" } }),
    };
    mockSupabase.from
      .mockReturnValueOnce(selectChain)
      .mockReturnValueOnce(deleteChain);
    const res = await DELETE(new NextRequest("http://localhost"), makeParams());
    expect(res.status).toBe(204);
  });
});
