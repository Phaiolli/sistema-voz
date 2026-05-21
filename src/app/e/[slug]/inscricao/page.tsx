import { notFound } from "next/navigation";
import { createServerClient } from "@/lib/supabase";
import type { Event } from "@/lib/types";
import { InscricaoForm } from "./form";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapEvent(row: Record<string, any>): Event {
  return {
    id: row.id, slug: row.slug, name: row.name, startsAt: row.starts_at, endsAt: row.ends_at,
    place: row.place, address: row.address, status: row.status, about: row.about,
    theme: row.theme ?? {}, config: row.config ?? {}, organizerId: row.organizer_id,
    createdAt: row.created_at, updatedAt: row.updated_at,
  };
}

export default async function InscricaoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = createServerClient();
  const { data } = await supabase.from("events").select("*").eq("slug", slug).limit(1).maybeSingle();
  if (!data) notFound();
  const event = mapEvent(data);
  return <InscricaoForm event={event} />;
}
