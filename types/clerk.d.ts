import type { UserRole, UserPlan } from "@/lib/types";

/**
 * Shape of the Clerk session-token claims this app relies on.
 *
 * Configured in the Clerk Dashboard (Sessions → customize session token) as:
 *
 *   {
 *     "metadata": "{{user.public_metadata}}",
 *     "externalId": "{{user.external_id}}"
 *   }
 *
 * `metadata.role`/`metadata.plan` mirror the Supabase `users` row (source of
 * truth) so the middleware can gate routes without a DB hit. `externalId` is the
 * app user id (`users.id`) preserved across the migration; see ADR-017.
 */
declare global {
  interface CustomJwtSessionClaims {
    metadata?: {
      role?: UserRole;
      plan?: UserPlan;
    };
    externalId?: string;
  }

  /** Shape of Clerk `publicMetadata` on this app's users (server and client). */
  interface UserPublicMetadata {
    role?: UserRole;
    plan?: UserPlan;
  }
}

export {};
