import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { requireEventAccess } from "@/lib/api/auth-guard";
import { assignMediatorSchema } from "@/lib/schemas";
import type { Database } from "@/lib/db/database.types";

type UserRow = Database["public"]["Tables"]["users"]["Row"];
type MediatorUser = Pick<UserRow, "id" | "name" | "email" | "role" | "created_at" | "last_seen_at">;

function mapUser(row: MediatorUser) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    createdAt: row.created_at,
    lastSeenAt: row.last_seen_at ?? null,
  };
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: eventId } = await params;

  const guard = await requireEventAccess(eventId, ["admin", "owner"]);
  if ("err" in guard) return guard.err;

  const supabase = createServerClient();

  const { data, error: fetchErr } = await supabase
    .from("mediator_assignments")
    .select("user_id, created_at, users(id, name, email, role, created_at, last_seen_at)")
    .eq("event_id", eventId);

  if (fetchErr) throw fetchErr;

  // The embedded `users` relation cannot be inferred from the hand-written
  // Database type (no Relationships metadata), so we describe the join shape.
  type AssignmentJoinRow = { users: MediatorUser | MediatorUser[] | null };
  const rows = (data ?? []) as unknown as AssignmentJoinRow[];

  const mediators = rows
    .map((row) => {
      const user = Array.isArray(row.users) ? row.users[0] : row.users;
      return user ? mapUser(user) : null;
    })
    .filter(Boolean);

  return NextResponse.json({ mediators });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: eventId } = await params;

  const guard = await requireEventAccess(eventId, ["admin", "owner"]);
  if ("err" in guard) return guard.err;

  const parsed = assignMediatorSchema.safeParse(
    await req.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION_FAILED", message: "Dados inválidos.", details: parsed.error.flatten() } },
      { status: 422 },
    );
  }

  const { userId } = parsed.data;
  const supabase = createServerClient();

  const { data: user } = await supabase
    .from("users")
    .select("id, role")
    .eq("id", userId)
    .limit(1)
    .maybeSingle();

  if (!user) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Usuário não encontrado." } },
      { status: 404 },
    );
  }

  if (user.role !== "mediador") {
    return NextResponse.json(
      { error: { code: "INVALID_ROLE", message: "Usuário não tem role de mediador." } },
      { status: 422 },
    );
  }

  const { data: existing } = await supabase
    .from("mediator_assignments")
    .select("event_id")
    .eq("event_id", eventId)
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { error: { code: "CONFLICT", message: "Mediador já está atribuído a este evento." } },
      { status: 409 },
    );
  }

  const { error: insertErr } = await supabase
    .from("mediator_assignments")
    .insert({ event_id: eventId, user_id: userId });

  if (insertErr) throw insertErr;

  return NextResponse.json({ eventId, userId }, { status: 201 });
}
