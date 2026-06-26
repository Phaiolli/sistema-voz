/**
 * Plan limits, pricing, and quota checks for SaaS multi-tenant model.
 *
 * Free plan: 1 event + 15 questions per event.
 * Paid plan: unlimited events and questions (per paid event).
 *
 * See ADR 009 (SaaS multi-tenant) for design rationale.
 */
import { createServerClient } from "@/lib/supabase";
import { logError } from "@/lib/log";

/** Maximum number of events an owner on the free plan can create. */
export const FREE_EVENT_LIMIT = 1;

/** Maximum number of questions allowed per event on the free plan. */
export const FREE_QUESTION_LIMIT = 15;

/** Price of a single paid event, in BRL cents. */
export const EVENT_PRICE_CENTS = 5990;

/**
 * Returns the total number of events owned by the given owner.
 *
 * @param ownerId - UUID of the owner
 * @returns Total event count
 * @throws On database error
 */
export async function getOwnerEventCount(ownerId: string): Promise<number> {
  const supabase = createServerClient();
  const { count, error } = await supabase
    .from("events")
    .select("id", { count: "exact", head: true })
    .eq("organizer_id", ownerId);
  if (error) {
    logError("[plan-limits] getOwnerEventCount failed", error);
    throw error;
  }
  return count ?? 0;
}

/**
 * Checks if a specific event is owned by a specific user.
 *
 * Used in auth-guard for ownership verification (returns 404 on mismatch to avoid enumeration).
 *
 * @param eventId - UUID of the event
 * @param userId - UUID of the potential owner
 * @returns true if user owns the event; false otherwise
 * @throws On database error
 */
export async function isEventOwnedBy(eventId: string, userId: string): Promise<boolean> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("events")
    .select("id")
    .eq("id", eventId)
    .eq("organizer_id", userId)
    .maybeSingle();
  if (error) {
    logError("[plan-limits] isEventOwnedBy failed", error);
    throw error;
  }
  return data !== null;
}

/**
 * Returns the total number of questions submitted for a given event.
 *
 * Used to enforce the free plan limit (`FREE_QUESTION_LIMIT`).
 *
 * @param eventId - UUID of the event
 * @returns Total question count
 * @throws On database error
 */
export async function getEventQuestionCount(eventId: string): Promise<number> {
  const supabase = createServerClient();
  const { count, error } = await supabase
    .from("questions")
    .select("id", { count: "exact", head: true })
    .eq("event_id", eventId);
  if (error) {
    logError("[plan-limits] getEventQuestionCount failed", error);
    throw error;
  }
  return count ?? 0;
}

/**
 * Returns whether a specific event has been paid for.
 *
 * Billing is per-event: a paid event has unlimited questions, an unpaid one is
 * capped at `FREE_QUESTION_LIMIT`. See ADR 015 (billing per-evento is_paid).
 *
 * @param eventId - UUID of the event
 * @returns true if the event is paid; false otherwise
 * @throws On database error
 */
export async function isEventPaid(eventId: string): Promise<boolean> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("events")
    .select("is_paid")
    .eq("id", eventId)
    .maybeSingle();
  if (error) {
    logError("[plan-limits] isEventPaid failed", error);
    throw error;
  }
  return data?.is_paid === true;
}

/**
 * Returns the plan of the given owner.
 *
 * Determines which rate limits and quota restrictions apply.
 *
 * @param ownerId - UUID of the owner
 * @returns "free" or "paid"
 * @throws On database error
 */
export async function getOwnerPlan(ownerId: string): Promise<"free" | "paid"> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("users")
    .select("plan")
    .eq("id", ownerId)
    .maybeSingle();
  if (error) {
    logError("[plan-limits] getOwnerPlan failed", error);
    throw error;
  }
  return (data?.plan === "paid" ? "paid" : "free");
}
