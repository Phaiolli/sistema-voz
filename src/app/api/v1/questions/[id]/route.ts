import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { requireEventAccess } from "@/lib/api/auth-guard";
import { patchQuestionSchema } from "@/lib/schemas";
import { mapQuestionModeration, mapQuestionPublic } from "@/lib/api/mappers";
import type { Database } from "@/lib/db/database.types";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const parsed = patchQuestionSchema.safeParse(
    await req.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION_FAILED", message: "Ação inválida.", details: parsed.error.flatten() } },
      { status: 422 },
    );
  }
  const { action } = parsed.data;

  const supabase = createServerClient();

  const { data: existing } = await supabase
    .from("questions")
    .select("*")
    .eq("id", id)
    .limit(1)
    .maybeSingle();

  // Resolve existence (404) before authorization (403) to avoid leaking which
  // question ids exist to a user without access.
  if (!existing) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Pergunta não encontrada." } },
      { status: 404 },
    );
  }

  const guard = await requireEventAccess(existing.event_id as string, ["admin", "mediador", "owner"]);
  if ("err" in guard) return guard.err;

  let patch: Database["public"]["Tables"]["questions"]["Update"] = {};

  if (action === "setNext") {
    await supabase
      .from("questions")
      .update({ status: "pending" })
      .eq("event_id", existing.event_id)
      .eq("status", "next");
    patch = { status: "next", presented_at: new Date().toISOString() };
  } else if (action === "markAnswered") {
    patch = { status: "answered", answered_at: new Date().toISOString() };
  } else if (action === "hide") {
    patch = { status: "hidden", hidden_at: new Date().toISOString() };
  } else if (action === "restore") {
    patch = { status: "pending" };
  }

  const { data: row, error: updateErr } = await supabase
    .from("questions")
    .update(patch)
    .eq("id", id)
    .select()
    .single();

  if (updateErr) throw updateErr;
  const updated = mapQuestionModeration(row);

  try {
    await supabase.channel(`event:${updated.eventId}:questions`).send({
      type: "broadcast",
      event: "question:updated",
      payload: mapQuestionPublic(row),
    });
  } catch { /* non-fatal */ }

  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createServerClient();

  const { data: existing } = await supabase
    .from("questions")
    .select("id, event_id")
    .eq("id", id)
    .limit(1)
    .maybeSingle();

  // 404 before 403 to avoid leaking question existence.
  if (!existing) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Pergunta não encontrada." } },
      { status: 404 },
    );
  }

  const guard = await requireEventAccess(existing.event_id as string, ["admin", "mediador", "owner"]);
  if ("err" in guard) return guard.err;

  const { error: deleteErr } = await supabase
    .from("questions")
    .delete()
    .eq("id", id);

  if (deleteErr) throw deleteErr;

  try {
    await supabase.channel(`event:${existing.event_id}:questions`).send({
      type: "broadcast",
      event: "question:deleted",
      payload: { id },
    });
  } catch { /* non-fatal */ }

  return new NextResponse(null, { status: 204 });
}
