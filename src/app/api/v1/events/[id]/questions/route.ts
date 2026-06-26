import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { submitQuestionSchema } from "@/lib/schemas";
import { getEventQuestionCount, FREE_QUESTION_LIMIT } from "@/lib/plan-limits";
import { requireEventAccess } from "@/lib/api/auth-guard";
import { mapQuestion, mapQuestionPublic } from "@/lib/api/mappers";
import type { QuestionFullRow, QuestionPublicSource } from "@/lib/api/mappers";
import type { Database } from "@/lib/db/database.types";

type QuestionRow = Database["public"]["Tables"]["questions"]["Row"];
type QuestionStatus = QuestionRow["status"];

const QUESTION_STATUSES: readonly QuestionStatus[] = ["pending", "next", "answered", "hidden"];

function isQuestionStatus(value: string): value is QuestionStatus {
  return (QUESTION_STATUSES as readonly string[]).includes(value);
}

const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour

function questionId() {
  return `q_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function error(code: string, message: string, status: number, details?: object) {
  return NextResponse.json({ error: { code, message, ...details } }, { status });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: eventId } = await params;

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
    .select("id, status, config, organizer_id, is_paid")
    .eq("id", eventId)
    .limit(1)
    .maybeSingle();

  if (!event) return error("NOT_FOUND", "Evento não encontrado.", 404);
  if (event.status === "ended") return error("EVENT_ENDED", "Este evento foi encerrado.", 409);

  // Billing is per-event: a paid event has unlimited questions; an unpaid one is
  // capped at the free question limit.
  if (!event.is_paid) {
    const questionCount = await getEventQuestionCount(eventId);
    if (questionCount >= FREE_QUESTION_LIMIT) {
      return error("QUESTION_LIMIT_REACHED", "Este evento atingiu o limite de perguntas do plano gratuito.", 403);
    }
  }

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
      payload: mapQuestionPublic(row),
    });
  } catch { /* non-fatal */ }

  return NextResponse.json(question, { status: 201 });
}

// Explicit column list — never select author_ip (PII) for the API response.
const QUESTION_COLUMNS =
  "id, event_id, author_name, author_contact, author_email, text, status, is_anonymous, lgpd_accepted, created_at, presented_at, answered_at, hidden_at, hidden_by";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: eventId } = await params;
  const url = new URL(req.url);
  const status = url.searchParams.get("status");

  // Moderators/owners/admins get the full (non-IP) projection; everyone else
  // gets the minimal public projection with no PII.
  const guard = await requireEventAccess(eventId, ["admin", "mediador", "owner", "superadmin"]);
  const authorized = !("err" in guard);

  const supabase = createServerClient();
  // The select column list is decided at runtime, so the parsed row type cannot
  // be inferred from the literal; we narrow it explicitly per branch below.
  const columns = authorized ? QUESTION_COLUMNS : "id, event_id, author_name, text, status, is_anonymous";
  let query = supabase
    .from("questions")
    .select(columns)
    .eq("event_id", eventId)
    .order("created_at");

  if (status && isQuestionStatus(status)) {
    query = query.eq("status", status);
  }

  const { data: rows, error: fetchErr } = await query;
  if (fetchErr) throw fetchErr;

  const safeRows = (rows ?? []) as unknown[];
  const questions = authorized
    ? (safeRows as QuestionFullRow[]).map(mapQuestion)
    : (safeRows as QuestionPublicSource[]).map(mapQuestionPublic);
  return NextResponse.json({ questions });
}
