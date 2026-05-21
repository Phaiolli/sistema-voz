import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { auth } from "@/lib/auth";
import { createRegistrationSchema } from "@/lib/schemas";

const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRegistration(row: Record<string, any>) {
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

async function requireAdminOrMediador() {
  const session = await auth();
  if (!session?.user) {
    return { err: NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Autenticação necessária." } }, { status: 401 }) };
  }
  const role = (session.user as { role?: string }).role;
  if (role !== "admin" && role !== "mediador") {
    return { err: NextResponse.json({ error: { code: "FORBIDDEN", message: "Acesso negado." } }, { status: 403 }) };
  }
  return { session, role };
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdminOrMediador();
  if (guard.err) return guard.err;

  const { id: eventId } = await params;
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const regConfig = (event.config as Record<string, any>)?.registration ?? {};

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
