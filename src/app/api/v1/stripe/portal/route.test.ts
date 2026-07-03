import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockCreatePortal } = vi.hoisted(() => ({ mockCreatePortal: vi.fn() }));

vi.mock("@/lib/stripe", () => ({
  stripe: { billingPortal: { sessions: { create: mockCreatePortal } } },
}));

const mockSupabase = { from: vi.fn() };
vi.mock("@/lib/supabase", () => ({ createServerClient: () => mockSupabase }));
vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));

import { POST } from "./route";
import { auth } from "@/lib/auth";

function userChain(data: unknown) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data }),
  };
}

beforeEach(() => {
  vi.resetAllMocks();
  mockCreatePortal.mockResolvedValue({ url: "https://billing.stripe.com/p/session_1" });
});

describe("POST /api/v1/stripe/portal", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    const res = await POST();
    expect(res.status).toBe(401);
  });

  it("returns 409 when the user has no Stripe customer", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "u1", role: "owner" } } as never);
    mockSupabase.from.mockReturnValue(userChain({ stripe_customer_id: null }));
    const res = await POST();
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.error.code).toBe("NO_CUSTOMER");
    expect(mockCreatePortal).not.toHaveBeenCalled();
  });

  it("returns a portal url for a user with a Stripe customer", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "u1", role: "owner" } } as never);
    mockSupabase.from.mockReturnValue(userChain({ stripe_customer_id: "cus_1" }));
    const res = await POST();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.url).toBe("https://billing.stripe.com/p/session_1");
    expect(mockCreatePortal).toHaveBeenCalledWith(
      expect.objectContaining({ customer: "cus_1" }),
    );
  });
});
