import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { isEventOwnedBy } from "@/lib/plan-limits";
import { auth } from "@/lib/auth";
import type { UserPlan } from "@/lib/types";

/** Roles recognised by the API authorization layer. */
export type Role = "admin" | "owner" | "mediador" | "superadmin";

/** Authenticated user, resolved from the Clerk session + Supabase `users` row. */
interface GuardUser {
  id: string;
  role: Role;
}

/**
 * Back-compat session shape consumed by route handlers (`guard.session.user`).
 * Mirrors the fields the old NextAuth session exposed; the API guards are the
 * authoritative check, so the values are read straight from the `users` row
 * (source of truth) rather than the Clerk session token. See ADR-017.
 */
interface GuardSession {
  user: {
    id: string;
    role: Role;
    plan: UserPlan;
  };
}

function unauthorized(): NextResponse {
  return NextResponse.json(
    { error: { code: "UNAUTHORIZED", message: "Autenticação necessária." } },
    { status: 401 },
  );
}

function forbidden(): NextResponse {
  return NextResponse.json(
    { error: { code: "FORBIDDEN", message: "Acesso negado." } },
    { status: 403 },
  );
}

function notFound(): NextResponse {
  return NextResponse.json(
    { error: { code: "NOT_FOUND", message: "Evento não encontrado." } },
    { status: 404 },
  );
}

/**
 * Resolves the app user for the current session.
 *
 * Delegates to the Clerk-backed `auth()` adapter (`@/lib/auth`), which maps the
 * Clerk id to the `users` row. Returns `null` when the request is
 * unauthenticated or the Clerk user has no corresponding row yet — both treated
 * as unauthorized.
 */
async function resolveUser(): Promise<{ user: GuardUser; session: GuardSession } | null> {
  const session = await auth();
  if (!session?.user) return null;

  const user: GuardUser = { id: session.user.id, role: session.user.role };
  const guardSession: GuardSession = {
    user: { id: session.user.id, role: session.user.role, plan: session.user.plan },
  };
  return { user, session: guardSession };
}

/**
 * Authenticates the request and checks that the user holds one of `roles`.
 *
 * @returns the session and user on success, or `{ err }` carrying the
 *   `401`/`403` response to return directly.
 */
export async function requireRole(
  roles: Role[],
): Promise<{ session: GuardSession; user: GuardUser } | { err: NextResponse }> {
  const resolved = await resolveUser();
  if (!resolved) return { err: unauthorized() };
  if (!roles.includes(resolved.user.role)) return { err: forbidden() };
  return resolved;
}

/**
 * Authenticates the request, checks the role, and verifies the user may act on
 * `eventId`.
 *
 * - `admin`/`superadmin` have platform-wide access.
 * - `owner` must own the event (returns `404` when not, to avoid enumeration).
 * - `mediador` must have a row in `mediator_assignments` for the event.
 *
 * @returns the session and user on success, or `{ err }` carrying the response.
 */
export async function requireEventAccess(
  eventId: string,
  roles: Role[],
): Promise<{ session: GuardSession; user: GuardUser } | { err: NextResponse }> {
  const guard = await requireRole(roles);
  if ("err" in guard) return guard;
  const { user } = guard;

  if (user.role === "admin" || user.role === "superadmin") return guard;

  if (user.role === "owner") {
    const owns = await isEventOwnedBy(eventId, user.id);
    if (!owns) return { err: notFound() };
    return guard;
  }

  // mediador
  const supabase = createServerClient();
  const { data: assignment } = await supabase
    .from("mediator_assignments")
    .select("event_id")
    .eq("event_id", eventId)
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (!assignment) return { err: forbidden() };
  return guard;
}
