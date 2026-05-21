import { createServerClient } from "@/lib/supabase";

export default async function EventLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = createServerClient();
  const { data } = await supabase
    .from("events")
    .select("theme")
    .eq("slug", slug)
    .limit(1)
    .maybeSingle();

  const preset = (data?.theme as { preset?: string } | null)?.preset;
  const themeClass = preset === "incluir" ? "theme-incluir" : "";

  return (
    <div className={themeClass} style={{ minHeight: "100dvh", background: "hsl(var(--background))", color: "hsl(var(--foreground))" }}>
      {children}
    </div>
  );
}
