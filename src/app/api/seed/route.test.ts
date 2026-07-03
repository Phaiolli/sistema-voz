import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockCreateUser = vi.fn();
vi.mock("@clerk/nextjs/server", () => ({ clerkClient: vi.fn() }));

const mockSupabase = { from: vi.fn() };
vi.mock("@/lib/supabase", () => ({ createServerClient: () => mockSupabase }));

import { POST } from "./route";
import { clerkClient } from "@clerk/nextjs/server";

function makeChain(opts: { maybeSingleData?: unknown; insertError?: unknown } = {}) {
  const chain: Record<string, unknown> = {};
  chain.select = vi.fn(() => chain);
  chain.eq = vi.fn(() => chain);
  chain.limit = vi.fn(() => chain);
  chain.maybeSingle = vi.fn(() => Promise.resolve({ data: opts.maybeSingleData ?? null }));
  chain.insert = vi.fn(() => Promise.resolve({ error: opts.insertError ?? null }));
  chain.upsert = vi.fn(() => Promise.resolve({ error: opts.insertError ?? null }));
  return chain;
}

function makeReq(secret?: string): NextRequest {
  const headers: Record<string, string> = {};
  if (secret !== undefined) headers["x-seed-secret"] = secret;
  return new NextRequest("http://localhost/api/seed", { method: "POST", headers });
}

const ORIGINAL_SECRET = process.env.SEED_SECRET;

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(clerkClient).mockResolvedValue({ users: { createUser: mockCreateUser } } as never);
  mockCreateUser.mockResolvedValue({ id: "user_admin_clerk" });
  process.env.SEED_SECRET = "test-seed-secret";
});

describe("POST /api/seed — guarded dev seed", () => {
  it("returns 401 when the secret header is missing", async () => {
    const res = await POST(makeReq());
    expect(res.status).toBe(401);
    expect(mockSupabase.from).not.toHaveBeenCalled();
  });

  it("returns 401 when the secret is wrong", async () => {
    const res = await POST(makeReq("wrong"));
    expect(res.status).toBe(401);
  });

  it("returns 401 when SEED_SECRET is not configured", async () => {
    delete process.env.SEED_SECRET;
    const res = await POST(makeReq("anything"));
    expect(res.status).toBe(401);
    process.env.SEED_SECRET = ORIGINAL_SECRET ?? "test-seed-secret";
  });

  it("seeds event + admin in Clerk and returns a CSPRNG password (not Math.random)", async () => {
    mockSupabase.from.mockReturnValue(makeChain({ maybeSingleData: null }));
    const res = await POST(makeReq("test-seed-secret"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    // base64url password from crypto.randomBytes(12) + "A1" complexity suffix.
    expect(typeof json.admin.password).toBe("string");
    expect(json.admin.password).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(json.admin.password.length).toBeGreaterThanOrEqual(12);
    // The credential is created in Clerk (ADR-017), not hashed locally.
    expect(mockCreateUser).toHaveBeenCalledWith(
      expect.objectContaining({ externalId: "usr_admin", password: json.admin.password }),
    );
  });

  it("is idempotent — does not recreate an existing admin", async () => {
    mockSupabase.from.mockReturnValue(makeChain({ maybeSingleData: { id: "exists" } }));
    const res = await POST(makeReq("test-seed-secret"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.admin).toBe("already exists");
    expect(mockCreateUser).not.toHaveBeenCalled();
  });
});
