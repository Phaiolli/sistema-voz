"use client";

import { useUser } from "@clerk/nextjs";
import type { UserRole, UserPlan } from "@/lib/types";

/** Client-side view of the current user, mirroring the fields the UI needs. */
interface AppUserView {
  isLoaded: boolean;
  role: UserRole | undefined;
  plan: UserPlan | undefined;
  name: string | undefined;
  email: string | undefined;
}

/**
 * Reads the signed-in user from Clerk for client components.
 *
 * `role` comes from Clerk `publicMetadata` (mirrored from the Supabase `users`
 * row per ADR-017); `name`/`email` from the Clerk profile. Replaces the previous
 * `useSession()` from next-auth.
 */
export function useAppUser(): AppUserView {
  const { user, isLoaded } = useUser();
  if (!isLoaded || !user) {
    return { isLoaded, role: undefined, plan: undefined, name: undefined, email: undefined };
  }
  return {
    isLoaded,
    role: user.publicMetadata?.role as UserRole | undefined,
    plan: user.publicMetadata?.plan as UserPlan | undefined,
    name: user.fullName ?? undefined,
    email: user.primaryEmailAddress?.emailAddress ?? undefined,
  };
}
