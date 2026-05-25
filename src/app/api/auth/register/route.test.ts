import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";

const mockSupabase = { from: vi.fn() };

vi.mock("@/lib/supabase", () => ({ createServerClient: () => mockSupabase }));
vi.mock("bcryptjs", () => ({
  default: { hash: vi.fn().mockResolvedValue("hashed_pw") },
}));

function makeChain(singleData: unknown = null, insertError: unknown = null) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: singleData }),
    insert: vi.fn().mockReturnThis(),
    then: (resolve: (v: { data: unknown; error: unknown }) => unknown) =>
      Promise.resolve({ data: null, error: insertError }).then(resolve),
  };
}

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const validBody = {
  name: "João Silva",
  email: "joao@exemplo.com",
  password: "Senha123",
  lgpdAccepted: true,
};

beforeEach(() => vi.resetAllMocks());

describe("POST /api/auth/register", () => {
  it("returns 201 with valid data and new email", async () => {
    const chain = makeChain(null);
    mockSupabase.from.mockReturnValue(chain);
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.message).toMatch(/conta criada/i);
  });

  it("returns 201 (silent dedup) when email already exists", async () => {
    const chain = makeChain({ id: "usr_existing" });
    mockSupabase.from.mockReturnValue(chain);
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.message).toMatch(/conta criada/i);
  });

  it("returns 422 when password has no uppercase letter", async () => {
    const res = await POST(makeRequest({ ...validBody, password: "senha123" }));
    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json.errors).toBeDefined();
  });

  it("returns 422 when password is shorter than 8 chars", async () => {
    const res = await POST(makeRequest({ ...validBody, password: "Ab1" }));
    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json.errors).toBeDefined();
  });

  it("returns 422 when lgpdAccepted is false", async () => {
    const res = await POST(makeRequest({ ...validBody, lgpdAccepted: false }));
    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json.errors).toBeDefined();
  });

  it("returns 422 when email is invalid", async () => {
    const res = await POST(makeRequest({ ...validBody, email: "not-an-email" }));
    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json.errors).toBeDefined();
  });

  it("returns 400 when request body is not valid JSON", async () => {
    const req = new NextRequest("http://localhost/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not-json{{",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
