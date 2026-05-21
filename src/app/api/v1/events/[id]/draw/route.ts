import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { auth } from "@/lib/auth";

async function requireAdminOrMediador() {
  const session = await auth();
  if (!session?.user) {
    return { err: NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Autenticação necessária." } }, { status: 401 }) };
  }
  const role = (session.user as { role?: string }).role;
  if (role !== "admin" && role !== "mediador") {
    return { err: NextResponse.json({ error: { code: "FORBIDDEN", message: "Acesso negado." } }, { status: 403 }) };
  }
  return { session };
}

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdminOrMediador();
  if (guard.err) return guard.err;

  const { id: eventId } = await params;
  const supabase = createServerClient();

  const { data: eligible, error } = await supabase
    .from("registrations")
    .select("id, name, email")
    .eq("event_id", eventId)
    .eq("drawn", false)
    .eq("checked_in", true);

  if (error) throw error;

  if (!eligible || eligible.length === 0) {
    return NextResponse.json(
      { error: { code: "NO_ELIGIBLE", message: "Nenhum inscrito disponível para sorteio. Apenas inscritos com check-in participam." } },
      { status: 409 },
    );
  }

  const winner = eligible[Math.floor(Math.random() * eligible.length)];
  const now = new Date().toISOString();

  const { error: updateErr } = await supabase
    .from("registrations")
    .update({ drawn: true, drawn_at: now })
    .eq("id", winner.id);

  if (updateErr) throw updateErr;

  return NextResponse.json({
    winner: { id: winner.id, name: winner.name, email: winner.email },
    remainingCount: eligible.length - 1,
  });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || (session.user as { role?: string }).role !== "admin") {
    return NextResponse.json({ error: { code: "FORBIDDEN", message: "Apenas administradores podem resetar o sorteio." } }, { status: 403 });
  }

  const { id: eventId } = await params;
  const supabase = createServerClient();

  const { error } = await supabase
    .from("registrations")
    .update({ drawn: false, drawn_at: null })
    .eq("event_id", eventId);

  if (error) throw error;

  return NextResponse.json({ reset: true });
}
