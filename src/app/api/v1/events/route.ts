import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { auth } from "@/lib/auth";
import { createEventSchema } from "@/lib/schemas";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapEvent(row: Record<string, any>) {
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

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) {
    return {
      err: NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Autenticação necessária." } },
        { status: 401 },
      ),
    };
  }
  const role = (session.user as { role?: string }).role;
  if (role !== "admin") {
    return {
      err: NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Acesso restrito a administradores." } },
        { status: 403 },
      ),
    };
  }
  return { session };
}

export async function GET() {
  const guard = await requireAdmin();
  if (guard.err) return guard.err;

  const supabase = createServerClient();
  const { data: rows, error: fetchErr } = await supabase
    .from("events")
    .select("*")
    .order("starts_at", { ascending: false });

  if (fetchErr) throw fetchErr;

  return NextResponse.json({ events: (rows ?? []).map(mapEvent) });
}

export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard.err) return guard.err;

  const parsed = createEventSchema.safeParse(
    await req.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION_FAILED", message: "Dados inválidos.", details: parsed.error.flatten() } },
      { status: 422 },
    );
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
  const organizerId = (guard.session!.user as { id: string }).id;

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
