import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { requireEventAccess } from "@/lib/api/auth-guard";

interface ParticipantRow {
  name: string;
  whatsapp: string | null;
  email: string | null;
  questionText: string;
  isAnonymous: boolean;
  lgpdAccepted: boolean;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: eventId } = await params;

  const guard = await requireEventAccess(eventId, ["admin", "mediador", "owner", "superadmin"]);
  if ("err" in guard) return guard.err;

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
