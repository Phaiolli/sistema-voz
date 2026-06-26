import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "./route";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/lgpd", () => ({ exportOwnerData: vi.fn() }));

import { auth } from "@/lib/auth";
import { exportOwnerData } from "@/lib/lgpd";

beforeEach(() => {
  vi.resetAllMocks();
});

describe("GET /api/v1/me/data-export — right to portability", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    const res = await GET();
    expect(res.status).toBe(401);
    expect(exportOwnerData).not.toHaveBeenCalled();
  });

  it("returns 403 for non-owner/admin roles", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "u1", role: "mediador" } } as never);
    const res = await GET();
    expect(res.status).toBe(403);
    expect(exportOwnerData).not.toHaveBeenCalled();
  });

  it("returns the export as a downloadable JSON attachment", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "usr_owner", role: "owner" } } as never);
    const payload = { user: { id: "usr_owner" }, events: [], participants: [], registrations: [] };
    vi.mocked(exportOwnerData).mockResolvedValue(payload);

    const res = await GET();
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Disposition")).toContain('attachment; filename="voz-meus-dados.json"');
    expect(exportOwnerData).toHaveBeenCalledWith("usr_owner");
    const json = await res.json();
    expect(json).toEqual(payload);
  });
});
