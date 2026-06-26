import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { requireEventAccess } from "@/lib/api/auth-guard";
import { patchRegistrationSchema } from "@/lib/schemas";
import { logError } from "@/lib/log";
import type { Database } from "@/lib/db/database.types";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; regId: string }> }) {
  const { id: eventId, regId } = await params;

  const guard = await requireEventAccess(eventId, ["admin", "mediador", "owner", "superadmin"]);
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
  const patch: Database["public"]["Tables"]["registrations"]["Update"] = {};

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

/**
 * Exerce o direito de eliminação do titular (LGPD art. 18, VI) de forma
 * MEDIADA pelo organizador. Participantes/inscritos não possuem conta, logo o
 * pedido de exclusão é encaminhado ao owner/admin/mediador do evento, que aciona
 * esta rota.
 *
 * Em vez de hard-delete, a inscrição é ANONIMIZADA: os campos de PII são
 * removidos, mas `id`, `event_id` e o estado de check-in/sorteio são mantidos
 * para preservar a integridade das contagens e do sorteio do evento.
 */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; regId: string }> }) {
  const { id: eventId, regId } = await params;

  const guard = await requireEventAccess(eventId, ["admin", "mediador", "owner", "superadmin"]);
  if ("err" in guard) return guard.err;

  const supabase = createServerClient();

  // `name` e `email` são NOT NULL no schema (e há índice único por
  // (event_id, email)); usamos sentinelas. `phone`/`document` são nullable.
  const { data: row, error } = await supabase
    .from("registrations")
    .update({
      name: "[removido]",
      email: `removed_${regId}@voz.app`,
      phone: null,
      document: null,
    })
    .eq("id", regId)
    .eq("event_id", eventId)
    .select("id")
    .single();

  if (error || !row) {
    return NextResponse.json({ error: { code: "NOT_FOUND", message: "Inscrição não encontrada." } }, { status: 404 });
  }

  // Notify other connected mediators so the anonymized row is reflected.
  try {
    await supabase.channel(`event:${eventId}:registrations`).send({
      type: "broadcast",
      event: "registration:anonymized",
      payload: { id: regId },
    });
  } catch (err) { logError("registrations.delete.broadcast", err); }

  return NextResponse.json({ anonymized: true });
}
