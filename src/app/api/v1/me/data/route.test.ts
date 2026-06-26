import { describe, it, expect, vi, beforeEach } from "vitest";
import { DELETE } from "./route";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/lgpd", () => ({ anonymizeOwnerData: vi.fn() }));

import { auth } from "@/lib/auth";
import { anonymizeOwnerData } from "@/lib/lgpd";

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(anonymizeOwnerData).mockResolvedValue(undefined);
});

describe("DELETE /api/v1/me/data — right to erasure", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    const res = await DELETE();
    expect(res.status).toBe(401);
    expect(anonymizeOwnerData).not.toHaveBeenCalled();
  });

  it("returns 403 for non-owner/admin roles", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "u1", role: "mediador" } } as never);
    const res = await DELETE();
    expect(res.status).toBe(403);
    expect(anonymizeOwnerData).not.toHaveBeenCalled();
  });

  it("anonymizes the authenticated owner's data and returns 200", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "usr_owner", role: "owner" } } as never);
    const res = await DELETE();
    expect(res.status).toBe(200);
    expect(anonymizeOwnerData).toHaveBeenCalledWith("usr_owner");
  });

  it("allows admin to erase their own data", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "usr_admin", role: "admin" } } as never);
    const res = await DELETE();
    expect(res.status).toBe(200);
    expect(anonymizeOwnerData).toHaveBeenCalledWith("usr_admin");
  });
});
