import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";

const mockSupabase = { from: vi.fn() };

vi.mock("@/lib/supabase", () => ({ createServerClient: () => mockSupabase }));
vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));

import { auth } from "@/lib/auth";

const mockEventRow = {
  id: "evt_1", slug: "evento-1", name: "Evento 1",
  starts_at: "2025-06-01T14:00:00Z", ends_at: "2025-06-01T18:00:00Z",
  place: "Local", address: "", status: "active", about: "", theme: {}, config: {},
  organizer_id: "usr_admin", created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
};

function makeReq() {
  return new NextRequest("http://localhost/api/v1/me/assignments");
}

beforeEach(() => vi.resetAllMocks());

describe("GET /api/v1/me/assignments", () => {
  it("returns 401 without auth", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    const res = await GET(makeReq());
    expect(res.status).toBe(401);
  });

  it("returns all events for admin role", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "usr_admin", role: "admin" } } as never);
    const chain = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [mockEventRow], error: null }),
    };
    mockSupabase.from.mockReturnValue(chain);
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.events).toHaveLength(1);
    expect(json.events[0].id).toBe("evt_1");
  });

  it("returns assignments for mediador role", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "usr_med", role: "mediador" } } as never);
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({
        data: [{ event_id: "evt_1", created_at: new Date().toISOString(), events: mockEventRow }],
        error: null,
      }),
    };
    mockSupabase.from.mockReturnValue(chain);
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.assignments).toHaveLength(1);
    expect(json.assignments[0].eventId).toBe("evt_1");
    expect(json.assignments[0].event.id).toBe("evt_1");
  });

  it("maps event correctly when theme and config are null", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "usr_med", role: "mediador" } } as never);
    const eventWithNulls = { ...mockEventRow, theme: null, config: null };
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({
        data: [{ event_id: "evt_1", created_at: new Date().toISOString(), events: eventWithNulls }],
        error: null,
      }),
    };
    mockSupabase.from.mockReturnValue(chain);
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.assignments[0].event.theme).toEqual({});
    expect(json.assignments[0].event.config).toEqual({});
  });

  it("maps event correctly when events join returns an array", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "usr_med", role: "mediador" } } as never);
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({
        data: [{ event_id: "evt_1", created_at: new Date().toISOString(), events: [mockEventRow] }],
        error: null,
      }),
    };
    mockSupabase.from.mockReturnValue(chain);
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.assignments[0].event.id).toBe("evt_1");
  });

  it("returns empty assignments for mediador with no events", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "usr_med", role: "mediador" } } as never);
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: [], error: null }),
    };
    mockSupabase.from.mockReturnValue(chain);
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.assignments).toHaveLength(0);
  });
});
