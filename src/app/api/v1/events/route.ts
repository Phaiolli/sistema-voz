import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { auth } from "@/lib/auth";
import { createEventSchema } from "@/lib/schemas";
import { getOwnerEventCount, FREE_EVENT_LIMIT } from "@/lib/plan-limits";
import type { EventStatus, EventTheme, EventConfig } from "@/lib/types";

interface EventRow {
  id: string;
  slug: string;
  name: string;
  starts_at: string;
  ends_at: string;
  place: string;
  address: string;
  status: EventStatus;
  about: string;
  theme: EventTheme | null;
  config: EventConfig | null;
  organizer_id: string;
  created_at: string;
  updated_at: string;
}

function mapEvent(row: EventRow) {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    place: row.place,
    address: row.address,
    status: row.status,
    about: row.about,
    theme: row.theme ?? {},
    config: row.config ?? {},
    organizerId: row.organizer_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function requireAuth(roles: string[]) {
  const session = await auth();
  if (!session?.user) {
    return {
      err: NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Autenticação necessária." } },
        { status: 401 },
      ),
    };
  }
  const role = (session.user as { role?: string }).role ?? "";
  if (!roles.includes(role)) {
    return {
      err: NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Acesso negado." } },
        { status: 403 },
      ),
    };
  }
  return { session };
}

export async function GET() {
  const guard = await requireAuth(["admin", "owner"]);
  if (guard.err) return guard.err;

  const session = guard.session!;
  const role = (session.user as { role?: string }).role ?? "";
  const userId = (session.user as { id?: string }).id ?? "";

  const supabase = createServerClient();
  let query = supabase.from("events").select("*").order("starts_at", { ascending: false });

  if (role === "owner") {
    query = query.eq("organizer_id", userId);
  }

  const { data: rows, error: fetchErr } = await query;
  if (fetchErr) throw fetchErr;

  return NextResponse.json({ events: (rows ?? []).map(mapEvent) });
}

export async function POST(req: NextRequest) {
  const guard = await requireAuth(["admin", "owner"]);
  if (guard.err) return guard.err;

  const session = guard.session!;
  const role = (session.user as { role?: string }).role ?? "";
  const userId = (session.user as { id?: string }).id ?? "";

  const parsed = createEventSchema.safeParse(
    await req.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION_FAILED", message: "Dados inválidos.", details: parsed.error.flatten() } },
      { status: 422 },
    );
  }

  if (role === "owner") {
    const count = await getOwnerEventCount(userId);
    if (count >= FREE_EVENT_LIMIT) {
      return NextResponse.json(
        {
          error: {
            code: "PAYMENT_REQUIRED",
            message: "Você atingiu o limite do plano gratuito. Crie um checkout para adicionar mais eventos.",
            checkoutRequired: true,
          },
        },
        { status: 402 },
      );
    }
  }

  const body = parsed.data;
  const supabase = createServerClient();

  const { data: existing } = await supabase
    .from("events")
    .select("id")
    .eq("slug", body.slug)
    .limit(1)
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { error: { code: "CONFLICT", message: "Já existe um evento com este slug." } },
      { status: 409 },
    );
  }

  const id = crypto.randomUUID();
  const organizerId = role === "owner" ? userId : (session.user as { id: string }).id;

  const { data: row, error: insertErr } = await supabase
    .from("events")
    .insert({
      id,
      slug: body.slug,
      name: body.name,
      starts_at: body.startsAt,
      ends_at: body.endsAt,
      place: body.place,
      address: body.address,
      status: body.status,
      about: body.about,
      theme: body.theme,
      config: body.config,
      organizer_id: organizerId,
    })
    .select()
    .single();

  if (insertErr) throw insertErr;

  return NextResponse.json(mapEvent(row), { status: 201 });
}
