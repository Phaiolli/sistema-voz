import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase";

export default async function Home() {
  const supabase = createServerClient();
  const { data } = await supabase
    .from("events")
    .select("slug, status")
    .in("status", ["active", "draft"])
    .order("starts_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (data?.slug) {
    redirect(`/e/${data.slug}`);
  }

  redirect("/entrar");
}
