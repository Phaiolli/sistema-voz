import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { auth } from "@/lib/auth";
import { createUserSchema } from "@/lib/schemas";
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

export async function GET(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard.err) return guard.err;

  const roleFilter = req.nextUrl.searchParams.get("role");
  const supabase = createServerClient();

  let query = supabase
    .from("users")
    .select("id, name, email, role, created_at, last_seen_at")
    .order("created_at", { ascending: false });

  if (roleFilter === "admin" || roleFilter === "mediador") {
    query = query.eq("role", roleFilter);
  }

  const { data: rows, error: fetchErr } = await query;
  if (fetchErr) throw fetchErr;

  return NextResponse.json({ users: (rows ?? []).map(mapUser) });
}

export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard.err) return guard.err;

  const parsed = createUserSchema.safeParse(
    await req.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION_FAILED", message: "Dados inválidos.", details: parsed.error.flatten() } },
      { status: 422 },
    );
  }

  const { name, email, password, role } = parsed.data;
  const supabase = createServerClient();

  const { data: existing } = await supabase
    .from("users")
    .select("id")
    .eq("email", email)
    .limit(1)
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { error: { code: "CONFLICT", message: "Já existe um usuário com este e-mail." } },
      { status: 409 },
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const id = crypto.randomUUID();

  const { data: row, error: insertErr } = await supabase
    .from("users")
    .insert({ id, name, email, role, password_hash: passwordHash })
    .select("id, name, email, role, created_at, last_seen_at")
    .single();

  if (insertErr) throw insertErr;

  return NextResponse.json(mapUser(row), { status: 201 });
}
