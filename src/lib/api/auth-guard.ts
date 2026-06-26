import { NextResponse } from "next/server";
import type { Session } from "next-auth";
import { auth } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import { isEventOwnedBy } from "@/lib/plan-limits";

/** Roles recognised by the API authorization layer. */
export type Role = "admin" | "owner" | "mediador" | "superadmin";

/** Authenticated user as resolved from the NextAuth session. */
interface GuardUser {
  id: string;
  role: Role;
}

/**
 * Reads `id` and `role` off the session user.
 *
 * The NextAuth `Session.user` augmentation lives in Lote 3; until then the
 * extra fields are not on the typed shape, so this is the single isolated cast.
 */
// NOTE: cast isolado até a augmentation de next-auth (Lote 3 — tipos)
function getSessionUser(session: Session): GuardUser {
  const user = session.user as unknown as { id: string; role: Role };
  return { id: user.id, role: user.role };
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
 * Authenticates the request and checks that the user holds one of `roles`.
 *
 * @returns the session and user on success, or `{ err }` carrying the
 *   `401`/`403` response to return directly.
 */
export async function requireRole(
  roles: Role[],
): Promise<{ session: Session; user: GuardUser } | { err: NextResponse }> {
  const session = await auth();
  if (!session?.user) return { err: unauthorized() };
  const user = getSessionUser(session);
  if (!roles.includes(user.role)) return { err: forbidden() };
  return { session, user };
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
): Promise<{ session: Session; user: GuardUser } | { err: NextResponse }> {
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
