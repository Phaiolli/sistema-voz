import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { auth } from "@/lib/auth";
import { patchUserSchema } from "@/lib/schemas";
import bcrypt from "bcryptjs";
import type { Database } from "@/lib/db/database.types";

type UserRow = Database["public"]["Tables"]["users"]["Row"];
type UserPublic = Pick<UserRow, "id" | "name" | "email" | "role" | "created_at" | "last_seen_at">;

function mapUser(row: UserPublic) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    createdAt: row.created_at,
    lastSeenAt: row.last_seen_at ?? null,
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
  const role = session.user.role;
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
    .from("users")
    .select("id, name, email, role, created_at, last_seen_at")
    .eq("id", id)
    .limit(1)
    .maybeSingle();

  if (!row) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Usuário não encontrado." } },
      { status: 404 },
    );
  }

  return NextResponse.json(mapUser(row));
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin();
  if (guard.err) return guard.err;

  const { id } = await params;

  const parsed = patchUserSchema.safeParse(
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

  if (body.email) {
    const { data: conflict } = await supabase
      .from("users")
      .select("id")
      .eq("email", body.email)
      .neq("id", id)
      .limit(1)
      .maybeSingle();

    if (conflict) {
      return NextResponse.json(
        { error: { code: "CONFLICT", message: "Já existe um usuário com este e-mail." } },
        { status: 409 },
      );
    }
  }

  const patch: Database["public"]["Tables"]["users"]["Update"] = {};
  if (body.name !== undefined) patch.name = body.name;
  if (body.email !== undefined) patch.email = body.email;
  if (body.role !== undefined) patch.role = body.role;
  if (body.password !== undefined) {
    patch.password_hash = await bcrypt.hash(body.password, 12);
  }

  const { data: row, error: updateErr } = await supabase
    .from("users")
    .update(patch)
    .eq("id", id)
    .select("id, name, email, role, created_at, last_seen_at")
    .single();

  if (updateErr) {
    if (updateErr.code === "PGRST116") {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Usuário não encontrado." } },
        { status: 404 },
      );
    }
    throw updateErr;
  }

  return NextResponse.json(mapUser(row));
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin();
  if (guard.err) return guard.err;

  const { id } = await params;
  const supabase = createServerClient();

  const { error: deleteErr } = await supabase
    .from("users")
    .delete()
    .eq("id", id);

  if (deleteErr) throw deleteErr;

  return new NextResponse(null, { status: 204 });
}
