import { NextRequest, NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { createServerClient } from "@/lib/supabase";
import { requireRole } from "@/lib/api/auth-guard";
import { patchUserSchema } from "@/lib/schemas";
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

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireRole(["admin", "superadmin"]);
  if ("err" in guard) return guard.err;

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
  const guard = await requireRole(["admin", "superadmin"]);
  if ("err" in guard) return guard.err;

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

  // Resolve the Clerk identity so the change is mirrored there (ADR-017).
  const { data: target } = await supabase
    .from("users")
    .select("clerk_id")
    .eq("id", id)
    .limit(1)
    .maybeSingle();

  if (!target) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Usuário não encontrado." } },
      { status: 404 },
    );
  }

  const clerkId = target.clerk_id;
  if (clerkId) {
    try {
      const client = await clerkClient();
      if (body.name !== undefined || body.password !== undefined) {
        const params: { firstName?: string; lastName?: string; password?: string } = {};
        if (body.name !== undefined) {
          const { firstName, lastName } = splitName(body.name);
          params.firstName = firstName;
          params.lastName = lastName;
        }
        if (body.password !== undefined) params.password = body.password;
        await client.users.updateUser(clerkId, params);
      }
      if (body.role !== undefined) {
        await client.users.updateUserMetadata(clerkId, { publicMetadata: { role: body.role } });
      }
      if (body.email !== undefined) {
        await client.emailAddresses.createEmailAddress({
          userId: clerkId,
          emailAddress: body.email,
          verified: true,
          primary: true,
        });
      }
    } catch (err) {
      logError("users.update.clerk", err);
      return NextResponse.json(
        { error: { code: "CONFLICT", message: "Não foi possível atualizar o usuário. Verifique o e-mail e a senha." } },
        { status: 409 },
      );
    }
  }

  // Password lives in Clerk only; it is never mirrored to Supabase.
  const patch: Database["public"]["Tables"]["users"]["Update"] = {};
  if (body.name !== undefined) patch.name = body.name;
  if (body.email !== undefined) patch.email = body.email;
  if (body.role !== undefined) patch.role = body.role;

  if (Object.keys(patch).length === 0) {
    const { data: row } = await supabase
      .from("users")
      .select("id, name, email, role, created_at, last_seen_at")
      .eq("id", id)
      .maybeSingle();
    if (!row) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Usuário não encontrado." } },
        { status: 404 },
      );
    }
    return NextResponse.json(mapUser(row));
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
  const guard = await requireRole(["admin", "superadmin"]);
  if ("err" in guard) return guard.err;

  const { id } = await params;
  const supabase = createServerClient();

  // Delete the Clerk identity (also fires `user.deleted` → removes the row);
  // best-effort, then delete the Supabase row directly for immediacy.
  const { data: target } = await supabase
    .from("users")
    .select("clerk_id")
    .eq("id", id)
    .limit(1)
    .maybeSingle();

  if (target?.clerk_id) {
    try {
      const client = await clerkClient();
      await client.users.deleteUser(target.clerk_id);
    } catch (err) {
      logError("users.delete.clerk", err);
    }
  }

  const { error: deleteErr } = await supabase
    .from("users")
    .delete()
    .eq("id", id);

  if (deleteErr) throw deleteErr;

  return new NextResponse(null, { status: 204 });
}
