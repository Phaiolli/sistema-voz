import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createServerClient } from "@/lib/supabase";
import { registerSchema } from "@/lib/schemas";
import { randomUUID } from "crypto";

// TODO: Add IP-based rate limiting (max 5 registrations/hour per IP)
// Requires adding an author_ip column to users or a dedicated rate_limit table.

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Payload inválido." }, { status: 400 });
  }

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Dados inválidos.", errors: parsed.error.flatten().fieldErrors },
      { status: 422 },
    );
  }

  const { name, email, password } = parsed.data;

  const supabase = createServerClient();

  // Silent dedup — check if email already exists but always respond 201
  const { data: existing } = await supabase
    .from("users")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (existing) {
    // Return 201 to avoid email enumeration
    return NextResponse.json(
      { message: "Conta criada. Faça login para continuar." },
      { status: 201 },
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const { error } = await supabase.from("users").insert({
    id: randomUUID(),
    name,
    email,
    password_hash: passwordHash,
    role: "owner",
    plan: "free",
  });

  if (error) {
    console.error("[register] insert failed:", error);
    return NextResponse.json({ message: "Erro ao criar conta." }, { status: 500 });
  }

  return NextResponse.json(
    { message: "Conta criada. Faça login para continuar." },
    { status: 201 },
  );
}
