import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { PATCH } from "./route";

const mockSend = vi.fn();
const mockChannel = vi.fn();
const mockSupabase = { from: vi.fn(), channel: mockChannel };

// Re-wire after each reset
function setupChannelMock() {
  mockSend.mockResolvedValue({});
  mockChannel.mockReturnValue({ send: mockSend });
}

vi.mock("@/lib/supabase", () => ({ createServerClient: () => mockSupabase }));
vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));

import { auth } from "@/lib/auth";

const mockRow = {
  id: "reg_1", event_id: "evt_1", name: "João", email: "joao@test.com",
  checked_in: true, checked_in_at: "2026-05-21T10:00:00Z",
  kit_delivered: false, kit_delivered_at: null,
  drawn: false, lgpd_accepted: true, created_at: "2026-05-21T09:00:00Z",
};

function makeParams() {
  return { params: Promise.resolve({ id: "evt_1", regId: "reg_1" }) };
}

function makeReq(body: unknown) {
  return new NextRequest("http://localhost/api/v1/events/evt_1/registrations/reg_1", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => { vi.resetAllMocks(); setupChannelMock(); });

describe("PATCH /api/v1/events/[id]/registrations/[regId]", () => {
  it("returns 401 when unauthenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    const res = await PATCH(makeReq({ checkedIn: true }), makeParams());
    expect(res.status).toBe(401);
  });

  it("returns 403 for guest role", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { role: "guest" } } as never);
    const res = await PATCH(makeReq({ checkedIn: true }), makeParams());
    expect(res.status).toBe(403);
  });

  it("returns 422 for invalid body (wrong type)", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { role: "mediador" } } as never);
    // checkedIn must be boolean, not string
    const res = await PATCH(makeReq({ checkedIn: "yes" }), makeParams());
    expect(res.status).toBe(422);
  });

  it("returns 404 when registration not found", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { role: "mediador" } } as never);
    const chain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: new Error("Not found") }),
    };
    mockSupabase.from.mockReturnValue(chain);
    const res = await PATCH(makeReq({ checkedIn: true }), makeParams());
    expect(res.status).toBe(404);
  });

  it("marks check-in, broadcasts, and returns 200", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { role: "mediador" } } as never);
    const chain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: mockRow, error: null }),
    };
    mockSupabase.from.mockReturnValue(chain);

    const res = await PATCH(makeReq({ checkedIn: true }), makeParams());
    expect(res.status).toBe(200);

    const body = await res.json() as { checkedIn: boolean; id: string };
    expect(body.id).toBe("reg_1");
    expect(body.checkedIn).toBe(true);

    // Realtime broadcast was called with the right channel and event
    expect(mockChannel).toHaveBeenCalledWith("event:evt_1:registrations");
    expect(mockSend).toHaveBeenCalledWith(expect.objectContaining({
      type: "broadcast",
      event: "registration:updated",
    }));
  });

  it("allows admin role", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { role: "admin" } } as never);
    const chain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: mockRow, error: null }),
    };
    mockSupabase.from.mockReturnValue(chain);
    const res = await PATCH(makeReq({ kitDelivered: true }), makeParams());
    expect(res.status).toBe(200);
  });
});
