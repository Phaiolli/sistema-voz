import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { auth } from "@/lib/auth";
import { patchRegistrationSchema } from "@/lib/schemas";

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

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; regId: string }> }) {
  const guard = await requireAdminOrMediador();
  if (guard.err) return guard.err;

  const { id: eventId, regId } = await params;

  const parsed = patchRegistrationSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION_FAILED", message: "Dados inválidos.", details: parsed.error.flatten() } },
      { status: 422 },
    );
  }

  const supabase = createServerClient();
  const now = new Date().toISOString();
  const patch: Record<string, unknown> = {};

  if (parsed.data.checkedIn !== undefined) {
    patch.checked_in = parsed.data.checkedIn;
    patch.checked_in_at = parsed.data.checkedIn ? now : null;
  }
  if (parsed.data.kitDelivered !== undefined) {
    patch.kit_delivered = parsed.data.kitDelivered;
    patch.kit_delivered_at = parsed.data.kitDelivered ? now : null;
  }

  const { data: row, error } = await supabase
    .from("registrations")
    .update(patch)
    .eq("id", regId)
    .eq("event_id", eventId)
    .select("*")
    .single();

  if (error || !row) {
    return NextResponse.json({ error: { code: "NOT_FOUND", message: "Inscrição não encontrada." } }, { status: 404 });
  }

  const updated = {
    id: row.id,
    eventId: row.event_id,
    name: row.name,
    email: row.email,
    checkedIn: row.checked_in,
    checkedInAt: row.checked_in_at ?? null,
    kitDelivered: row.kit_delivered,
    kitDeliveredAt: row.kit_delivered_at ?? null,
    drawn: row.drawn,
    lgpdAccepted: row.lgpd_accepted,
    createdAt: row.created_at,
  };

  // Notify other connected mediators via Realtime
  await supabase.channel(`event:${eventId}:registrations`).send({
    type: "broadcast",
    event: "registration:updated",
    payload: updated,
  });

  return NextResponse.json(updated);
}
