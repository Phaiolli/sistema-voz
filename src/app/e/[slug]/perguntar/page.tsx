import { notFound } from "next/navigation";
import { createServerClient } from "@/lib/supabase";
import type { Event } from "@/lib/types";
import { mapEvent } from "@/lib/api/mappers";
import { QuestionForm } from "./form";

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
