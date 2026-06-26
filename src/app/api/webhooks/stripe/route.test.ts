import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// vi.hoisted runs before module mocks are applied, so the ref is available
// inside the vi.mock factory (which is hoisted to the top of the file).
const { mockConstructEvent } = vi.hoisted(() => ({
  mockConstructEvent: vi.fn(),
}));

// Must mock stripe before importing the route — the stripe module throws
// at load time if STRIPE_SECRET_KEY is not set.
vi.mock("@/lib/stripe", () => ({
  stripe: { webhooks: { constructEvent: mockConstructEvent } },
  STRIPE_EVENT_PRICE_CENTS: 5990,
  STRIPE_CURRENCY: "brl",
}));

const mockSupabase = { from: vi.fn() };
vi.mock("@/lib/supabase", () => ({ createServerClient: () => mockSupabase }));

import { POST } from "./route";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRequest(body = "", sig = "valid-sig") {
  return new NextRequest("http://localhost/api/webhooks/stripe", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "stripe-signature": sig,
    },
    body,
  });
}

const validEventData = JSON.stringify({
  name: "Evento Pago",
  slug: "evento-pago",
  startsAt: "2025-09-01T10:00",
  endsAt: "2025-09-01T18:00",
  place: "Auditório",
});

function makeStripeEvent(overrides: Record<string, unknown> = {}) {
  return {
    type: "checkout.session.completed",
    id: "evt_stripe_1",
    data: {
      object: {
        id: "cs_test_123",
        payment_intent: "pi_test_abc",
        metadata: {
          ownerId: "usr_owner",
          eventData: validEventData,
        },
        ...overrides,
      },
    },
  };
}

function makeInsertChain(error: unknown = null) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: null }),
    insert: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    then: (resolve: (v: { data: unknown; error: unknown }) => unknown) =>
      Promise.resolve({ data: null, error }).then(resolve),
  };
}

beforeEach(() => vi.resetAllMocks());

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("POST /api/webhooks/stripe", () => {
  it("returns 400 when stripe-signature header is missing", async () => {
    const req = new NextRequest("http://localhost/api/webhooks/stripe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/missing stripe-signature/i);
  });

  it("returns 400 when stripe signature is invalid", async () => {
    mockConstructEvent.mockImplementation(() => {
      throw new Error("No signatures found matching the expected signature");
    });
    const res = await POST(makeRequest("{}", "bad-sig"));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/invalid signature/i);
  });

  it("returns 200 for unhandled event types without side effects", async () => {
    mockConstructEvent.mockReturnValue({ type: "payment_intent.created", id: "evt_x", data: { object: {} } });
    const res = await POST(makeRequest("{}"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.received).toBe(true);
    expect(mockSupabase.from).not.toHaveBeenCalled();
  });

  it("returns 200 and creates event + updates payment on checkout.session.completed", async () => {
    mockConstructEvent.mockReturnValue(makeStripeEvent());

    const chain = makeInsertChain();
    // First call: idempotency check → not paid yet
    chain.maybeSingle.mockResolvedValueOnce({ data: null });
    mockSupabase.from.mockReturnValue(chain);

    const res = await POST(makeRequest("{}"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.received).toBe(true);

    // events upsert (is_paid: true), event_payments update and users plan update
    expect(mockSupabase.from).toHaveBeenCalledWith("event_payments");
    expect(mockSupabase.from).toHaveBeenCalledWith("events");
    expect(mockSupabase.from).toHaveBeenCalledWith("users");

    // The created event must be flagged as paid (per-event billing).
    expect(chain.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ is_paid: true }),
      expect.objectContaining({ onConflict: "id" }),
    );
    // The owner is marked as a paying customer.
    expect(chain.update).toHaveBeenCalledWith(expect.objectContaining({ plan: "paid" }));
  });

  it("returns 500 when event_payments update fails (so Stripe retries)", async () => {
    mockConstructEvent.mockReturnValue(makeStripeEvent());

    // Idempotency check OK; events upsert OK; event_payments update fails.
    const okChain = makeInsertChain();
    okChain.maybeSingle.mockResolvedValueOnce({ data: null });
    const failChain = makeInsertChain({ message: "update failed" });
    mockSupabase.from.mockImplementation((table: string) =>
      table === "event_payments" ? failChain : okChain,
    );

    const res = await POST(makeRequest("{}"));
    expect(res.status).toBe(500);
  });

  it("returns 200 without duplicating (idempotency) when session already paid", async () => {
    mockConstructEvent.mockReturnValue(makeStripeEvent());

    const chain = makeInsertChain();
    // Idempotency check: session already exists with status = "paid"
    chain.maybeSingle.mockResolvedValueOnce({ data: { id: "pmt_1", status: "paid" } });
    mockSupabase.from.mockReturnValue(chain);

    const res = await POST(makeRequest("{}"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.received).toBe(true);

    // Should NOT call events insert after idempotency short-circuit
    const calls = mockSupabase.from.mock.calls.map((c: string[]) => c[0]);
    expect(calls).not.toContain("events");
  });

  it("converges idempotently on redelivery: same deterministic event id, no re-mint", async () => {
    mockConstructEvent.mockReturnValue(makeStripeEvent());

    // First delivery: idempotency check OK; events upsert OK; payment update fails → 500.
    const firstOk = makeInsertChain();
    firstOk.maybeSingle.mockResolvedValueOnce({ data: null });
    const firstFail = makeInsertChain({ message: "update failed" });
    mockSupabase.from.mockImplementation((table: string) =>
      table === "event_payments" ? firstFail : firstOk,
    );
    const firstRes = await POST(makeRequest("{}"));
    expect(firstRes.status).toBe(500);
    const firstUpsertId = (firstOk.upsert.mock.calls[0]?.[0] as { id: string }).id;

    // Redelivery: payment row still pending with event_id null (update never landed).
    vi.resetAllMocks();
    mockConstructEvent.mockReturnValue(makeStripeEvent());
    const secondOk = makeInsertChain();
    secondOk.maybeSingle.mockResolvedValueOnce({
      data: { id: "pmt_1", status: "pending", event_id: null },
    });
    mockSupabase.from.mockReturnValue(secondOk);
    const secondRes = await POST(makeRequest("{}"));
    expect(secondRes.status).toBe(200);
    const secondUpsertId = (secondOk.upsert.mock.calls[0]?.[0] as { id: string }).id;

    // Same deterministic id across attempts → upsert onConflict:id is idempotent,
    // no new UUID minted, no slug collision (poison message avoided).
    expect(secondUpsertId).toBe(firstUpsertId);
  });

  it("reapplies plan='paid' on redelivery of an already-paid session (W1)", async () => {
    mockConstructEvent.mockReturnValue(makeStripeEvent());

    const chain = makeInsertChain();
    chain.maybeSingle.mockResolvedValueOnce({
      data: { id: "pmt_1", status: "paid", event_id: "evt_existing" },
    });
    mockSupabase.from.mockReturnValue(chain);

    const res = await POST(makeRequest("{}"));
    expect(res.status).toBe(200);

    // The owner plan is reapplied even though the payment was already marked paid.
    expect(mockSupabase.from).toHaveBeenCalledWith("users");
    expect(chain.update).toHaveBeenCalledWith(expect.objectContaining({ plan: "paid" }));
    // No event creation on the idempotent path.
    const calls = mockSupabase.from.mock.calls.map((c: string[]) => c[0]);
    expect(calls).not.toContain("events");
  });

  it("returns 500 when reapplying plan fails on an already-paid redelivery", async () => {
    mockConstructEvent.mockReturnValue(makeStripeEvent());

    const chain = makeInsertChain({ message: "plan update failed" });
    chain.maybeSingle.mockResolvedValueOnce({
      data: { id: "pmt_1", status: "paid", event_id: "evt_existing" },
    });
    mockSupabase.from.mockReturnValue(chain);

    const res = await POST(makeRequest("{}"));
    expect(res.status).toBe(500);
  });

  it("returns 400 when metadata is incomplete (missing ownerId)", async () => {
    mockConstructEvent.mockReturnValue(
      makeStripeEvent({ metadata: { eventData: validEventData } }),
    );

    const chain = makeInsertChain();
    chain.maybeSingle.mockResolvedValueOnce({ data: null });
    mockSupabase.from.mockReturnValue(chain);

    const res = await POST(makeRequest("{}"));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/metadata/i);
  });
});
