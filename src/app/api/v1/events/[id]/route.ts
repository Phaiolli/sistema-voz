import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { auth } from "@/lib/auth";
import { patchEventSchema } from "@/lib/schemas";

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

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin();
  if (guard.err) return guard.err;

  const { id } = await params;
  const supabase = createServerClient();

  const { data: row } = await supabase
    .from("events")
    .select("*")
    .eq("id", id)
    .limit(1)
    .maybeSingle();

  if (!row) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Evento não encontrado." } },
      { status: 404 },
    );
  }

  return NextResponse.json(mapEvent(row));
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin();
  if (guard.err) return guard.err;

  const { id } = await params;

  const parsed = patchEventSchema.safeParse(
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

  if (body.slug) {
    const { data: conflict } = await supabase
      .from("events")
      .select("id")
      .eq("slug", body.slug)
      .neq("id", id)
      .limit(1)
      .maybeSingle();

    if (conflict) {
      return NextResponse.json(
        { error: { code: "CONFLICT", message: "Já existe um evento com este slug." } },
        { status: 409 },
      );
    }
  }

  const patch: Record<string, unknown> = {};
  if (body.name !== undefined) patch.name = body.name;
  if (body.slug !== undefined) patch.slug = body.slug;
  if (body.startsAt !== undefined) patch.starts_at = body.startsAt;
  if (body.endsAt !== undefined) patch.ends_at = body.endsAt;
  if (body.place !== undefined) patch.place = body.place;
  if (body.address !== undefined) patch.address = body.address;
  if (body.status !== undefined) patch.status = body.status;
  if (body.about !== undefined) patch.about = body.about;
  if (body.theme !== undefined) patch.theme = body.theme;
  if (body.config !== undefined) patch.config = body.config;
  patch.updated_at = new Date().toISOString();

  const { data: row, error: updateErr } = await supabase
    .from("events")
    .update(patch)
    .eq("id", id)
    .select()
    .single();

  if (updateErr) {
    if (updateErr.code === "PGRST116") {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Evento não encontrado." } },
        { status: 404 },
      );
    }
    throw updateErr;
  }

  return NextResponse.json(mapEvent(row));
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin();
  if (guard.err) return guard.err;

  const { id } = await params;
  const supabase = createServerClient();

  const { error: deleteErr } = await supabase
    .from("events")
    .delete()
    .eq("id", id);

  if (deleteErr) throw deleteErr;

  return new NextResponse(null, { status: 204 });
}
