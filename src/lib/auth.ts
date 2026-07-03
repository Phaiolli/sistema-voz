/**
 * Clerk-backed session adapter (ADR-017).
 *
 * Replaces the previous NextAuth instance. It preserves the `await auth()` →
 * `session.user` shape the route handlers were built around, so the API routes
 * that read `session.user.{id,role,plan}` keep working unchanged while the
 * underlying provider is Clerk. New code should prefer `getAppUser()` from
 * `@/lib/api/current-user` directly.
 */
import { getAppUser } from "@/lib/api/current-user";
import type { UserRole, UserPlan } from "@/lib/types";

/** Minimal session shape consumed by the API route handlers. */
export interface AppSession {
  user: {
    id: string;
    role: UserRole;
    plan: UserPlan;
  };
}

/**
 * Resolves the current session from Clerk, or `null` when unauthenticated.
 *
 * @example
 * const session = await auth();
 * if (!session?.user) return unauthorized();
 */
export async function auth(): Promise<AppSession | null> {
  const user = await getAppUser();
  return user ? { user } : null;
}
