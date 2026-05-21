import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { auth } from "@/lib/auth";

interface ParticipantRow {
  name: string;
  whatsapp: string | null;
  email: string | null;
  questionCount: number;
  firstSeen: string;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Não autorizado." } }, { status: 401 });

  const { eventId } = await params;
  const supabase = createServerClient();

  const { data: rows, error } = await supabase
    .from("questions")
    .select("author_name, author_contact, author_email, created_at")
    .eq("event_id", eventId)
    .neq("author_name", "Anônimo")
    .order("created_at");

  if (error) throw error;

  // Aggregate by (name, whatsapp) — deduplicate, count questions, capture email
  const map = new Map<string, ParticipantRow>();
  for (const r of rows ?? []) {
    const key = `${r.author_name}||${r.author_contact ?? ""}`;
    const existing = map.get(key);
    if (existing) {
      existing.questionCount += 1;
      if (!existing.email && r.author_email) existing.email = r.author_email;
    } else {
      map.set(key, {
        name: r.author_name,
        whatsapp: r.author_contact ?? null,
        email: r.author_email ?? null,
        questionCount: 1,
        firstSeen: r.created_at,
      });
    }
  }

  return NextResponse.json({ participants: Array.from(map.values()) });
}
