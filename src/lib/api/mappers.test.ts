import { describe, it, expect } from "vitest";
import { mapEvent, mapQuestion, mapQuestionModeration, mapRegistration } from "./mappers";
import type { Database } from "@/lib/db/database.types";

type EventRow = Database["public"]["Tables"]["events"]["Row"];
type QuestionRow = Database["public"]["Tables"]["questions"]["Row"];
type RegistrationRow = Database["public"]["Tables"]["registrations"]["Row"];

/**
 * Shape-contract tests for the centralized mappers (ADR 012 refactor).
 *
 * These guard the "no behavioral change" promise of Lote 4: the keys emitted
 * and the null-vs-undefined contract for optional columns must stay stable so
 * the JSON returned by the events/questions/registrations routes is unchanged.
 *
 * All fixtures are synthetic — no production data / PII.
 */

const eventRow: EventRow = {
  id: "evt_1",
  slug: "synthetic-event",
  name: "Synthetic Event",
  starts_at: "2026-07-01T10:00:00.000Z",
  ends_at: "2026-07-01T18:00:00.000Z",
  place: "Auditório Sintético",
  address: "Rua de Teste, 123",
  status: "active",
  about: "Evento sintético para testes.",
  theme: { preset: "voz-base" },
  config: { registration: { enabled: true } },
  organizer_id: "user_1",
  created_at: "2026-06-01T00:00:00.000Z",
  updated_at: "2026-06-02T00:00:00.000Z",
} as EventRow;

const questionRow = {
  id: "q_1",
  event_id: "evt_1",
  author_name: "Maria Sintética",
  author_contact: "11999990000",
  author_email: "maria@example.test",
  text: "Pergunta sintética",
  status: "pending",
  is_anonymous: false,
  lgpd_accepted: true,
  created_at: "2026-06-25T12:00:00.000Z",
  presented_at: null,
  answered_at: null,
  hidden_at: null,
  hidden_by: null,
} as Omit<QuestionRow, "author_ip">;

const registrationRow: RegistrationRow = {
  id: "reg_1",
  event_id: "evt_1",
  name: "João Sintético",
  email: "joao@example.test",
  phone: "11988887777",
  document: "000.000.000-00",
  checked_in: false,
  checked_in_at: null,
  kit_delivered: false,
  kit_delivered_at: null,
  drawn: false,
  drawn_at: null,
  lgpd_accepted: true,
  created_at: "2026-06-20T08:00:00.000Z",
} as RegistrationRow;

describe("mapEvent", () => {
  it("emits the canonical camelCase event keys", () => {
    expect(Object.keys(mapEvent(eventRow)).sort()).toEqual(
      [
        "id",
        "slug",
        "name",
        "startsAt",
        "endsAt",
        "place",
        "address",
        "status",
        "about",
        "theme",
        "config",
        "organizerId",
        "createdAt",
        "updatedAt",
      ].sort(),
    );
  });

  it("translates snake_case columns to the expected values", () => {
    const out = mapEvent(eventRow);
    expect(out).toMatchObject({
      id: "evt_1",
      slug: "synthetic-event",
      startsAt: "2026-07-01T10:00:00.000Z",
      endsAt: "2026-07-01T18:00:00.000Z",
      organizerId: "user_1",
      createdAt: "2026-06-01T00:00:00.000Z",
      updatedAt: "2026-06-02T00:00:00.000Z",
      theme: { preset: "voz-base" },
      config: { registration: { enabled: true } },
    });
  });

  it("falls back to {} when theme/config are null (legacy rows)", () => {
    // Legacy rows could store null before the NOT NULL DEFAULT '{}' constraint;
    // the runtime row may violate the current non-null Row type, so we go
    // through `unknown` to exercise that documented defensive branch.
    const legacyRow = { ...eventRow, theme: null, config: null } as unknown as EventRow;
    const out = mapEvent(legacyRow);
    expect(out.theme).toEqual({});
    expect(out.config).toEqual({});
  });
});

describe("mapQuestion", () => {
  it("emits the full moderator/owner key set", () => {
    expect(Object.keys(mapQuestion(questionRow)).sort()).toEqual(
      [
        "id",
        "eventId",
        "authorName",
        "authorContact",
        "authorEmail",
        "text",
        "status",
        "isAnonymous",
        "lgpdAccepted",
        "createdAt",
        "presentedAt",
        "answeredAt",
        "hiddenAt",
        "hiddenBy",
      ].sort(),
    );
  });

  it("never leaks the author IP column", () => {
    const out = mapQuestion(questionRow) as Record<string, unknown>;
    expect(out).not.toHaveProperty("authorIp");
    expect(out).not.toHaveProperty("author_ip");
  });

  it("emits optional columns as null (not undefined/omitted) when absent", () => {
    const { author_contact, author_email, is_anonymous, lgpd_accepted, ...without } =
      questionRow as Record<string, unknown>;
    const out = mapQuestion(without as Omit<QuestionRow, "author_ip">) as Record<
      string,
      unknown
    >;
    expect(out.authorContact).toBeNull();
    expect(out.authorEmail).toBeNull();
    expect("authorContact" in out).toBe(true);
    expect("authorEmail" in out).toBe(true);
    // boolean flags default to false, not null/undefined
    expect(out.isAnonymous).toBe(false);
    expect(out.lgpdAccepted).toBe(false);
  });

  it("preserves null timestamps as null", () => {
    const out = mapQuestion(questionRow);
    expect(out.presentedAt).toBeNull();
    expect(out.answeredAt).toBeNull();
    expect(out.hiddenAt).toBeNull();
    expect(out.hiddenBy).toBeNull();
  });
});

describe("mapQuestionModeration", () => {
  it("emits the narrower moderation key set (no email/anon/lgpd)", () => {
    const out = mapQuestionModeration(questionRow) as Record<string, unknown>;
    expect(Object.keys(out).sort()).toEqual(
      [
        "id",
        "eventId",
        "authorName",
        "authorContact",
        "text",
        "status",
        "createdAt",
        "presentedAt",
        "answeredAt",
        "hiddenAt",
        "hiddenBy",
      ].sort(),
    );
    expect(out).not.toHaveProperty("authorEmail");
    expect(out).not.toHaveProperty("isAnonymous");
    expect(out).not.toHaveProperty("lgpdAccepted");
  });

  it("emits authorContact as null when absent", () => {
    const { author_contact, ...without } = questionRow as Record<string, unknown>;
    const out = mapQuestionModeration(
      without as Omit<QuestionRow, "author_ip">,
    ) as Record<string, unknown>;
    expect(out.authorContact).toBeNull();
    expect("authorContact" in out).toBe(true);
  });
});

describe("mapRegistration", () => {
  it("emits the canonical registration key set", () => {
    expect(Object.keys(mapRegistration(registrationRow)).sort()).toEqual(
      [
        "id",
        "eventId",
        "name",
        "email",
        "phone",
        "document",
        "checkedIn",
        "checkedInAt",
        "kitDelivered",
        "kitDeliveredAt",
        "drawn",
        "drawnAt",
        "lgpdAccepted",
        "createdAt",
      ].sort(),
    );
  });

  it("emits optional columns as null (not omitted) when absent", () => {
    const { phone, document, checked_in_at, kit_delivered_at, drawn_at, ...without } =
      registrationRow as Record<string, unknown>;
    const out = mapRegistration(without as RegistrationRow) as Record<string, unknown>;
    for (const key of ["phone", "document", "checkedInAt", "kitDeliveredAt", "drawnAt"]) {
      expect(out[key]).toBeNull();
      expect(key in out).toBe(true);
    }
  });

  it("passes boolean state columns through unchanged", () => {
    const out = mapRegistration({
      ...registrationRow,
      checked_in: true,
      kit_delivered: true,
      drawn: true,
    } as RegistrationRow);
    expect(out.checkedIn).toBe(true);
    expect(out.kitDelivered).toBe(true);
    expect(out.drawn).toBe(true);
  });
});
