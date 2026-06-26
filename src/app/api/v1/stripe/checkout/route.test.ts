import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// vi.hoisted so the ref is available inside the hoisted vi.mock factory.
// The stripe module throws at load time without STRIPE_SECRET_KEY, so we must
// mock it before importing the route.
const { mockCreateSession } = vi.hoisted(() => ({
  mockCreateSession: vi.fn(),
}));

vi.mock("@/lib/stripe", () => ({
  stripe: { checkout: { sessions: { create: mockCreateSession } } },
  STRIPE_EVENT_PRICE_CENTS: 5990,
  STRIPE_CURRENCY: "brl",
}));

const mockInsert = vi.fn();
const mockSupabase = { from: vi.fn(() => ({ insert: mockInsert })) };
vi.mock("@/lib/supabase", () => ({ createServerClient: () => mockSupabase }));
vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));

import { POST } from "./route";
import { auth } from "@/lib/auth";

// Synthetic, non-PII event payload satisfying createEventSchema.
const validEventData = {
  name: "Evento Sintetico",
  slug: "evento-sintetico",
  startsAt: "2030-07-01T10:00",
  endsAt: "2030-07-01T16:00",
  place: "Local Fictício",
};

function makeRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/v1/stripe/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.resetAllMocks();
  mockSupabase.from.mockReturnValue({ insert: mockInsert });
  mockInsert.mockResolvedValue({ error: null });
  mockCreateSession.mockResolvedValue({
    id: "cs_test_123",
    url: "https://checkout.stripe.com/c/pay/cs_test_123",
  });
});

describe("POST /api/v1/stripe/checkout", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    const res = await POST(makeRequest({ eventData: validEventData }));
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error.code).toBe("UNAUTHORIZED");
    expect(mockCreateSession).not.toHaveBeenCalled();
  });

  it("returns 403 when role is mediador", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "u1", role: "mediador" } } as never);
    const res = await POST(makeRequest({ eventData: validEventData }));
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error.code).toBe("FORBIDDEN");
    expect(mockCreateSession).not.toHaveBeenCalled();
  });

  it("allows superadmin (superset of admin) to create a checkout", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "u1", role: "superadmin" } } as never);
    const res = await POST(makeRequest({ eventData: validEventData }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.checkoutUrl).toBe("https://checkout.stripe.com/c/pay/cs_test_123");
  });

  it("returns 422 when eventData is invalid", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "u1", role: "owner" } } as never);
    const res = await POST(makeRequest({ eventData: { name: "X" } }));
    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json.error.code).toBe("VALIDATION_FAILED");
    expect(mockCreateSession).not.toHaveBeenCalled();
  });

  it("returns 422 when body is not valid JSON", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "u1", role: "owner" } } as never);
    const req = new NextRequest("http://localhost/api/v1/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not-json{{",
    });
    const res = await POST(req);
    expect(res.status).toBe(422);
  });

  it("returns 422 when eventData key is missing entirely", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "u1", role: "owner" } } as never);
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(422);
  });

  it("happy path (owner): creates Stripe session and inserts pending payment", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "usr_owner", role: "owner" } } as never);
    const res = await POST(makeRequest({ eventData: validEventData }));

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.checkoutUrl).toBe("https://checkout.stripe.com/c/pay/cs_test_123");

    // Stripe session created with the right amount/currency and owner metadata.
    expect(mockCreateSession).toHaveBeenCalledTimes(1);
    const sessionArg = mockCreateSession.mock.calls[0][0];
    expect(sessionArg.mode).toBe("payment");
    expect(sessionArg.line_items[0].price_data.unit_amount).toBe(5990);
    expect(sessionArg.line_items[0].price_data.currency).toBe("brl");
    expect(sessionArg.metadata.ownerId).toBe("usr_owner");

    // event_payments insert with status pending.
    expect(mockSupabase.from).toHaveBeenCalledWith("event_payments");
    expect(mockInsert).toHaveBeenCalledTimes(1);
    const inserted = mockInsert.mock.calls[0][0];
    expect(inserted.status).toBe("pending");
    expect(inserted.owner_id).toBe("usr_owner");
    expect(inserted.stripe_session_id).toBe("cs_test_123");
    expect(inserted.amount).toBe(5990);
  });

  it("happy path (admin): also allowed to create a checkout session", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "usr_admin", role: "admin" } } as never);
    const res = await POST(makeRequest({ eventData: validEventData }));
    expect(res.status).toBe(200);
    expect(mockCreateSession).toHaveBeenCalledTimes(1);
  });

  // SW1 — if the pending payment row cannot be persisted, the checkout must
  // fail with 500 rather than returning a checkout URL for an untracked
  // session (which would never flip the event to is_paid via the webhook).
  it("returns 500 when the event_payments insert fails", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "usr_owner", role: "owner" } } as never);
    mockInsert.mockResolvedValue({ error: { message: "insert failed" } });
    const res = await POST(makeRequest({ eventData: validEventData }));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error.code).toBe("INTERNAL_ERROR");
    // No checkout URL is leaked on failure.
    expect(json).not.toHaveProperty("checkoutUrl");
  });
});
