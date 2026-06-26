import { createServerClient } from "@/lib/supabase";
import { notFound } from "next/navigation";
import { ProjectionView } from "./view";

export default async function ApresentarPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const supabase = createServerClient();

  const { data } = await supabase
    .from("events")
    .select("id, name, slug, theme")
    .eq("id", eventId)
    .limit(1)
    .maybeSingle();

  if (!data) notFound();

  const theme = data.theme ?? {};

  return (
    <ProjectionView
      eventId={data.id}
      eventName={data.name}
      eventSlug={data.slug}
      accent={theme.accent ?? "#F2B33D"}
      bg={theme.background ?? "#1E4953"}
    />
  );
}
