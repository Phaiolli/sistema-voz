import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { auth } from "@/lib/auth";
import type { Database } from "@/lib/db/database.types";

type EventRow = Database["public"]["Tables"]["events"]["Row"];

function mapEvent(row: EventRow) {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    place: row.place,
    address: row.address,
    status: row.status,
    about: row.about,
    theme: row.theme ?? {},
    config: row.config ?? {},
    organizerId: row.organizer_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

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

  if (user.role === "admin") {
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

  // The embedded `events` relation cannot be inferred from the hand-written
  // Database type (no Relationships metadata), so we describe the join shape.
  type AssignmentJoinRow = { event_id: string; created_at: string; events: EventRow | EventRow[] | null };

  const result = ((assignments ?? []) as unknown as AssignmentJoinRow[]).map((row) => {
    const eventRow = Array.isArray(row.events) ? row.events[0] : row.events;
    return {
      eventId: row.event_id,
      assignedAt: row.created_at,
      event: eventRow ? mapEvent(eventRow) : null,
    };
  });

  return NextResponse.json({ assignments: result });
}
