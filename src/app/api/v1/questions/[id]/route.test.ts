import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { PATCH } from "./route";

const mockSupabase = {
  from: vi.fn(),
  channel: vi.fn(),
};

vi.mock("@/lib/supabase", () => ({
  createServerClient: () => mockSupabase,
}));

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

import { auth } from "@/lib/auth";

const mockQuestion = {
  id: "q_123",
  event_id: "evt_1",
  author_name: "Test",
  author_contact: "test@test.com",
  author_ip: "1.2.3.4",
  text: "Uma pergunta de teste válida.",
  status: "pending",
  created_at: new Date().toISOString(),
  presented_at: null,
  answered_at: null,
  hidden_at: null,
  hidden_by: null,
};

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/v1/questions/q_123", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeParams(id = "q_123") {
  return { params: Promise.resolve({ id }) };
}

beforeEach(() => {
  vi.resetAllMocks();
});

describe("PATCH /api/v1/questions/[id]", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    // The question is resolved (404-before-auth ordering) before the guard runs.
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: mockQuestion }),
    });
    const res = await PATCH(makeRequest({ action: "setNext" }), makeParams());
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error.code).toBe("UNAUTHORIZED");
  });

  it("returns 403 when authenticated without mediador/admin role", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "u1", role: "viewer" } } as never);
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: mockQuestion }),
    });
    const res = await PATCH(makeRequest({ action: "setNext" }), makeParams());
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error.code).toBe("FORBIDDEN");
  });

  it("returns 422 when action is invalid", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { role: "mediador" } } as never);
    const res = await PATCH(makeRequest({ action: "invalidAction" }), makeParams());
    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json.error.code).toBe("VALIDATION_FAILED");
  });

  it("returns 422 when body is null", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { role: "mediador" } } as never);
    const req = new NextRequest("http://localhost/api/v1/questions/q_123", {
      method: "PATCH",
      body: "not json",
    });
    const res = await PATCH(req, makeParams());
    expect(res.status).toBe(422);
  });

  it("returns 404 when question not found", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { role: "mediador" } } as never);
    const chainMock = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null }),
    };
    mockSupabase.from.mockReturnValue(chainMock);

    const res = await PATCH(makeRequest({ action: "setNext" }), makeParams());
    expect(res.status).toBe(404);
  });

  it("allows mediador to update question status", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { role: "mediador" } } as never);

    const selectChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { ...mockQuestion, status: "next" }, error: null }),
      maybeSingle: vi.fn().mockResolvedValue({ data: mockQuestion }),
    };
    mockSupabase.from.mockReturnValue(selectChain);
    mockSupabase.channel.mockReturnValue({ send: vi.fn().mockResolvedValue({}) });

    const res = await PATCH(makeRequest({ action: "markAnswered" }), makeParams());
    expect(res.status).toBe(200);
  });

  it("allows admin to update question status", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { role: "admin" } } as never);

    const selectChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { ...mockQuestion, status: "hidden" }, error: null }),
      maybeSingle: vi.fn().mockResolvedValue({ data: mockQuestion }),
    };
    mockSupabase.from.mockReturnValue(selectChain);
    mockSupabase.channel.mockReturnValue({ send: vi.fn().mockResolvedValue({}) });

    const res = await PATCH(makeRequest({ action: "hide" }), makeParams());
    expect(res.status).toBe(200);
  });

  it("setNext clears previous next question before setting new one", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { role: "mediador" } } as never);

    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { ...mockQuestion, status: "next" }, error: null }),
      maybeSingle: vi.fn().mockResolvedValue({ data: mockQuestion }),
    };
    mockSupabase.from.mockReturnValue(chain);
    mockSupabase.channel.mockReturnValue({ send: vi.fn().mockResolvedValue({}) });

    const res = await PATCH(makeRequest({ action: "setNext" }), makeParams());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe("next");
  });

  it("restore sets question status back to pending", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { role: "mediador" } } as never);

    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { ...mockQuestion, status: "pending" }, error: null }),
      maybeSingle: vi.fn().mockResolvedValue({ data: { ...mockQuestion, status: "hidden" } }),
    };
    mockSupabase.from.mockReturnValue(chain);
    mockSupabase.channel.mockReturnValue({ send: vi.fn().mockResolvedValue({}) });

    const res = await PATCH(makeRequest({ action: "restore" }), makeParams());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe("pending");
  });
});
