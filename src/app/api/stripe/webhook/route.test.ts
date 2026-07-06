import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockConstructEvent } = vi.hoisted(() => ({
  mockConstructEvent: vi.fn(),
}));

vi.mock("@/lib/stripe", () => ({
  stripe: { webhooks: { constructEvent: mockConstructEvent } },
  STRIPE_APP: "voz",
}));

const mockSupabase = { from: vi.fn() };
vi.mock("@/lib/supabase", () => ({ createServerClient: () => mockSupabase }));

const {
  mockSendReceipt,
  mockSendCanceled,
  mockSendFailed,
  mockSendEventReceipt,
} = vi.hoisted(() => ({
  mockSendReceipt: vi.fn(),
  mockSendCanceled: vi.fn(),
  mockSendFailed: vi.fn(),
  mockSendEventReceipt: vi.fn(),
}));
vi.mock("@/lib/email", () => ({
  sendSubscriptionReceiptEmail: mockSendReceipt,
  sendSubscriptionCanceledEmail: mockSendCanceled,
  sendPaymentFailedEmail: mockSendFailed,
  sendEventPurchaseReceiptEmail: mockSendEventReceipt,
}));

import { POST } from "./route";

function makeReq(body = "{}"): NextRequest {
  return new NextRequest("http://localhost/api/stripe/webhook", {
    method: "POST",
    headers: { "stripe-signature": "sig_test" },
    body,
  });
}

/**
 * users.update(...).eq(...) → resolves { error }; captures the update payload.
 * Also supports the invoice.paid receipt lookup:
 * users.select(...).eq(...).maybeSingle() → resolves { data: owner }.
 */
function usersUpdateChain(error: unknown = null, owner: unknown = null) {
  const update = vi
    .fn()
    .mockReturnValue({ eq: vi.fn().mockResolvedValue({ error }) });
  const select = vi.fn().mockReturnValue({
    eq: vi.fn().mockReturnValue({
      maybeSingle: vi.fn().mockResolvedValue({ data: owner }),
    }),
  });
  return { chain: { update, select }, update };
}

const validEventData = {
  name: "Evento Sintetico",
  slug: "evento-sintetico",
  startsAt: "2030-07-01T10:00",
  endsAt: "2030-07-01T16:00",
  place: "Local Fictício",
};

beforeEach(() => {
  vi.resetAllMocks();
});

describe("POST /api/stripe/webhook — signature & app guard", () => {
  it("returns 400 when the signature header is missing", async () => {
    const req = new NextRequest("http://localhost/api/stripe/webhook", {
      method: "POST",
      body: "{}",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 on invalid signature", async () => {
    mockConstructEvent.mockImplementation(() => {
      throw new Error("bad sig");
    });
    const res = await POST(makeReq());
    expect(res.status).toBe(400);
  });

  it("ignores objects tagged for another app (metadata.app !== voz)", async () => {
    mockConstructEvent.mockReturnValue({
      type: "customer.subscription.updated",
      data: { object: { id: "sub_x", metadata: { app: "other" } } },
    });
    const res = await POST(makeReq());
    expect(res.status).toBe(200);
    expect(mockSupabase.from).not.toHaveBeenCalled();
  });
});

describe("POST /api/stripe/webhook — subscription lifecycle", () => {
  it("customer.subscription.updated mirrors status/period onto the user", async () => {
    const { chain, update } = usersUpdateChain();
    mockSupabase.from.mockReturnValue(chain);
    mockConstructEvent.mockReturnValue({
      type: "customer.subscription.updated",
      data: {
        object: {
          id: "sub_1",
          status: "active",
          customer: "cus_1",
          items: { data: [{ current_period_end: 1893456000 }] },
          metadata: { app: "voz", user_id: "usr_1" },
        },
      },
    });
    const res = await POST(makeReq());
    expect(res.status).toBe(200);
    expect(mockSupabase.from).toHaveBeenCalledWith("users");
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        subscription_status: "active",
        stripe_subscription_id: "sub_1",
      }),
    );
  });

  it("customer.subscription.deleted downgrades and sends a cancellation notice", async () => {
    const { chain, update } = usersUpdateChain(null, {
      email: "ana@example.com",
      name: "Ana",
    });
    mockSupabase.from.mockReturnValue(chain);
    mockConstructEvent.mockReturnValue({
      type: "customer.subscription.deleted",
      data: {
        object: {
          id: "sub_1",
          status: "canceled",
          customer: "cus_1",
          items: { data: [{ current_period_end: 1893456000 }] },
          metadata: { app: "voz" },
        },
      },
    });
    const res = await POST(makeReq());
    expect(res.status).toBe(200);
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ subscription_status: "canceled" }),
    );
    expect(mockSendCanceled).toHaveBeenCalledWith("ana@example.com", "Ana");
  });

  it("invoice.paid marks the subscription active and sends a receipt", async () => {
    const { chain, update } = usersUpdateChain(null, {
      email: "ana@example.com",
      name: "Ana",
    });
    mockSupabase.from.mockReturnValue(chain);
    mockConstructEvent.mockReturnValue({
      type: "invoice.paid",
      data: {
        object: {
          id: "in_1",
          customer: "cus_1",
          lines: { data: [{ period: { end: 1893456000 } }] },
          metadata: {},
        },
      },
    });
    const res = await POST(makeReq());
    expect(res.status).toBe(200);
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ subscription_status: "active" }),
    );
    expect(mockSendReceipt).toHaveBeenCalledWith("ana@example.com", "Ana");
  });

  it("invoice.payment_failed marks past_due and sends a dunning notice", async () => {
    const { chain, update } = usersUpdateChain(null, {
      email: "ana@example.com",
      name: "Ana",
    });
    mockSupabase.from.mockReturnValue(chain);
    mockConstructEvent.mockReturnValue({
      type: "invoice.payment_failed",
      data: {
        object: {
          id: "in_2",
          customer: "cus_1",
          lines: { data: [] },
          metadata: {},
        },
      },
    });
    const res = await POST(makeReq());
    expect(res.status).toBe(200);
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ subscription_status: "past_due" }),
    );
    expect(mockSendFailed).toHaveBeenCalledWith("ana@example.com", "Ana");
    expect(mockSendReceipt).not.toHaveBeenCalled();
  });
});

describe("POST /api/stripe/webhook — checkout completed", () => {
  it("skips the per-event flow for a subscription-mode checkout", async () => {
    mockConstructEvent.mockReturnValue({
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_2",
          mode: "subscription",
          metadata: { app: "voz", plan_slug: "pro", user_id: "usr_1" },
        },
      },
    });
    const res = await POST(makeReq());
    expect(res.status).toBe(200);
    // No per-event DB work for subscriptions.
    expect(mockSupabase.from).not.toHaveBeenCalled();
  });

  it("ignores a payment checkout from another project (no app=voz tag)", async () => {
    // Shared account: another project's payment event, no voz metadata.
    mockConstructEvent.mockReturnValue({
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_other",
          mode: "payment",
          metadata: { plan_slug: "something" },
        },
      },
    });
    const res = await POST(makeReq());
    expect(res.status).toBe(200);
    expect(mockSupabase.from).not.toHaveBeenCalled();
  });

  it("finalizes a paid event: creates the event and marks the payment paid", async () => {
    // Sequence of from() calls in handleEventCheckout.
    const paymentsSelect = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null }),
    };
    const eventsUpsert = { upsert: vi.fn().mockResolvedValue({ error: null }) };
    const paymentsUpdate = {
      update: vi
        .fn()
        .mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
    };
    const usersUpdate = usersUpdateChain(null, {
      email: "ana@example.com",
      name: "Ana",
    });
    mockSupabase.from
      .mockReturnValueOnce(paymentsSelect) // event_payments select
      .mockReturnValueOnce(eventsUpsert) // events upsert
      .mockReturnValueOnce(paymentsUpdate) // event_payments update
      .mockReturnValueOnce(usersUpdate.chain) // users update plan=paid
      .mockReturnValue(usersUpdate.chain); // fetchOwnerContact → owner for receipt

    mockConstructEvent.mockReturnValue({
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_1",
          mode: "payment",
          payment_intent: "pi_1",
          metadata: {
            app: "voz",
            plan_slug: "event",
            ownerId: "usr_1",
            eventData: JSON.stringify(validEventData),
          },
        },
      },
    });

    const res = await POST(makeReq());
    expect(res.status).toBe(200);
    expect(eventsUpsert.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ is_paid: true, organizer_id: "usr_1" }),
      { onConflict: "id" },
    );
    expect(usersUpdate.update).toHaveBeenCalledWith({ plan: "paid" });
    expect(mockSendEventReceipt).toHaveBeenCalledWith(
      "ana@example.com",
      "Ana",
      validEventData.name,
    );
  });

  it("is idempotent: a redelivery for an already-paid session only reapplies plan", async () => {
    const paymentsSelect = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { id: "pay_1", status: "paid", event_id: "evt_1" },
      }),
    };
    const usersUpdate = usersUpdateChain();
    mockSupabase.from
      .mockReturnValueOnce(paymentsSelect)
      .mockReturnValueOnce(usersUpdate.chain);

    mockConstructEvent.mockReturnValue({
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_1",
          mode: "payment",
          metadata: {
            app: "voz",
            plan_slug: "event",
            ownerId: "usr_1",
            eventData: JSON.stringify(validEventData),
          },
        },
      },
    });

    const res = await POST(makeReq());
    expect(res.status).toBe(200);
    expect(usersUpdate.update).toHaveBeenCalledWith({ plan: "paid" });
  });
});
