import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "./route";

const mockSupabase = { from: vi.fn() };

vi.mock("@/lib/supabase", () => ({ createServerClient: () => mockSupabase }));
vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("bcryptjs", () => ({ default: { hash: vi.fn().mockResolvedValue("hashed_pw") } }));

import { auth } from "@/lib/auth";

const mockUserRow = {
  id: "usr_1", name: "Mediador X", email: "med@exemplo.com",
  role: "mediador", created_at: new Date().toISOString(), last_seen_at: null,
};

function makeChain(listData?: unknown, singleData?: unknown) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: singleData ?? null }),
    single: vi.fn().mockResolvedValue({ data: singleData ?? null, error: null }),
    then: (resolve: (v: { data: unknown; error: unknown }) => unknown) =>
      Promise.resolve({ data: listData ?? [], error: null }).then(resolve),
  };
}

beforeEach(() => vi.resetAllMocks());

describe("GET /api/v1/users", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    const res = await GET(new NextRequest("http://localhost/api/v1/users"));
    expect(res.status).toBe(401);
  });

  it("returns 403 for mediador", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { role: "mediador" } } as never);
    const res = await GET(new NextRequest("http://localhost/api/v1/users"));
    expect(res.status).toBe(403);
  });

  it("returns user list for admin without passwordHash", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { role: "admin" } } as never);
    mockSupabase.from.mockReturnValue(makeChain([mockUserRow]));
    const res = await GET(new NextRequest("http://localhost/api/v1/users"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.users).toHaveLength(1);
    expect(json.users[0]).not.toHaveProperty("passwordHash");
    expect(json.users[0]).not.toHaveProperty("password_hash");
  });

  it("filters by role when ?role=mediador", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { role: "admin" } } as never);
    const chain = makeChain([mockUserRow]);
    mockSupabase.from.mockReturnValue(chain);
    const res = await GET(new NextRequest("http://localhost/api/v1/users?role=mediador"));
    expect(res.status).toBe(200);
    expect(chain.eq).toHaveBeenCalledWith("role", "mediador");
  });

  // SW3 — superadmin is a superset of admin.
  it("returns user list for superadmin", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "su", role: "superadmin" } } as never);
    mockSupabase.from.mockReturnValue(makeChain([mockUserRow]));
    const res = await GET(new NextRequest("http://localhost/api/v1/users"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.users).toHaveLength(1);
  });
});

describe("POST /api/v1/users", () => {
  const validBody = {
    name: "Novo Mediador",
    email: "novo@exemplo.com",
    password: "Senha123",
    role: "mediador",
  };

  function makeReq(body: unknown) {
    return new NextRequest("http://localhost/api/v1/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  it("returns 401 when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    const res = await POST(makeReq(validBody));
    expect(res.status).toBe(401);
  });

  it("returns 422 for weak password", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { role: "admin" } } as never);
    const res = await POST(makeReq({ ...validBody, password: "fraca" }));
    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json.error.code).toBe("VALIDATION_FAILED");
  });

  it("returns 422 when body is not valid JSON", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { role: "admin" } } as never);
    const req = new NextRequest("http://localhost/api/v1/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not-json{{",
    });
    const res = await POST(req);
    expect(res.status).toBe(422);
  });

  it("returns 409 for duplicate email", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { role: "admin" } } as never);
    const chain = makeChain(undefined, { id: "usr_existing" });
    mockSupabase.from.mockReturnValue(chain);
    const res = await POST(makeReq(validBody));
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.error.code).toBe("CONFLICT");
  });

  it("creates user and returns 201 without passwordHash", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { role: "admin" } } as never);
    const chain = makeChain(undefined, mockUserRow);
    chain.maybeSingle.mockResolvedValueOnce({ data: null });
    mockSupabase.from.mockReturnValue(chain);
    const res = await POST(makeReq(validBody));
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json).not.toHaveProperty("passwordHash");
    expect(json).not.toHaveProperty("password_hash");
  });

  // SW3 — superadmin is a superset of admin and may create users.
  it("allows superadmin to create a user (201)", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "su", role: "superadmin" } } as never);
    const chain = makeChain(undefined, mockUserRow);
    chain.maybeSingle.mockResolvedValueOnce({ data: null });
    mockSupabase.from.mockReturnValue(chain);
    const res = await POST(makeReq(validBody));
    expect(res.status).toBe(201);
  });

  // SW3 — privilege-escalation guard: the superadmin role can NEVER be
  // assigned through the API, even by a superadmin caller. The schema must
  // reject it (422) before any DB write occurs.
  it("returns 422 when role=superadmin is requested (escalation blocked)", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "su", role: "superadmin" } } as never);
    const chain = makeChain(undefined, mockUserRow);
    mockSupabase.from.mockReturnValue(chain);
    const res = await POST(makeReq({ ...validBody, role: "superadmin" }));
    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json.error.code).toBe("VALIDATION_FAILED");
    // No user row may be inserted when validation fails.
    expect(chain.insert).not.toHaveBeenCalled();
  });

  it("returns 422 when an admin attempts to assign role=superadmin", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "a", role: "admin" } } as never);
    const chain = makeChain(undefined, mockUserRow);
    mockSupabase.from.mockReturnValue(chain);
    const res = await POST(makeReq({ ...validBody, role: "superadmin" }));
    expect(res.status).toBe(422);
    expect(chain.insert).not.toHaveBeenCalled();
  });
});
