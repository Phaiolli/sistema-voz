import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { anonymizeOwnerData } from "@/lib/lgpd";

export async function DELETE() {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Autenticação necessária." } },
      { status: 401 },
    );
  }

  const user = session.user as { id: string; role?: string };

  if (user.role !== "owner" && user.role !== "admin" && user.role !== "superadmin") {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "Acesso restrito a owners e administradores." } },
      { status: 403 },
    );
  }

  await anonymizeOwnerData(user.id);

  return NextResponse.json(
    { message: "Seus dados foram removidos." },
    { status: 200 },
  );
}
