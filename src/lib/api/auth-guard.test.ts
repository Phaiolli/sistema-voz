import { describe, it, expect, vi, beforeEach } from "vitest";
import { requireRole, requireEventAccess } from "./auth-guard";

const mockSupabase = { from: vi.fn() };

vi.mock("@/lib/supabase", () => ({ createServerClient: () => mockSupabase }));
vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/plan-limits", () => ({ isEventOwnedBy: vi.fn() }));

import { auth } from "@/lib/auth";
import { isEventOwnedBy } from "@/lib/plan-limits";

/** Chain matching the guard's mediator_assignments lookup. */
function assignmentChain(data: unknown) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data }),
  };
}

beforeEach(() => vi.resetAllMocks());

describe("requireRole", () => {
  it("returns 401 err when there is no session", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    const result = await requireRole(["owner"]);
    expect("err" in result).toBe(true);
    if ("err" in result) expect(result.err.status).toBe(401);
  });

  it("returns 401 err when session has no user", async () => {
    vi.mocked(auth).mockResolvedValue({} as never);
    const result = await requireRole(["owner"]);
    expect("err" in result).toBe(true);
    if ("err" in result) expect(result.err.status).toBe(401);
  });

  it("returns 403 err when the user role is not allowed", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "u_1", role: "mediador" } } as never);
    const result = await requireRole(["owner", "admin"]);
    expect("err" in result).toBe(true);
    if ("err" in result) {
      expect(result.err.status).toBe(403);
      const body = (await result.err.json()) as { error: { code: string } };
      expect(body.error.code).toBe("FORBIDDEN");
    }
  });

  it("returns session and user when the role is allowed", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "u_1", role: "owner" } } as never);
    const result = await requireRole(["owner"]);
    expect("err" in result).toBe(false);
    if (!("err" in result)) {
      expect(result.user).toEqual({ id: "u_1", role: "owner" });
    }
  });
});

describe("requireEventAccess", () => {
  it("returns 401 err when unauthenticated (delegated to requireRole)", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    const result = await requireEventAccess("evt_1", ["owner"]);
    expect("err" in result).toBe(true);
    if ("err" in result) expect(result.err.status).toBe(401);
  });

  it("returns 403 err when role is not allowed", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "u_1", role: "mediador" } } as never);
    const result = await requireEventAccess("evt_1", ["owner"]);
    expect("err" in result).toBe(true);
    if ("err" in result) expect(result.err.status).toBe(403);
  });

  it("grants platform-wide access to admin without checking ownership", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "u_admin", role: "admin" } } as never);
    const result = await requireEventAccess("evt_1", ["admin", "owner", "mediador"]);
    expect("err" in result).toBe(false);
    expect(isEventOwnedBy).not.toHaveBeenCalled();
    expect(mockSupabase.from).not.toHaveBeenCalled();
  });

  it("grants platform-wide access to superadmin without checking ownership", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "u_super", role: "superadmin" } } as never);
    const result = await requireEventAccess("evt_1", ["superadmin", "owner"]);
    expect("err" in result).toBe(false);
    expect(isEventOwnedBy).not.toHaveBeenCalled();
  });

  it("grants access to an owner who owns the event", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "owner_a", role: "owner" } } as never);
    vi.mocked(isEventOwnedBy).mockResolvedValue(true);
    const result = await requireEventAccess("evt_1", ["owner"]);
    expect("err" in result).toBe(false);
    expect(isEventOwnedBy).toHaveBeenCalledWith("evt_1", "owner_a");
  });

  it("returns 404 (not 403) when an owner does NOT own the event — anti-enumeration", async () => {
    // Cross-tenant: owner B trying to reach owner A's event.
    vi.mocked(auth).mockResolvedValue({ user: { id: "owner_b", role: "owner" } } as never);
    vi.mocked(isEventOwnedBy).mockResolvedValue(false);
    const result = await requireEventAccess("evt_of_owner_a", ["owner"]);
    expect("err" in result).toBe(true);
    if ("err" in result) {
      expect(result.err.status).toBe(404);
      const body = (await result.err.json()) as { error: { code: string } };
      expect(body.error.code).toBe("NOT_FOUND");
    }
  });

  it("grants access to a mediador assigned to the event", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "med_1", role: "mediador" } } as never);
    mockSupabase.from.mockReturnValue(assignmentChain({ event_id: "evt_1" }));
    const result = await requireEventAccess("evt_1", ["mediador"]);
    expect("err" in result).toBe(false);
    expect(mockSupabase.from).toHaveBeenCalledWith("mediator_assignments");
  });

  it("returns 403 when a mediador is NOT assigned to the event", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "med_x", role: "mediador" } } as never);
    mockSupabase.from.mockReturnValue(assignmentChain(null));
    const result = await requireEventAccess("evt_other", ["mediador"]);
    expect("err" in result).toBe(true);
    if ("err" in result) {
      expect(result.err.status).toBe(403);
      const body = (await result.err.json()) as { error: { code: string } };
      expect(body.error.code).toBe("FORBIDDEN");
    }
  });
});
