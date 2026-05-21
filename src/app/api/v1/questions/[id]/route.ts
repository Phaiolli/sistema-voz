import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { auth } from "@/lib/auth";
import { patchQuestionSchema } from "@/lib/schemas";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapQuestion(row: Record<string, any>) {
  return {
    id: row.id,
    eventId: row.event_id,
    authorName: row.author_name,
    authorContact: row.author_contact ?? null,
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
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Autenticação necessária." } },
      { status: 401 },
    );
  }
  const role = (session.user as { role?: string }).role;
  if (role !== "admin" && role !== "mediador") {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "Sem permissão para moderar perguntas." } },
      { status: 403 },
    );
  }

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

  if (!existing) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Pergunta não encontrada." } },
      { status: 404 },
    );
  }

  let patch: Record<string, unknown> = {};

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

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Autenticação necessária." } },
      { status: 401 },
    );
  }
  const role = (session.user as { role?: string }).role;
  if (role !== "admin" && role !== "mediador") {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "Sem permissão para apagar perguntas." } },
      { status: 403 },
    );
  }

  const { id } = await params;
  const supabase = createServerClient();

  const { data: existing } = await supabase
    .from("questions")
    .select("id, event_id")
    .eq("id", id)
    .limit(1)
    .maybeSingle();

  if (!existing) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Pergunta não encontrada." } },
      { status: 404 },
    );
  }

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
