import { notFound } from "next/navigation";
import { createServerClient } from "@/lib/supabase";
import type { Event } from "@/lib/types";
import type { Database } from "@/lib/db/database.types";
import { QuestionForm } from "./form";

function mapEvent(row: Database["public"]["Tables"]["events"]["Row"]): Event {
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

async function getEvent(slug: string): Promise<Event | null> {
  const supabase = createServerClient();
  const { data } = await supabase
    .from("events")
    .select("*")
    .eq("slug", slug)
    .limit(1)
    .maybeSingle();
  return data ? mapEvent(data) : null;
}

export default async function PerguntarPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = await getEvent(slug);
  if (!event) notFound();
  if (event.status === "ended") notFound();

  return <QuestionForm slug={slug} eventId={event.id} eventName={event.name} />;
}
