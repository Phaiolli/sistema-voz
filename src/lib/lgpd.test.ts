import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSupabase = { from: vi.fn() };
vi.mock("@/lib/supabase", () => ({ createServerClient: () => mockSupabase }));

import { exportOwnerData, anonymizeOwnerData } from "./lgpd";

/**
 * Per-table query stub. Resolves selects/maybeSingle from `selectData`, and
 * records every `update(...)` payload in `updates` for later assertions.
 */
function tableStub(opts: {
  selectData?: unknown;
  maybeSingleData?: unknown;
  updates?: unknown[];
}) {
  const updates = opts.updates ?? [];
  const chain: Record<string, unknown> = {};
  chain.select = vi.fn(() => chain);
  chain.eq = vi.fn(() => chain);
  chain.in = vi.fn(() => chain);
  chain.maybeSingle = vi.fn(() => Promise.resolve({ data: opts.maybeSingleData ?? null }));
  chain.update = vi.fn((payload: unknown) => {
    updates.push(payload);
    return chain;
  });
  chain.then = (resolve: (v: unknown) => unknown) =>
    Promise.resolve({ data: opts.selectData ?? [] }).then(resolve);
  return chain;
}

beforeEach(() => {
  vi.resetAllMocks();
});

describe("exportOwnerData", () => {
  it("returns a full structured export for an owner with events", async () => {
    const userRow = { id: "owner_1", name: "Org", email: "org@example.test", role: "owner", created_at: "2026-01-01", last_seen_at: null };
    const eventRows = [{ id: "evt_1" }, { id: "evt_2" }];
    // Participants are sourced from `questions` (author PII), never author_ip.
    const participantRows = [
      {
        author_name: "Participante",
        author_contact: "x",
        author_email: null,
        text: "Pergunta",
        is_anonymous: false,
        lgpd_accepted: true,
        created_at: "2026-01-02",
      },
    ];
    const registrationRows = [{ id: "r1", name: "Inscrito", email: "i@example.test" }];

    mockSupabase.from.mockImplementation((table: string) => {
      switch (table) {
        case "users":
          return tableStub({ maybeSingleData: userRow });
        case "events":
          return tableStub({ selectData: eventRows });
        case "questions":
          return tableStub({ selectData: participantRows });
        case "registrations":
          return tableStub({ selectData: registrationRows });
        default:
          return tableStub({});
      }
    });

    const result = (await exportOwnerData("owner_1")) as Record<string, unknown>;
    expect(result.user).toEqual(userRow);
    expect(result.events).toEqual(eventRows);
    expect(result.participants).toEqual(participantRows);
    // author_ip must never be exported (data minimization).
    expect(JSON.stringify(result.participants)).not.toContain("author_ip");
    expect(result.registrations).toEqual(registrationRows);
    expect(typeof result.exportedAt).toBe("string");
  });

  it("handles an owner with no events (empty participants/registrations)", async () => {
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "users") return tableStub({ maybeSingleData: null });
      // events -> empty, so participants/registrations branches are never queried
      return tableStub({ selectData: [] });
    });

    const result = (await exportOwnerData("owner_unknown")) as Record<string, unknown>;
    expect(result.user).toBeNull();
    expect(result.events).toEqual([]);
    expect(result.participants).toEqual([]);
    expect(result.registrations).toEqual([]);
  });
});

describe("anonymizeOwnerData", () => {
  it("anonymizes user, participants, registrations (unique emails) and questions; payments untouched", async () => {
    const userUpdates: unknown[] = [];
    const participantUpdates: unknown[] = [];
    const registrationUpdates: unknown[] = [];
    const questionUpdates: unknown[] = [];

    mockSupabase.from.mockImplementation((table: string) => {
      switch (table) {
        case "events":
          return tableStub({ selectData: [{ id: "evt_1" }] });
        case "users":
          return tableStub({ updates: userUpdates });
        case "participants":
          return tableStub({ updates: participantUpdates });
        case "registrations":
          // select for ids returns two regs; updates captured here too
          return tableStub({ selectData: [{ id: "reg_1" }, { id: "reg_2" }], updates: registrationUpdates });
        case "questions":
          return tableStub({ updates: questionUpdates });
        default:
          return tableStub({});
      }
    });

    await anonymizeOwnerData("owner_1");

    // User anonymized with a unique-per-owner email.
    expect(userUpdates[0]).toMatchObject({ name: "Conta Removida", email: "removed_owner_1@voz.app" });

    // Participants anonymized.
    expect(participantUpdates[0]).toMatchObject({ name: "Anônimo", contact: "" });

    // Each registration gets a UNIQUE email keyed by its own id, so the
    // (event_id, email) unique index is never violated.
    expect(registrationUpdates).toHaveLength(2);
    const regEmails = registrationUpdates.map((u) => (u as { email: string }).email);
    expect(regEmails).toContain("removed_reg_1@voz.app");
    expect(regEmails).toContain("removed_reg_2@voz.app");
    expect(new Set(regEmails).size).toBe(2);
    for (const u of registrationUpdates) {
      expect(u).toMatchObject({ name: "Anônimo", phone: null, document: null });
    }

    // Questions PII scrubbed.
    expect(questionUpdates[0]).toMatchObject({
      author_name: "Anônimo",
      author_contact: null,
      author_email: null,
      author_ip: null,
    });

    // Payments table is never touched (fiscal data preserved).
    const touchedTables = mockSupabase.from.mock.calls.map((c) => c[0]);
    expect(touchedTables).not.toContain("event_payments");
  });

  it("still anonymizes the user when the owner has no events", async () => {
    const userUpdates: unknown[] = [];
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "events") return tableStub({ selectData: [] });
      if (table === "users") return tableStub({ updates: userUpdates });
      return tableStub({});
    });

    await anonymizeOwnerData("owner_2");
    expect(userUpdates[0]).toMatchObject({ name: "Conta Removida", email: "removed_owner_2@voz.app" });
    // No event-scoped tables touched.
    const touched = mockSupabase.from.mock.calls.map((c) => c[0]);
    expect(touched).not.toContain("participants");
    expect(touched).not.toContain("questions");
  });

  it("handles no registrations gracefully (skips registration updates)", async () => {
    const registrationUpdates: unknown[] = [];
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "events") return tableStub({ selectData: [{ id: "evt_1" }] });
      if (table === "users") return tableStub({});
      if (table === "participants") return tableStub({});
      if (table === "registrations") return tableStub({ selectData: [], updates: registrationUpdates });
      if (table === "questions") return tableStub({});
      return tableStub({});
    });

    await anonymizeOwnerData("owner_3");
    expect(registrationUpdates).toHaveLength(0);
  });
});
