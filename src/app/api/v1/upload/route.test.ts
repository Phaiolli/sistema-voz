import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";

vi.mock("@/lib/supabase", () => ({
  createServerClient: () => mockSupabase,
}));
vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));

import { auth } from "@/lib/auth";

const mockUpload = vi.fn();
const mockGetPublicUrl = vi.fn();
const mockSupabase = {
  storage: {
    from: vi.fn(() => ({ upload: mockUpload, getPublicUrl: mockGetPublicUrl })),
  },
};

function makeFile(name: string, type: string, size = 100): File {
  const blob = new Blob([new Uint8Array(size)], { type });
  return new File([blob], name, { type });
}

function makeFormDataReq(file: File | null): NextRequest {
  const formData = new FormData();
  if (file) formData.append("file", file);
  return new NextRequest("http://localhost/api/v1/upload", {
    method: "POST",
    body: formData,
  });
}

beforeEach(() => {
  vi.resetAllMocks();
  mockUpload.mockResolvedValue({ error: null });
  mockGetPublicUrl.mockReturnValue({ data: { publicUrl: "https://cdn.example.com/img.jpg" } });
});

describe("POST /api/v1/upload", () => {
  it("returns 401 when unauthenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    const res = await POST(makeFormDataReq(makeFile("img.jpg", "image/jpeg")));
    expect(res.status).toBe(401);
  });

  it("returns 422 when no file is provided", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { role: "admin" } } as never);
    const res = await POST(makeFormDataReq(null));
    expect(res.status).toBe(422);
    const body = await res.json() as { error: { code: string } };
    expect(body.error.code).toBe("NO_FILE");
  });

  it("returns 422 for disallowed mime type", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { role: "admin" } } as never);
    const res = await POST(makeFormDataReq(makeFile("doc.pdf", "application/pdf")));
    expect(res.status).toBe(422);
    const body = await res.json() as { error: { code: string } };
    expect(body.error.code).toBe("INVALID_TYPE");
  });

  it("returns 422 when file exceeds 3 MB", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { role: "admin" } } as never);
    const big = makeFile("big.png", "image/png", 3 * 1024 * 1024 + 1);
    const res = await POST(makeFormDataReq(big));
    expect(res.status).toBe(422);
    const body = await res.json() as { error: { code: string } };
    expect(body.error.code).toBe("TOO_LARGE");
  });

  it("uploads and returns public URL", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { role: "admin" } } as never);
    const res = await POST(makeFormDataReq(makeFile("photo.jpg", "image/jpeg")));
    expect(res.status).toBe(200);
    const body = await res.json() as { url: string };
    expect(body.url).toBe("https://cdn.example.com/img.jpg");
  });

  it("throws when supabase upload fails", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { role: "admin" } } as never);
    mockUpload.mockResolvedValue({ error: new Error("storage error") });
    await expect(POST(makeFormDataReq(makeFile("photo.png", "image/png")))).rejects.toThrow("storage error");
  });

  it("accepts all allowed mime types", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { role: "admin" } } as never);
    const types = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    for (const type of types) {
      const res = await POST(makeFormDataReq(makeFile(`img.${type.split("/")[1]}`, type)));
      expect(res.status).toBe(200);
    }
  });

  it("rejects image/svg+xml (XSS vector)", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { role: "admin" } } as never);
    const res = await POST(makeFormDataReq(makeFile("evil.svg", "image/svg+xml")));
    expect(res.status).toBe(422);
    const body = await res.json() as { error: { code: string } };
    expect(body.error.code).toBe("INVALID_TYPE");
  });
});
