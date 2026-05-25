import { createServerClient } from "@/lib/supabase";

/** Maximum number of events an owner on the free plan can create. */
export const FREE_EVENT_LIMIT = 1;

/** Maximum number of questions allowed per event on the free plan. */
export const FREE_QUESTION_LIMIT = 15;

/** Price of a single paid event, in BRL cents. */
export const EVENT_PRICE_CENTS = 5990;

/** Returns the total number of events owned by the given owner. */
export async function getOwnerEventCount(ownerId: string): Promise<number> {
  const supabase = createServerClient();
  const { count, error } = await supabase
    .from("events")
    .select("id", { count: "exact", head: true })
    .eq("organizer_id", ownerId);
  if (error) {
    console.error("[plan-limits] getOwnerEventCount failed:", error);
    throw error;
  }
  return count ?? 0;
}

/** Returns true if the given event is owned by the given user. */
export async function isEventOwnedBy(eventId: string, userId: string): Promise<boolean> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("events")
    .select("id")
    .eq("id", eventId)
    .eq("organizer_id", userId)
    .maybeSingle();
  if (error) {
    console.error("[plan-limits] isEventOwnedBy failed:", error);
    throw error;
  }
  return data !== null;
}

/** Returns the total number of questions submitted for the given event. */
export async function getEventQuestionCount(eventId: string): Promise<number> {
  const supabase = createServerClient();
  const { count, error } = await supabase
    .from("questions")
    .select("id", { count: "exact", head: true })
    .eq("event_id", eventId);
  if (error) {
    console.error("[plan-limits] getEventQuestionCount failed:", error);
    throw error;
  }
  return count ?? 0;
}

/** Returns the plan ("free" | "paid") of the given owner. */
export async function getOwnerPlan(ownerId: string): Promise<"free" | "paid"> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("users")
    .select("plan")
    .eq("id", ownerId)
    .maybeSingle();
  if (error) {
    console.error("[plan-limits] getOwnerPlan failed:", error);
    throw error;
  }
  return (data?.plan === "paid" ? "paid" : "free");
}
