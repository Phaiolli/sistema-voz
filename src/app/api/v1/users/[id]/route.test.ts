import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET, PATCH, DELETE } from "./route";

const mockSupabase = { from: vi.fn() };
const mockUpdateUser = vi.fn();
const mockUpdateUserMetadata = vi.fn();
const mockCreateEmailAddress = vi.fn();
const mockDeleteUser = vi.fn();

vi.mock("@/lib/supabase", () => ({ createServerClient: () => mockSupabase }));
vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@clerk/nextjs/server", () => ({ clerkClient: vi.fn() }));

import { auth } from "@/lib/auth";
import { clerkClient } from "@clerk/nextjs/server";

const mockRow = {
  id: "usr_1", name: "Mediador", email: "med@exemplo.com", clerk_id: "user_clerk_1",
  role: "mediador", created_at: new Date().toISOString(), last_seen_at: null,
};

function makeChain(maybeSingleData?: unknown, singleData?: unknown) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: maybeSingleData ?? null }),
    single: vi.fn().mockResolvedValue({ data: singleData ?? null, error: null }),
  };
}

function makeParams(id = "usr_1") {
  return { params: Promise.resolve({ id }) };
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(clerkClient).mockResolvedValue({
    users: {
      updateUser: mockUpdateUser,
      updateUserMetadata: mockUpdateUserMetadata,
      deleteUser: mockDeleteUser,
    },
    emailAddresses: { createEmailAddress: mockCreateEmailAddress },
  } as never);
});

describe("GET /api/v1/users/[id]", () => {
  it("returns 401 without auth", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    const res = await GET(new NextRequest("http://localhost"), makeParams());
    expect(res.status).toBe(401);
  });

  it("returns 404 when user not found", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { role: "admin" } } as never);
    mockSupabase.from.mockReturnValue(makeChain(null));
    const res = await GET(new NextRequest("http://localhost"), makeParams());
    expect(res.status).toBe(404);
  });

  it("returns user without passwordHash", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { role: "admin" } } as never);
    mockSupabase.from.mockReturnValue(makeChain(mockRow));
    const res = await GET(new NextRequest("http://localhost"), makeParams());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.id).toBe("usr_1");
    expect(json).not.toHaveProperty("passwordHash");
    expect(json).not.toHaveProperty("password_hash");
  });
});

describe("PATCH /api/v1/users/[id]", () => {
  function makeReq(body: unknown) {
    return new NextRequest("http://localhost", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  it("returns 403 for mediador role", async () => {
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

  it("updates user password and returns 200", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { role: "admin" } } as never);
    // Password-only patch: no Supabase column changes, so the row is refetched
    // via maybeSingle. Target lookup must resolve to a row carrying clerk_id.
    mockSupabase.from.mockReturnValue(makeChain({ ...mockRow, name: "Com Senha" }));
    const res = await PATCH(makeReq({ password: "NovaSenha1" }), makeParams());
    expect(res.status).toBe(200);
    expect(mockUpdateUser).toHaveBeenCalledWith("user_clerk_1", { password: "NovaSenha1" });
  });

  it("returns 404 when update fails with PGRST116", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { role: "admin" } } as never);
    const chain = {
      ...makeChain({ ...mockRow, clerk_id: "user_clerk_1" }),
      single: vi.fn().mockResolvedValue({ data: null, error: { code: "PGRST116", message: "not found" } }),
    };
    mockSupabase.from.mockReturnValue(chain);
    const res = await PATCH(makeReq({ name: "Novo" }), makeParams());
    expect(res.status).toBe(404);
  });

  it("returns 409 on duplicate email with another user", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { role: "admin" } } as never);
    mockSupabase.from.mockReturnValue(makeChain({ id: "other_usr" }));
    const res = await PATCH(makeReq({ email: "outro@exemplo.com" }), makeParams());
    expect(res.status).toBe(409);
  });

  it("updates user and returns 200 without passwordHash", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { role: "admin" } } as never);
    const updatedRow = { ...mockRow, name: "Atualizado" };
    const chain = {
      ...makeChain({ ...mockRow, clerk_id: "user_clerk_1" }),
      single: vi.fn().mockResolvedValue({ data: updatedRow, error: null }),
    };
    mockSupabase.from.mockReturnValue(chain);
    const res = await PATCH(makeReq({ name: "Atualizado" }), makeParams());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.name).toBe("Atualizado");
    expect(json).not.toHaveProperty("passwordHash");
    expect(json).not.toHaveProperty("password_hash");
  });
});

describe("DELETE /api/v1/users/[id]", () => {
  it("returns 204 when user deleted", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { role: "admin" } } as never);
    // Target lookup resolves to a row with clerk_id; delete().eq() resolves via
    // the chain (no `error` property) → 204.
    mockSupabase.from.mockReturnValue(makeChain({ clerk_id: "user_clerk_1" }));
    const res = await DELETE(new NextRequest("http://localhost"), makeParams());
    expect(res.status).toBe(204);
    expect(mockDeleteUser).toHaveBeenCalledWith("user_clerk_1");
  });

  it("returns 401 without auth", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    const res = await DELETE(new NextRequest("http://localhost"), makeParams());
    expect(res.status).toBe(401);
  });
});
