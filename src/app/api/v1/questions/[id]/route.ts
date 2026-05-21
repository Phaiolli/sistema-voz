import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

type Action = "setNext" | "markAnswered" | "hide" | "restore";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapQuestion(row: Record<string, any>) {
  return {
    id: row.id,
    eventId: row.event_id,
    authorName: row.author_name,
    authorContact: row.author_contact ?? null,
    authorIp: row.author_ip ?? null,
    text: row.text,
    status: row.status,
    createdAt: row.created_at,
    presentedAt: row.presented_at ?? null,
    answeredAt: row.answered_at ?? null,
    hiddenAt: row.hidden_at ?? null,
    hiddenBy: row.hidden_by ?? null,
  };
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => null) as { action: Action } | null;
  if (!body?.action) {
    return NextResponse.json({ error: { code: "VALIDATION_FAILED", message: "Ação inválida." } }, { status: 422 });
  }

  const supabase = createServerClient();

  const { data: existing } = await supabase
    .from("questions")
    .select("*")
    .eq("id", id)
    .limit(1)
    .maybeSingle();

  if (!existing) {
    return NextResponse.json({ error: { code: "NOT_FOUND", message: "Pergunta não encontrada." } }, { status: 404 });
  }

  let patch: Record<string, unknown> = {};

  if (body.action === "setNext") {
    // Revert any current "next" in same event to "pending" first
    await supabase
      .from("questions")
      .update({ status: "pending" })
      .eq("event_id", existing.event_id)
      .eq("status", "next");
    patch = { status: "next", presented_at: new Date().toISOString() };
  } else if (body.action === "markAnswered") {
    patch = { status: "answered", answered_at: new Date().toISOString() };
  } else if (body.action === "hide") {
    patch = { status: "hidden", hidden_at: new Date().toISOString() };
  } else if (body.action === "restore") {
    patch = { status: "pending" };
  }

  const { data: row, error: updateErr } = await supabase
    .from("questions")
    .update(patch)
    .eq("id", id)
    .select()
    .single();

  if (updateErr) throw updateErr;
  const updated = mapQuestion(row);

  try {
    await supabase.channel(`event:${updated.eventId}:questions`).send({
      type: "broadcast",
      event: "question:updated",
      payload: updated,
    });
  } catch { /* non-fatal */ }

  return NextResponse.json(updated);
}
