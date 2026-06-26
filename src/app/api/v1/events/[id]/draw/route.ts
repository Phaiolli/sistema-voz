import { NextRequest, NextResponse } from "next/server";
import { randomInt } from "crypto";
import { createServerClient } from "@/lib/supabase";
import { requireEventAccess } from "@/lib/api/auth-guard";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: eventId } = await params;

  const guard = await requireEventAccess(eventId, ["admin", "mediador", "owner", "superadmin"]);
  if ("err" in guard) return guard.err;

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

  const winner = eligible[randomInt(eligible.length)];
  const now = new Date().toISOString();

  const { error: updateErr } = await supabase
    .from("registrations")
    .update({ drawn: true, drawn_at: now })
    .eq("id", winner.id)
    .eq("drawn", false); // idempotent: don't redraw an already-drawn registration

  if (updateErr) throw updateErr;

  return NextResponse.json({
    winner: { id: winner.id, name: winner.name, email: winner.email },
    remainingCount: eligible.length - 1,
  });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: eventId } = await params;

  const guard = await requireEventAccess(eventId, ["admin", "owner", "superadmin"]);
  if ("err" in guard) return guard.err;

  const supabase = createServerClient();

  const { error } = await supabase
    .from("registrations")
    .update({ drawn: false, drawn_at: null })
    .eq("event_id", eventId);

  if (error) throw error;

  return NextResponse.json({ reset: true });
}
