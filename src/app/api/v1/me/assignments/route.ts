import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { auth } from "@/lib/auth";
import { mapEvent } from "@/lib/api/mappers";

export async function GET(_req?: Request) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Autenticação necessária." } },
      { status: 401 },
    );
  }

  const user = session.user;
  const supabase = createServerClient();

  if (user.role === "admin" || user.role === "superadmin") {
    const { data: rows, error: fetchErr } = await supabase
      .from("events")
      .select("*")
      .order("starts_at", { ascending: false });

    if (fetchErr) throw fetchErr;

    return NextResponse.json({ events: (rows ?? []).map(mapEvent) });
  }

  const { data: assignments, error: assignErr } = await supabase
    .from("mediator_assignments")
    .select("event_id, created_at, events(*)")
    .eq("user_id", user.id);

  if (assignErr) throw assignErr;

  // The embedded `events` relation is inferred from the generated Database type
  // (Relationships metadata), so no cast is needed.
  const result = (assignments ?? []).map((row) => {
    const eventRow = Array.isArray(row.events) ? row.events[0] : row.events;
    return {
      eventId: row.event_id,
      assignedAt: row.created_at,
      event: eventRow ? mapEvent(eventRow) : null,
    };
  });

  return NextResponse.json({ assignments: result });
}
