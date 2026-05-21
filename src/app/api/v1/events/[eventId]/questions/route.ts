import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

function questionId() {
  return `q_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function error(code: string, message: string, status: number, details?: object) {
  return NextResponse.json({ error: { code, message, ...details } }, { status });
}

// Supabase returns snake_case; map to camelCase for client compatibility
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

export async function POST(req: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;

  const body = await req.json().catch(() => null);
  if (!body) return error("VALIDATION_FAILED", "Corpo inválido.", 422);

  const { authorName, authorContact, text, lgpdAccepted } = body;

  if (!authorName || authorName.trim().length < 2)
    return error("VALIDATION_FAILED", "Nome muito curto.", 422, { details: { field: "authorName" } });
  if (!authorContact || authorContact.trim().length < 5)
    return error("VALIDATION_FAILED", "Informe email ou telefone.", 422, { details: { field: "authorContact" } });
  if (!text || text.trim().length < 10)
    return error("VALIDATION_FAILED", "Pergunta muito curta.", 422, { details: { field: "text", min: 10 } });
  if (text.length > 500)
    return error("VALIDATION_FAILED", "Pergunta muito longa.", 422, { details: { field: "text", max: 500 } });
  if (lgpdAccepted !== true)
    return error("VALIDATION_FAILED", "É preciso aceitar os termos LGPD.", 422, { details: { field: "lgpdAccepted" } });

  const supabase = createServerClient();

  // Verify event exists and is active
  const { data: event } = await supabase
    .from("events")
    .select("id, status, config")
    .eq("id", eventId)
    .limit(1)
    .maybeSingle();

  if (!event) return error("NOT_FOUND", "Evento não encontrado.", 404);
  if (event.status === "ended") return error("EVENT_ENDED", "Este evento foi encerrado.", 409);

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

  const { data: row, error: insertErr } = await supabase
    .from("questions")
    .insert({
      id: questionId(),
      event_id: eventId,
      author_name: authorName.trim(),
      author_contact: authorContact.trim(),
      author_ip: ip,
      text: text.trim(),
      status: "pending",
    })
    .select()
    .single();

  if (insertErr) throw insertErr;
  const question = mapQuestion(row);

  // Broadcast via Supabase Realtime (best-effort)
  try {
    await supabase.channel(`event:${eventId}:questions`).send({
      type: "broadcast",
      event: "question:new",
      payload: question,
    });
  } catch {
    // non-fatal
  }

  return NextResponse.json(question, { status: 201 });
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const url = new URL(req.url);
  const status = url.searchParams.get("status");

  const supabase = createServerClient();
  let query = supabase
    .from("questions")
    .select("*")
    .eq("event_id", eventId)
    .order("created_at");

  if (status) {
    query = query.eq("status", status);
  }

  const { data: rows, error: fetchErr } = await query;
  if (fetchErr) throw fetchErr;

  return NextResponse.json({ questions: (rows ?? []).map(mapQuestion) });
}
