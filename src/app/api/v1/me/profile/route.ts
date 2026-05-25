import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import bcrypt from "bcryptjs";

const patchProfileSchema = z.object({
  name: z.string().min(2, "Nome muito curto.").max(100).optional(),
  currentPassword: z.string().optional(),
  password: z.string().min(8, "Mínimo 8 caracteres.").optional(),
});

export async function PATCH(req: NextRequest) {
  const session = await auth();
  const user = session?.user as { id?: string } | undefined;
  if (!user?.id) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
  }

  const parsed = patchProfileSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION_FAILED", message: "Dados inválidos.", details: parsed.error.flatten() } },
      { status: 422 },
    );
  }

  const { name, currentPassword, password } = parsed.data;
  const supabase = createServerClient();
  const patch: Record<string, unknown> = {};

  if (name !== undefined) patch.name = name;

  if (password !== undefined) {
    if (!currentPassword) {
      return NextResponse.json({ error: { code: "VALIDATION_FAILED", message: "Informe a senha atual." } }, { status: 422 });
    }
    const { data: row } = await supabase
      .from("users")
      .select("password_hash")
      .eq("id", user.id)
      .single();

    const valid = row?.password_hash ? await bcrypt.compare(currentPassword, row.password_hash as string) : false;
    if (!valid) {
      return NextResponse.json({ error: { code: "FORBIDDEN", message: "Senha atual incorreta." } }, { status: 403 });
    }
    patch.password_hash = await bcrypt.hash(password, 12);
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ message: "Nada para atualizar." });
  }

  const { error } = await supabase.from("users").update(patch).eq("id", user.id);
  if (error) {
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Erro ao salvar." } }, { status: 500 });
  }

  return NextResponse.json({ message: "Perfil atualizado." });
}
