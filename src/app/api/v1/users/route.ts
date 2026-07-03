import { NextRequest, NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { createServerClient } from "@/lib/supabase";
import { requireRole } from "@/lib/api/auth-guard";
import { createUserSchema } from "@/lib/schemas";
import { splitName } from "@/lib/api/clerk-users";
import { logError } from "@/lib/log";
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

export async function GET(req: NextRequest) {
  const guard = await requireRole(["admin", "superadmin"]);
  if ("err" in guard) return guard.err;

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
  const guard = await requireRole(["admin", "superadmin"]);
  if ("err" in guard) return guard.err;

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

  // Clerk owns the credential (ADR-017): create the identity there first, then
  // mirror the row into Supabase. The `user.created` webhook upserts the same
  // row (by clerk_id), so this insert uses upsert to stay race-free.
  const { firstName, lastName } = splitName(name);
  let clerkId: string;
  try {
    const client = await clerkClient();
    const clerkUser = await client.users.createUser({
      emailAddress: [email],
      password,
      firstName,
      lastName,
      publicMetadata: { role, plan: "free" },
    });
    clerkId = clerkUser.id;
  } catch (err) {
    logError("users.create.clerk", err);
    return NextResponse.json(
      { error: { code: "CONFLICT", message: "Não foi possível criar o usuário. Verifique o e-mail e a senha." } },
      { status: 409 },
    );
  }

  const { data: row, error: insertErr } = await supabase
    .from("users")
    .upsert(
      { id: clerkId, clerk_id: clerkId, name, email, role, plan: "free" },
      { onConflict: "clerk_id" },
    )
    .select("id, name, email, role, created_at, last_seen_at")
    .single();

  if (insertErr) throw insertErr;

  return NextResponse.json(mapUser(row), { status: 201 });
}
