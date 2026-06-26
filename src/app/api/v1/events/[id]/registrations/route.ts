import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { requireEventAccess } from "@/lib/api/auth-guard";
import { createRegistrationSchema } from "@/lib/schemas";
import type { Database } from "@/lib/db/database.types";

const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour

type RegistrationRow = Database["public"]["Tables"]["registrations"]["Row"];

function mapRegistration(row: RegistrationRow) {
  return {
    id: row.id,
    eventId: row.event_id,
    name: row.name,
    email: row.email,
    phone: row.phone ?? null,
    document: row.document ?? null,
    checkedIn: row.checked_in,
    checkedInAt: row.checked_in_at ?? null,
    kitDelivered: row.kit_delivered,
    kitDeliveredAt: row.kit_delivered_at ?? null,
    drawn: row.drawn,
    drawnAt: row.drawn_at ?? null,
    lgpdAccepted: row.lgpd_accepted,
    createdAt: row.created_at,
  };
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: eventId } = await params;

  const guard = await requireEventAccess(eventId, ["admin", "mediador", "owner"]);
  if ("err" in guard) return guard.err;

  const supabase = createServerClient();

  const { data: rows, error } = await supabase
    .from("registrations")
    .select("*")
    .eq("event_id", eventId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return NextResponse.json({ registrations: (rows ?? []).map(mapRegistration) });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: eventId } = await params;
  const supabase = createServerClient();

  const { data: event } = await supabase
    .from("events")
    .select("id, config")
    .eq("id", eventId)
    .limit(1)
    .maybeSingle();

  if (!event) {
    return NextResponse.json({ error: { code: "NOT_FOUND", message: "Evento não encontrado." } }, { status: 404 });
  }

  const regConfig = event.config?.registration ?? {};

  if (!regConfig.enabled) {
    return NextResponse.json({ error: { code: "REGISTRATION_CLOSED", message: "Inscrições não estão abertas." } }, { status: 422 });
  }

  const now = new Date();
  if (regConfig.opensAt && new Date(regConfig.opensAt) > now) {
    return NextResponse.json({ error: { code: "REGISTRATION_NOT_OPEN", message: "As inscrições ainda não começaram." } }, { status: 422 });
  }
  if (regConfig.closesAt && new Date(regConfig.closesAt) < now) {
    return NextResponse.json({ error: { code: "REGISTRATION_ENDED", message: "As inscrições foram encerradas." } }, { status: 422 });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();
  const { count: recentCount } = await supabase
    .from("registrations")
    .select("*", { count: "exact", head: true })
    .eq("author_ip", ip)
    .gte("created_at", windowStart);

  if ((recentCount ?? 0) >= RATE_LIMIT_MAX) {
    return NextResponse.json(
      { error: { code: "RATE_LIMITED", message: "Muitas tentativas. Tente novamente em 1 hora." } },
      { status: 429 },
    );
  }

  const parsed = createRegistrationSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION_FAILED", message: "Dados inválidos.", details: parsed.error.flatten() } },
      { status: 422 },
    );
  }

  const { name, email, phone, document, lgpdAccepted } = parsed.data;
  const id = crypto.randomUUID();

  const { data: existing } = await supabase
    .from("registrations")
    .select("id")
    .eq("event_id", eventId)
    .eq("email", email)
    .limit(1)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: { code: "CONFLICT", message: "Este e-mail já está inscrito neste evento." } }, { status: 409 });
  }

  const { data: row, error: insertErr } = await supabase
    .from("registrations")
    .insert({ id, event_id: eventId, name, email, phone: phone ?? null, document: document ?? null, author_ip: ip, lgpd_accepted: lgpdAccepted })
    .select("*")
    .single();

  if (insertErr) throw insertErr;

  return NextResponse.json(mapRegistration(row), { status: 201 });
}
