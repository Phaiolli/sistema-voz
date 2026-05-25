import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { exportOwnerData } from "@/lib/lgpd";

export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Autenticação necessária." } },
      { status: 401 },
    );
  }

  const user = session.user as { id: string; role?: string };

  if (user.role !== "owner" && user.role !== "admin") {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "Acesso restrito a owners." } },
      { status: 403 },
    );
  }

  const data = await exportOwnerData(user.id);

  return new NextResponse(JSON.stringify(data), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": 'attachment; filename="voz-meus-dados.json"',
    },
  });
}
