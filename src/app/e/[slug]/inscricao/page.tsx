import { notFound } from "next/navigation";
import { createServerClient } from "@/lib/supabase";
import { mapEvent } from "@/lib/api/mappers";
import { InscricaoForm } from "./form";

export default async function InscricaoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = createServerClient();
  const { data } = await supabase.from("events").select("*").eq("slug", slug).limit(1).maybeSingle();
  if (!data) notFound();
  const event = mapEvent(data);
  return <InscricaoForm event={event} />;
}
