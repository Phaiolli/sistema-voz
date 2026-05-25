import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { auth } from "@/lib/auth";

interface ParticipantRow {
  name: string;
  whatsapp: string | null;
  email: string | null;
  questionText: string;
  isAnonymous: boolean;
  lgpdAccepted: boolean;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Não autorizado." } }, { status: 401 });

  const { eventId } = await params;
  const supabase = createServerClient();

  const { data: rows, error } = await supabase
    .from("questions")
    .select("author_name, author_contact, author_email, text, is_anonymous, lgpd_accepted")
    .eq("event_id", eventId)
    .order("created_at");

  if (error) throw error;

  const participants: ParticipantRow[] = (rows ?? []).map((r) => ({
    name: r.author_name,
    whatsapp: r.author_contact ?? null,
    email: r.author_email ?? null,
    questionText: r.text,
    isAnonymous: r.is_anonymous || r.author_name === "Anônimo",
    lgpdAccepted: r.lgpd_accepted ?? false,
  }));

  return NextResponse.json({ participants });
}
