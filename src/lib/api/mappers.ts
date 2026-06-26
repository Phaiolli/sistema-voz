/**
 * Canonical row → domain mappers.
 *
 * Single source of truth for translating Supabase `Row` shapes (snake_case)
 * into the camelCase shapes returned by routes and consumed by server
 * components (DRY/SRP) — see ADR 012. Output shapes mirror the previous
 * per-file copies exactly so the response contract is unchanged.
 *
 * The public, PII-stripped question projection lives in
 * `./question-mappers` ({@link mapQuestionPublic}) and is re-exported below so
 * callers have a single import surface.
 */
import type { Database } from "@/lib/db/database.types";
import type { Event } from "@/lib/types";

export { mapQuestionPublic } from "@/lib/api/question-mappers";
export type { QuestionPublicSource } from "@/lib/api/question-mappers";

type EventRow = Database["public"]["Tables"]["events"]["Row"];
type QuestionRow = Database["public"]["Tables"]["questions"]["Row"];
type RegistrationRow = Database["public"]["Tables"]["registrations"]["Row"];

/** Question row without the IP column, returned to authorized moderators/owners. */
export type QuestionFullRow = Omit<QuestionRow, "author_ip">;

/**
 * Maps an event row to the {@link Event} domain type.
 *
 * `theme`/`config` fall back to `{}` defensively in case a legacy row stored
 * `null` before the `NOT NULL DEFAULT '{}'` constraint existed.
 */
export function mapEvent(row: EventRow): Event {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    place: row.place,
    address: row.address,
    status: row.status,
    about: row.about,
    theme: row.theme ?? {},
    config: row.config ?? {},
    organizerId: row.organizer_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Full question projection for authorized moderators/owners.
 *
 * Includes `authorEmail`/`isAnonymous`/`lgpdAccepted` but never the author IP
 * (the input row type excludes it). For unauthenticated consumers use
 * {@link mapQuestionPublic} instead. Optional columns are emitted as `null`
 * (not omitted) to preserve the existing JSON contract.
 */
export function mapQuestion(row: QuestionFullRow) {
  return {
    id: row.id,
    eventId: row.event_id,
    authorName: row.author_name,
    authorContact: row.author_contact ?? null,
    authorEmail: row.author_email ?? null,
    text: row.text,
    status: row.status,
    isAnonymous: row.is_anonymous ?? false,
    lgpdAccepted: row.lgpd_accepted ?? false,
    createdAt: row.created_at,
    presentedAt: row.presented_at ?? null,
    answeredAt: row.answered_at ?? null,
    hiddenAt: row.hidden_at ?? null,
    hiddenBy: row.hidden_by ?? null,
  };
}

/**
 * Moderation-action projection of a question.
 *
 * Intentionally narrower than {@link mapQuestion}: it omits `authorEmail`,
 * `isAnonymous` and `lgpdAccepted` to preserve the existing
 * `PATCH /questions/[id]` response contract.
 */
export function mapQuestionModeration(row: QuestionFullRow) {
  return {
    id: row.id,
    eventId: row.event_id,
    authorName: row.author_name,
    authorContact: row.author_contact ?? null,
    text: row.text,
    status: row.status,
    createdAt: row.created_at,
    presentedAt: row.presented_at ?? null,
    answeredAt: row.answered_at ?? null,
    hiddenAt: row.hidden_at ?? null,
    hiddenBy: row.hidden_by ?? null,
  };
}

/**
 * Maps a registration row to the camelCase registration shape.
 *
 * Optional columns are emitted as `null` (not omitted) to preserve the existing
 * JSON contract.
 */
export function mapRegistration(row: RegistrationRow) {
  return {
    id: row.id,
    eventId: row.event_id,
    name: row.name,
    email: row.email,
    phone: row.phone ?? null,
    document: row.document ?? null,
    checkedIn: row.checked_in,
    checkedInAt: row.checked_in_at ?? null,
    kitDelivered: row.kit_delivered,
    kitDeliveredAt: row.kit_delivered_at ?? null,
    drawn: row.drawn,
    drawnAt: row.drawn_at ?? null,
    lgpdAccepted: row.lgpd_accepted,
    createdAt: row.created_at,
  };
}
