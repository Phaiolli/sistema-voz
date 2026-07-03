import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getOwnerEventCount,
  isEventOwnedBy,
  getEventQuestionCount,
  getOwnerPlan,
  isOwnerPro,
} from "./plan-limits";

const mockSupabase = { from: vi.fn() };

vi.mock("@/lib/supabase", () => ({ createServerClient: () => mockSupabase }));

function makeCountChain(count: number | null, error: unknown = null) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    then: (resolve: (v: { count: number | null; error: unknown }) => unknown) =>
      Promise.resolve({ count, error }).then(resolve),
  };
}

function makeSingleChain(data: unknown, error: unknown = null) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data, error }),
  };
}

beforeEach(() => vi.resetAllMocks());

describe("isOwnerPro", () => {
  it("returns true for an active subscription", async () => {
    mockSupabase.from.mockReturnValue(makeSingleChain({ subscription_status: "active" }));
    expect(await isOwnerPro("usr_1")).toBe(true);
  });

  it("returns true while trialing", async () => {
    mockSupabase.from.mockReturnValue(makeSingleChain({ subscription_status: "trialing" }));
    expect(await isOwnerPro("usr_1")).toBe(true);
  });

  it("returns false for a canceled subscription", async () => {
    mockSupabase.from.mockReturnValue(makeSingleChain({ subscription_status: "canceled" }));
    expect(await isOwnerPro("usr_1")).toBe(false);
  });

  it("returns false when there is no subscription", async () => {
    mockSupabase.from.mockReturnValue(makeSingleChain({ subscription_status: null }));
    expect(await isOwnerPro("usr_1")).toBe(false);
  });
});

describe("getOwnerEventCount", () => {
  it("returns 0 when owner has no events", async () => {
    mockSupabase.from.mockReturnValue(makeCountChain(0));
    const result = await getOwnerEventCount("usr_1");
    expect(result).toBe(0);
  });

  it("returns 0 when count is null", async () => {
    mockSupabase.from.mockReturnValue(makeCountChain(null));
    const result = await getOwnerEventCount("usr_1");
    expect(result).toBe(0);
  });

  it("returns N when owner has N events", async () => {
    mockSupabase.from.mockReturnValue(makeCountChain(3));
    const result = await getOwnerEventCount("usr_1");
    expect(result).toBe(3);
  });

  it("throws when supabase returns an error", async () => {
    mockSupabase.from.mockReturnValue(makeCountChain(null, { message: "db error" }));
    await expect(getOwnerEventCount("usr_1")).rejects.toMatchObject({ message: "db error" });
  });
});

describe("isEventOwnedBy", () => {
  it("returns true when organizer_id matches", async () => {
    mockSupabase.from.mockReturnValue(makeSingleChain({ id: "evt_1" }));
    const result = await isEventOwnedBy("evt_1", "usr_1");
    expect(result).toBe(true);
  });

  it("returns false when organizer_id does not match (no row found)", async () => {
    mockSupabase.from.mockReturnValue(makeSingleChain(null));
    const result = await isEventOwnedBy("evt_1", "usr_other");
    expect(result).toBe(false);
  });

  it("throws when supabase returns an error", async () => {
    mockSupabase.from.mockReturnValue(makeSingleChain(null, { message: "db error" }));
    await expect(isEventOwnedBy("evt_1", "usr_1")).rejects.toMatchObject({ message: "db error" });
  });
});

describe("getEventQuestionCount", () => {
  it("returns correct count for an event", async () => {
    mockSupabase.from.mockReturnValue(makeCountChain(7));
    const result = await getEventQuestionCount("evt_1");
    expect(result).toBe(7);
  });

  it("returns 0 when count is null", async () => {
    mockSupabase.from.mockReturnValue(makeCountChain(null));
    const result = await getEventQuestionCount("evt_1");
    expect(result).toBe(0);
  });

  it("throws when supabase returns an error", async () => {
    mockSupabase.from.mockReturnValue(makeCountChain(null, { message: "db error" }));
    await expect(getEventQuestionCount("evt_1")).rejects.toMatchObject({ message: "db error" });
  });
});

describe("getOwnerPlan", () => {
  it("returns 'free' when user has no plan column (null data)", async () => {
    mockSupabase.from.mockReturnValue(makeSingleChain(null));
    const result = await getOwnerPlan("usr_1");
    expect(result).toBe("free");
  });

  it("returns 'free' when plan column is not 'paid'", async () => {
    mockSupabase.from.mockReturnValue(makeSingleChain({ plan: null }));
    const result = await getOwnerPlan("usr_1");
    expect(result).toBe("free");
  });

  it("returns 'paid' when plan column equals 'paid'", async () => {
    mockSupabase.from.mockReturnValue(makeSingleChain({ plan: "paid" }));
    const result = await getOwnerPlan("usr_1");
    expect(result).toBe("paid");
  });

  it("throws when supabase returns an error", async () => {
    mockSupabase.from.mockReturnValue(makeSingleChain(null, { message: "db error" }));
    await expect(getOwnerPlan("usr_1")).rejects.toMatchObject({ message: "db error" });
  });
});
