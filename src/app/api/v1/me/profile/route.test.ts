import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockCompare, mockHash } = vi.hoisted(() => ({
  mockCompare: vi.fn(),
  mockHash: vi.fn(),
}));
vi.mock("bcryptjs", () => ({ default: { compare: mockCompare, hash: mockHash } }));

const mockSupabase = { from: vi.fn() };
vi.mock("@/lib/supabase", () => ({ createServerClient: () => mockSupabase }));
vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));

import { PATCH } from "./route";
import { auth } from "@/lib/auth";

/** Chain that supports both `.select().eq().single()` and `.update().eq()`. */
function makeChain(opts: { singleData?: unknown; updateError?: unknown } = {}) {
  const chain: Record<string, unknown> = {};
  chain.select = vi.fn(() => chain);
  chain.update = vi.fn(() => chain);
  chain.eq = vi.fn(() => chain);
  chain.single = vi.fn(() => Promise.resolve({ data: opts.singleData ?? null }));
  chain.then = (resolve: (v: unknown) => unknown) =>
    Promise.resolve({ error: opts.updateError ?? null }).then(resolve);
  return chain;
}

function makeReq(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/v1/me/profile", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.resetAllMocks();
  mockHash.mockResolvedValue("$2a$new-hash");
});

describe("PATCH /api/v1/me/profile", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    const res = await PATCH(makeReq({ name: "Novo Nome" }));
    expect(res.status).toBe(401);
  });

  it("returns 422 for invalid payload", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "u1" } } as never);
    const res = await PATCH(makeReq({ name: "X" })); // too short
    expect(res.status).toBe(422);
  });

  it("returns 422 for non-JSON body", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "u1" } } as never);
    const req = new NextRequest("http://localhost/api/v1/me/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: "not-json{{",
    });
    const res = await PATCH(req);
    expect(res.status).toBe(422);
  });

  it("updates the name and returns 200", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "u1" } } as never);
    const chain = makeChain();
    mockSupabase.from.mockReturnValue(chain);
    const res = await PATCH(makeReq({ name: "Nome Atualizado" }));
    expect(res.status).toBe(200);
    expect(chain.update).toHaveBeenCalledWith({ name: "Nome Atualizado" });
  });

  it("returns 'nothing to update' when patch is empty", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "u1" } } as never);
    const res = await PATCH(makeReq({}));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.message).toContain("Nada");
  });

  it("returns 422 when changing password without currentPassword", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "u1" } } as never);
    const res = await PATCH(makeReq({ password: "newsecret123" }));
    expect(res.status).toBe(422);
  });

  it("returns 403 when current password is wrong", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "u1" } } as never);
    mockSupabase.from.mockReturnValue(makeChain({ singleData: { password_hash: "$2a$old" } }));
    mockCompare.mockResolvedValue(false);
    const res = await PATCH(makeReq({ password: "newsecret123", currentPassword: "wrong" }));
    expect(res.status).toBe(403);
  });

  it("changes the password when current password is correct", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "u1" } } as never);
    const chain = makeChain({ singleData: { password_hash: "$2a$old" } });
    mockSupabase.from.mockReturnValue(chain);
    mockCompare.mockResolvedValue(true);
    const res = await PATCH(makeReq({ password: "newsecret123", currentPassword: "correct" }));
    expect(res.status).toBe(200);
    expect(mockHash).toHaveBeenCalledWith("newsecret123", 12);
  });

  it("returns 500 when the update fails", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "u1" } } as never);
    mockSupabase.from.mockReturnValue(makeChain({ updateError: new Error("db down") }));
    const res = await PATCH(makeReq({ name: "Nome Valido" }));
    expect(res.status).toBe(500);
  });
});
