import { notFound } from "next/navigation";
import { eventIncluir } from "@/lib/fixtures";
import type { Event } from "@/lib/types";

async function getEvent(slug: string): Promise<Event | null> {
  if (slug === "incluir-2025") return eventIncluir;
  return null;
}

export default async function EventLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const event = await getEvent(slug);
  if (!event) notFound();

  const themeClass = event.theme.preset === "incluir" ? "theme-incluir" : "";

  return (
    <div className={themeClass} style={{ minHeight: "100dvh", background: "hsl(var(--background))", color: "hsl(var(--foreground))" }}>
      {children}
    </div>
  );
}
