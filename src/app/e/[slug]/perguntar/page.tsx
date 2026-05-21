import { notFound } from "next/navigation";
import { eventIncluir } from "@/lib/fixtures";
import type { Event } from "@/lib/types";
import { QuestionForm } from "./form";

async function getEvent(slug: string): Promise<Event | null> {
  if (slug === "incluir-2025") return eventIncluir;
  return null;
}

export default async function PerguntarPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = await getEvent(slug);
  if (!event) notFound();
  if (event.status === "ended") notFound();

  return <QuestionForm slug={slug} eventId={event.id} eventName={event.name} />;
}
