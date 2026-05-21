import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { auth } from "@/lib/auth";
import { assignMediatorSchema } from "@/lib/schemas";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapUser(row: Record<string, any>) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    createdAt: row.created_at,
    lastSeenAt: row.last_seen_at ?? null,
  };
}

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) {
    return {
      err: NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Autenticação necessária." } },
        { status: 401 },
      ),
    };
  }
  const role = (session.user as { role?: string }).role;
  if (role !== "admin") {
    return {
      err: NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Acesso restrito a administradores." } },
        { status: 403 },
      ),
    };
  }
  return { session };
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin();
  if (guard.err) return guard.err;

  const { id: eventId } = await params;
  const supabase = createServerClient();

  const { data: rows, error: fetchErr } = await supabase
    .from("mediator_assignments")
    .select("user_id, created_at, users(id, name, email, role, created_at, last_seen_at)")
    .eq("event_id", eventId);

  if (fetchErr) throw fetchErr;

  const mediators = (rows ?? [])
    .map((row) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const user = Array.isArray(row.users) ? row.users[0] : (row.users as Record<string, any>);
      return user ? mapUser(user) : null;
    })
    .filter(Boolean);

  return NextResponse.json({ mediators });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin();
  if (guard.err) return guard.err;

  const { id: eventId } = await params;

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
