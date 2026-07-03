import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockCreateSession, mockGetPrice, mockEnsureCustomer } = vi.hoisted(() => ({
  mockCreateSession: vi.fn(),
  mockGetPrice: vi.fn(),
  mockEnsureCustomer: vi.fn(),
}));

vi.mock("@/lib/stripe", () => ({
  stripe: { checkout: { sessions: { create: mockCreateSession } } },
  STRIPE_APP: "voz",
  LOOKUP_KEYS: { event: "voz_event", pro: "voz_pro_monthly" },
  getPriceByLookupKey: mockGetPrice,
}));

vi.mock("@/lib/api/stripe-customer", () => ({ ensureStripeCustomer: mockEnsureCustomer }));
vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));

import { POST } from "./route";
import { auth } from "@/lib/auth";

beforeEach(() => {
  vi.resetAllMocks();
  mockEnsureCustomer.mockResolvedValue("cus_1");
  mockGetPrice.mockResolvedValue({ id: "price_pro_1" });
  mockCreateSession.mockResolvedValue({ url: "https://checkout.stripe.com/c/pay/cs_pro" });
});

describe("POST /api/v1/stripe/subscription", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    const res = await POST();
    expect(res.status).toBe(401);
    expect(mockCreateSession).not.toHaveBeenCalled();
  });

  it("returns 403 for mediador", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "u1", role: "mediador" } } as never);
    const res = await POST();
    expect(res.status).toBe(403);
    expect(mockCreateSession).not.toHaveBeenCalled();
  });

  it("creates a subscription checkout with voz metadata for an owner", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "usr_owner", role: "owner" } } as never);
    const res = await POST();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.checkoutUrl).toBe("https://checkout.stripe.com/c/pay/cs_pro");

    expect(mockGetPrice).toHaveBeenCalledWith("voz_pro_monthly");
    expect(mockEnsureCustomer).toHaveBeenCalledWith("usr_owner");
    const arg = mockCreateSession.mock.calls[0][0];
    expect(arg.mode).toBe("subscription");
    expect(arg.customer).toBe("cus_1");
    expect(arg.line_items[0].price).toBe("price_pro_1");
    expect(arg.metadata).toEqual({ app: "voz", plan_slug: "pro", user_id: "usr_owner" });
    expect(arg.subscription_data.metadata).toEqual({ app: "voz", plan_slug: "pro", user_id: "usr_owner" });
  });

  it("returns 500 when Stripe fails", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "usr_owner", role: "owner" } } as never);
    mockCreateSession.mockRejectedValue(new Error("stripe down"));
    const res = await POST();
    expect(res.status).toBe(500);
  });
});
