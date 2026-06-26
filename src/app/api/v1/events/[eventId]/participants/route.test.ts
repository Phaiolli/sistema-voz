import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";

const mockSupabase = { from: vi.fn() };

vi.mock("@/lib/supabase", () => ({ createServerClient: () => mockSupabase }));
vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));

import { auth } from "@/lib/auth";

const mockQuestionRow = {
  author_name: "Maria Santos",
  author_contact: "11999990000",
  author_email: "maria@example.com",
  text: "Qual o cronograma?",
  is_anonymous: false,
  lgpd_accepted: true,
};

const anonRow = {
  author_name: "Anônimo",
  author_contact: null,
  author_email: null,
  text: "Pergunta anônima",
  is_anonymous: true,
  lgpd_accepted: true,
};

/** Chain for the questions list query: .select().eq().order() resolves. */
function listChain(rows: unknown[]) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue({ data: rows, error: null }),
  };
}

function ownershipChain(owns: boolean) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: owns ? { id: "evt_1" } : null, error: null }),
  };
}

function makeParams(eventId = "evt_1") {
  return { params: Promise.resolve({ eventId }) };
}

function makeReq() {
  return new NextRequest("http://localhost/api/v1/events/evt_1/participants");
}

beforeEach(() => vi.resetAllMocks());

describe("GET /api/v1/events/[eventId]/participants — auth & isolation (C2)", () => {
  it("returns 401 when unauthenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    const res = await GET(makeReq(), makeParams());
    expect(res.status).toBe(401);
  });

  it("returns 403 for a non-privileged role", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "u", role: "guest" } } as never);
    const res = await GET(makeReq(), makeParams());
    expect(res.status).toBe(403);
  });

  it("returns 404 when owner B accesses owner A's event", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "owner_b", role: "owner" } } as never);
    mockSupabase.from.mockImplementation((table: string) =>
      table === "events" ? ownershipChain(false) : listChain([]),
    );
    const res = await GET(makeReq(), makeParams());
    expect(res.status).toBe(404);
  });

  it("returns 403 when a mediador is not assigned to the event", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "med_x", role: "mediador" } } as never);
    mockSupabase.from.mockImplementation((table: string) =>
      table === "mediator_assignments"
        ? { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), limit: vi.fn().mockReturnThis(), maybeSingle: vi.fn().mockResolvedValue({ data: null }) }
        : listChain([]),
    );
    const res = await GET(makeReq(), makeParams());
    expect(res.status).toBe(403);
  });
});

describe("GET /api/v1/events/[eventId]/participants — payload (privileged export)", () => {
  it("returns participant rows for the owner of the event", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "owner_a", role: "owner" } } as never);
    mockSupabase.from.mockImplementation((table: string) =>
      table === "events" ? ownershipChain(true) : listChain([mockQuestionRow]),
    );
    const res = await GET(makeReq(), makeParams());
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      participants: { name: string; whatsapp: string | null; email: string | null }[];
    };
    expect(body.participants).toHaveLength(1);
    expect(body.participants[0].name).toBe("Maria Santos");
    expect(body.participants[0].whatsapp).toBe("11999990000");
  });

  it("flags anonymous rows as isAnonymous for the admin export", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "u_admin", role: "admin" } } as never);
    mockSupabase.from.mockReturnValue(listChain([anonRow]));
    const res = await GET(makeReq(), makeParams());
    expect(res.status).toBe(200);
    const body = (await res.json()) as { participants: { isAnonymous: boolean }[] };
    expect(body.participants[0].isAnonymous).toBe(true);
  });
});
