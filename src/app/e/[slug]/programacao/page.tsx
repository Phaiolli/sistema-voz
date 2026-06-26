import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Clock } from "lucide-react";
import { createServerClient } from "@/lib/supabase";
import { VozWordmark } from "@/components/voz/wordmark";
import type { Event, EventPage, EventPageScheduleItem } from "@/lib/types";
import { mapEvent } from "@/lib/api/mappers";

async function getEvent(slug: string): Promise<Event | null> {
  const supabase = createServerClient();
  const { data } = await supabase.from("events").select("*").eq("slug", slug).limit(1).maybeSingle();
  return data ? mapEvent(data) : null;
}

function sortByTime(items: EventPageScheduleItem[]): EventPageScheduleItem[] {
  return [...items].sort((a, b) => a.time.localeCompare(b.time));
}

export default async function ProgramacaoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = await getEvent(slug);
  if (!event) notFound();

  const accent = event.theme?.accent ?? "#F2B33D";
  const bg = event.theme?.background ?? "#1E4953";
  const page: EventPage = event.config?.page ?? {};
  const items = sortByTime(page.schedule ?? []);

  return (
    <div style={{ minHeight: "100dvh", background: bg, color: "#fff" }}>
      <header style={{ position: "sticky", top: 0, zIndex: 10, height: 52, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px", background: `linear-gradient(180deg, ${bg} 60%, transparent)`, backdropFilter: "blur(8px)" }}>
        <VozWordmark size={20} inverse />
        <Link
          href={`/e/${slug}`}
          style={{ display: "flex", alignItems: "center", gap: 6, color: "rgba(255,255,255,.7)", textDecoration: "none", fontSize: 13 }}
          aria-label="Voltar ao evento"
        >
          <ArrowLeft size={15} aria-hidden /> Voltar
        </Link>
      </header>

      <main style={{ maxWidth: 600, margin: "0 auto", padding: "32px 24px 80px" }}>
        <p style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 12, fontWeight: 500, letterSpacing: "0.1em", color: accent, textTransform: "uppercase", marginBottom: 8 }}>
          Programação
        </p>
        <h1 style={{ fontFamily: '"Archivo Black", sans-serif', fontWeight: 900, fontSize: "clamp(32px, 8vw, 52px)", lineHeight: 0.95, letterSpacing: "-0.03em", margin: "0 0 32px", color: "#fff" }}>
          {event.name.toUpperCase()}<span style={{ color: accent }}>.</span>
        </h1>

        {items.length === 0 ? (
          <p style={{ color: "rgba(255,255,255,.5)", fontSize: 15 }}>Programação ainda não disponível.</p>
        ) : (
          <ol style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {items.map((item, i) => (
              <li
                key={item.id}
                style={{ display: "flex", gap: 20, padding: "20px 0", borderTop: i === 0 ? "none" : `1px solid rgba(255,255,255,.1)` }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", gap: 6, minWidth: 72, flexShrink: 0 }}>
                  <Clock size={13} style={{ color: accent, marginTop: 3, flexShrink: 0 }} aria-hidden />
                  <span style={{ fontFamily: '"Archivo Black", sans-serif', fontSize: 18, color: accent, letterSpacing: "-0.01em", lineHeight: 1.2 }}>
                    {item.time}
                  </span>
                </div>
                <div>
                  <p style={{ color: "#fff", fontSize: 16, fontWeight: 600, margin: "0 0 4px", lineHeight: 1.35 }}>{item.title}</p>
                  {item.description && (
                    <p style={{ color: "rgba(255,255,255,.6)", fontSize: 13, margin: 0, lineHeight: 1.5 }}>{item.description}</p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        )}
      </main>
    </div>
  );
}
