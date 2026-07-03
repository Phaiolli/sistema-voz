import { auth } from "@clerk/nextjs/server";
import { createServerClient } from "@/lib/supabase";
import type { UserRole, UserPlan } from "@/lib/types";

/** App user resolved from the Clerk session and the Supabase `users` row. */
export interface AppUser {
  id: string;
  role: UserRole;
  plan: UserPlan;
}

/**
 * Resolves the current request's app user.
 *
 * Maps the Clerk user id to the local `users` row via `clerk_id` (kept in sync
 * by the migration/webhook). `users` is the source of truth for `role`/`plan`
 * (ADR-017), so these come straight from the row rather than the session token.
 *
 * @returns the user, or `null` when unauthenticated or not yet synced.
 */
export async function getAppUser(): Promise<AppUser | null> {
  const { userId } = await auth();
  if (!userId) return null;

  const supabase = createServerClient();
  const { data: row } = await supabase
    .from("users")
    .select("id, role, plan")
    .eq("clerk_id", userId)
    .limit(1)
    .maybeSingle();
  if (!row) return null;

  return {
    id: row.id as string,
    role: row.role as UserRole,
    plan: (row.plan ?? "free") as UserPlan,
  };
}
