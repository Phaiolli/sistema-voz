import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST, GET } from "./route";

const mockSupabase = {
  from: vi.fn(),
  channel: vi.fn(),
};

vi.mock("@/lib/supabase", () => ({
  createServerClient: () => mockSupabase,
}));

const mockEvent = { id: "evt_1", status: "active", config: {} };
const mockQuestion = {
  id: "q_123",
  event_id: "evt_1",
  author_name: "Maria",
  author_contact: "maria@test.com",
  author_ip: "1.1.1.1",
  text: "Uma pergunta de teste que é bem longa o suficiente.",
  status: "pending",
  created_at: new Date().toISOString(),
  presented_at: null,
  answered_at: null,
  hidden_at: null,
  hidden_by: null,
};

const validBody = {
  authorName: "Maria Silva",
  authorContact: "maria@exemplo.com",
  text: "Esta é uma pergunta válida com mais de dez caracteres.",
  lgpdAccepted: true,
};

function makePostRequest(body: unknown) {
  return new NextRequest("http://localhost/api/v1/events/evt_1/questions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeGetRequest(params?: string) {
  return new NextRequest(
    `http://localhost/api/v1/events/evt_1/questions${params ? `?${params}` : ""}`,
  );
}

function makeParams(eventId = "evt_1") {
  return { params: Promise.resolve({ eventId }) };
}

beforeEach(() => {
  vi.resetAllMocks();
});

describe("POST /api/v1/events/[eventId]/questions", () => {
  it("returns 422 for invalid body", async () => {
    const res = await POST(makePostRequest({}), makeParams());
    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json.error.code).toBe("VALIDATION_FAILED");
  });

  it("returns 422 when lgpdAccepted is false", async () => {
    const res = await POST(makePostRequest({ ...validBody, lgpdAccepted: false }), makeParams());
    expect(res.status).toBe(422);
  });

  it("returns 422 when text is too short", async () => {
    const res = await POST(makePostRequest({ ...validBody, text: "curto" }), makeParams());
    expect(res.status).toBe(422);
  });

  it("returns 422 when text is too long", async () => {
    const res = await POST(makePostRequest({ ...validBody, text: "a".repeat(501) }), makeParams());
    expect(res.status).toBe(422);
  });

  it("returns 404 when event not found", async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null }),
    };
    mockSupabase.from.mockReturnValue(chain);

    const res = await POST(makePostRequest(validBody), makeParams());
    expect(res.status).toBe(404);
  });

  it("returns 409 when event has ended", async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { ...mockEvent, status: "ended" } }),
    };
    mockSupabase.from.mockReturnValue(chain);

    const res = await POST(makePostRequest(validBody), makeParams());
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.error.code).toBe("EVENT_ENDED");
  });

  it("returns 429 when rate limit exceeded", async () => {
    // Simulate rate limit: mock the count query to return 10
    const eventChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: mockEvent }),
    };
    // First call returns event, second returns count
    mockSupabase.from
      .mockReturnValueOnce(eventChain)
      .mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              gte: vi.fn().mockResolvedValue({ count: 10, data: [], error: null }),
            }),
          }),
        }),
      });

    const res = await POST(makePostRequest(validBody), makeParams());
    expect(res.status).toBe(429);
    const json = await res.json();
    expect(json.error.code).toBe("RATE_LIMITED");
  });

  it("creates question and returns 201 on valid input", async () => {
    mockSupabase.from
      .mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: mockEvent }),
      })
      .mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              gte: vi.fn().mockResolvedValue({ count: 0, data: [], error: null }),
            }),
          }),
        }),
      })
      .mockReturnValueOnce({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockQuestion, error: null }),
          }),
        }),
      });
    mockSupabase.channel.mockReturnValue({ send: vi.fn().mockResolvedValue({}) });

    const res = await POST(makePostRequest(validBody), makeParams());
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.id).toBe("q_123");
    expect(json.status).toBe("pending");
  });
});

function makeQueryChain(data: unknown[]) {
  // Supabase query builder is thenable — supports chaining + await
  const resolved = Promise.resolve({ data, error: null });
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    then: resolved.then.bind(resolved),
    catch: resolved.catch.bind(resolved),
    finally: resolved.finally.bind(resolved),
  };
  return chain;
}

describe("GET /api/v1/events/[eventId]/questions", () => {
  it("returns questions list", async () => {
    mockSupabase.from.mockReturnValue(makeQueryChain([mockQuestion]));
    const res = await GET(makeGetRequest(), makeParams());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.questions).toHaveLength(1);
  });

  it("filters by status query param", async () => {
    mockSupabase.from.mockReturnValue(makeQueryChain([]));
    const res = await GET(makeGetRequest("status=answered"), makeParams());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.questions).toHaveLength(0);
  });
});
