import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { submitQuestionSchema } from "@/lib/schemas";

const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour

function questionId() {
  return `q_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function error(code: string, message: string, status: number, details?: object) {
  return NextResponse.json({ error: { code, message, ...details } }, { status });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapQuestion(row: Record<string, any>) {
  return {
    id: row.id,
    eventId: row.event_id,
    authorName: row.author_name,
    authorContact: row.author_contact ?? null,
    authorEmail: row.author_email ?? null,
    text: row.text,
    status: row.status,
    isAnonymous: row.is_anonymous ?? false,
    lgpdAccepted: row.lgpd_accepted ?? false,
    createdAt: row.created_at,
    presentedAt: row.presented_at ?? null,
    answeredAt: row.answered_at ?? null,
    hiddenAt: row.hidden_at ?? null,
    hiddenBy: row.hidden_by ?? null,
  };
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;

  const parsed = submitQuestionSchema.safeParse(
    await req.json().catch(() => null),
  );
  if (!parsed.success) {
    const { fieldErrors } = parsed.error.flatten();
    const [firstField, firstMessages] = Object.entries(fieldErrors)[0] ?? [];
    return error(
      "VALIDATION_FAILED",
      firstMessages?.[0] ?? "Dados inválidos.",
      422,
      { details: { field: firstField } },
    );
  }
  const { authorName, authorContact, authorEmail, text, anonymous, lgpdAccepted } = parsed.data;

  const supabase = createServerClient();

  const { data: event } = await supabase
    .from("events")
    .select("id, status, config")
    .eq("id", eventId)
    .limit(1)
    .maybeSingle();

  if (!event) return error("NOT_FOUND", "Evento não encontrado.", 404);
  if (event.status === "ended") return error("EVENT_ENDED", "Este evento foi encerrado.", 409);

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

  // Rate limiting: max 10 questions per IP per event per hour
  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();
  const { count: recentCount } = await supabase
    .from("questions")
    .select("*", { count: "exact", head: true })
    .eq("event_id", eventId)
    .eq("author_ip", ip)
    .gte("created_at", windowStart);

  if ((recentCount ?? 0) >= RATE_LIMIT_MAX) {
    return error("RATE_LIMITED", "Muitas perguntas enviadas. Tente novamente em 1 hora.", 429);
  }

  const { data: row, error: insertErr } = await supabase
    .from("questions")
    .insert({
      id: questionId(),
      event_id: eventId,
      author_name: authorName.trim(),
      author_contact: authorContact.trim(),
      author_email: authorEmail?.trim() || null,
      author_ip: ip,
      text: text.trim(),
      status: "pending",
      is_anonymous: anonymous ?? false,
      lgpd_accepted: lgpdAccepted,
    })
    .select()
    .single();

  if (insertErr) throw insertErr;
  const question = mapQuestion(row);

  try {
    await supabase.channel(`event:${eventId}:questions`).send({
      type: "broadcast",
      event: "question:new",
      payload: question,
    });
  } catch { /* non-fatal */ }

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
