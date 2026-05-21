import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { auth } from "@/lib/auth";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapEvent(row: Record<string, any>) {
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

export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Autenticação necessária." } },
      { status: 401 },
    );
  }

  const user = session.user as { id: string; role?: string };
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

  const result = (assignments ?? []).map((row) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const eventRow = Array.isArray(row.events) ? row.events[0] : (row.events as Record<string, any>);
    return {
      eventId: row.event_id,
      assignedAt: row.created_at,
      event: eventRow ? mapEvent(eventRow) : null,
    };
  });

  return NextResponse.json({ assignments: result });
}
