/**
 * Public-facing projection of a question row.
 *
 * Excludes all PII (author email/contact/IP). Used for unauthenticated GET
 * responses and for Realtime broadcasts (the channel is signed with the anon
 * key, so payloads are visible to any subscriber). When the question is
 * anonymous the displayed name is "Anônimo".
 *
 * `createdAt` is included (it is not personal data) so moderator clients can
 * order and highlight new questions without a refetch.
 *
 * DESIGN: for non-anonymous questions, `author_name` is public BY DESIGN — a
 * signed question is meant to be shown on the live Q&A screen with its author.
 * Anonymous questions display "Anônimo". Email, contact and IP are never
 * exposed here. See ADR 011.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapQuestionPublic(row: Record<string, any>) {
  const isAnonymous = row.is_anonymous ?? false;
  return {
    id: row.id,
    eventId: row.event_id,
    text: row.text,
    isAnonymous,
    authorName: isAnonymous ? "Anônimo" : row.author_name,
    status: row.status,
    createdAt: row.created_at,
  };
}
