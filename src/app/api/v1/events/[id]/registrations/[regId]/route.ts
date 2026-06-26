import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { requireEventAccess } from "@/lib/api/auth-guard";
import { patchRegistrationSchema } from "@/lib/schemas";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; regId: string }> }) {
  const { id: eventId, regId } = await params;

  const guard = await requireEventAccess(eventId, ["admin", "mediador", "owner"]);
  if ("err" in guard) return guard.err;

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
  try {
    await supabase.channel(`event:${eventId}:registrations`).send({
      type: "broadcast",
      event: "registration:updated",
      payload: updated,
    });
  } catch { /* non-fatal */ }

  return NextResponse.json(updated);
}
