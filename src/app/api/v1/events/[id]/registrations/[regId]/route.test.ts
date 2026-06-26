import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { PATCH, DELETE } from "./route";

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
vi.mock("@/lib/plan-limits", () => ({ isEventOwnedBy: vi.fn() }));

import { auth } from "@/lib/auth";
import { isEventOwnedBy } from "@/lib/plan-limits";

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

function makeDeleteReq() {
  return new NextRequest("http://localhost/api/v1/events/evt_1/registrations/reg_1", {
    method: "DELETE",
  });
}

/** Mock for the guard's mediator_assignments lookup (assignment present). */
function assignmentChain() {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: { event_id: "evt_1" } }),
  };
}

/** Mediator has NO assignment for this event → guard must forbid (403). */
function noAssignmentChain() {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: null }),
  };
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
    vi.mocked(auth).mockResolvedValue({ user: { id: "u_med", role: "mediador" } } as never);
    mockSupabase.from.mockImplementation((table: string) =>
      table === "mediator_assignments" ? assignmentChain() : ({}) as never);
    // checkedIn must be boolean, not string
    const res = await PATCH(makeReq({ checkedIn: "yes" }), makeParams());
    expect(res.status).toBe(422);
  });

  it("returns 404 when registration not found", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "u_med", role: "mediador" } } as never);
    const chain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: new Error("Not found") }),
    };
    mockSupabase.from.mockImplementation((table: string) =>
      table === "mediator_assignments" ? assignmentChain() : chain);
    const res = await PATCH(makeReq({ checkedIn: true }), makeParams());
    expect(res.status).toBe(404);
  });

  it("marks check-in, broadcasts, and returns 200", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "u_med", role: "mediador" } } as never);
    const chain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: mockRow, error: null }),
    };
    mockSupabase.from.mockImplementation((table: string) =>
      table === "mediator_assignments" ? assignmentChain() : chain);

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

describe("DELETE /api/v1/events/[id]/registrations/[regId] (anonymization)", () => {
  it("returns 401 when unauthenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    const res = await DELETE(makeDeleteReq(), makeParams());
    expect(res.status).toBe(401);
  });

  it("returns 403 for guest role", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { role: "guest" } } as never);
    const res = await DELETE(makeDeleteReq(), makeParams());
    expect(res.status).toBe(403);
  });

  it("returns 403 for a mediador NOT assigned to the event (BFLA)", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "u_other", role: "mediador" } } as never);
    const update = vi.fn().mockReturnThis();
    mockSupabase.from.mockImplementation((table: string) =>
      table === "mediator_assignments" ? noAssignmentChain() : ({ update }) as never);

    const res = await DELETE(makeDeleteReq(), makeParams());
    expect(res.status).toBe(403);
    // Guard short-circuits BEFORE any anonymization is attempted.
    expect(update).not.toHaveBeenCalled();
  });

  it("returns 404 for an owner who does not own the event (no enumeration / BOLA)", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "u_owner", role: "owner" } } as never);
    vi.mocked(isEventOwnedBy).mockResolvedValue(false);
    const update = vi.fn().mockReturnThis();
    mockSupabase.from.mockReturnValue({ update } as never);

    const res = await DELETE(makeDeleteReq(), makeParams());
    expect(res.status).toBe(404);
    expect(update).not.toHaveBeenCalled();
  });

  it("allows an owner who owns the event to anonymize (200)", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "u_owner", role: "owner" } } as never);
    vi.mocked(isEventOwnedBy).mockResolvedValue(true);
    const chain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: "reg_1" }, error: null }),
    };
    mockSupabase.from.mockReturnValue(chain);

    const res = await DELETE(makeDeleteReq(), makeParams());
    expect(res.status).toBe(200);
  });

  it("returns 404 when registration not found", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { role: "admin" } } as never);
    const chain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: new Error("not found") }),
    };
    mockSupabase.from.mockReturnValue(chain);
    const res = await DELETE(makeDeleteReq(), makeParams());
    expect(res.status).toBe(404);
  });

  it("anonymizes PII and returns 200 with { anonymized: true }", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "u_med", role: "mediador" } } as never);
    const update = vi.fn().mockReturnThis();
    const chain = {
      update,
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: "reg_1" }, error: null }),
    };
    mockSupabase.from.mockImplementation((table: string) =>
      table === "mediator_assignments" ? assignmentChain() : chain);

    const res = await DELETE(makeDeleteReq(), makeParams());
    expect(res.status).toBe(200);
    const body = await res.json() as { anonymized: boolean };
    expect(body.anonymized).toBe(true);

    // PII fields are blanked; id/event_id/check-in state are untouched.
    expect(update).toHaveBeenCalledWith(expect.objectContaining({
      name: "[removido]",
      email: "removed_reg_1@voz.app",
      phone: null,
      document: null,
    }));
    const patch = update.mock.calls[0][0] as Record<string, unknown>;
    // Check-in / sorteio / consent state are NOT part of the anonymization patch.
    for (const preserved of ["checked_in", "checked_in_at", "drawn", "lgpd_accepted", "id", "event_id"]) {
      expect(patch).not.toHaveProperty(preserved);
    }
    // No real PII value leaks into the patch we send to the DB.
    const patchStr = JSON.stringify(patch);
    expect(patchStr).not.toContain("joao@test.com");
    expect(patchStr).not.toContain("João");
    // Broadcast announces anonymization (regression: realtime contract).
    expect(mockChannel).toHaveBeenCalledWith("event:evt_1:registrations");
    expect(mockSend).toHaveBeenCalledWith(expect.objectContaining({
      type: "broadcast",
      event: "registration:anonymized",
    }));
  });

  it("still returns 200 even if the realtime broadcast fails (non-fatal)", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "u_med", role: "mediador" } } as never);
    const chain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: "reg_1" }, error: null }),
    };
    mockSupabase.from.mockImplementation((table: string) =>
      table === "mediator_assignments" ? assignmentChain() : chain);
    mockSend.mockRejectedValue(new Error("realtime down"));

    const res = await DELETE(makeDeleteReq(), makeParams());
    expect(res.status).toBe(200);
    expect((await res.json()).anonymized).toBe(true);
  });
});
