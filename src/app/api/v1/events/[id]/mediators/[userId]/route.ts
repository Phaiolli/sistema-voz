import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { requireRole } from "@/lib/api/auth-guard";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> },
) {
  const guard = await requireRole(["admin", "superadmin"]);
  if ("err" in guard) return guard.err;

  const { id: eventId, userId } = await params;
  const supabase = createServerClient();

  const { data: existing } = await supabase
    .from("mediator_assignments")
    .select("event_id")
    .eq("event_id", eventId)
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  if (!existing) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Atribuição não encontrada." } },
      { status: 404 },
    );
  }

  const { error: deleteErr } = await supabase
    .from("mediator_assignments")
    .delete()
    .eq("event_id", eventId)
    .eq("user_id", userId);

  if (deleteErr) throw deleteErr;

  return new NextResponse(null, { status: 204 });
}
