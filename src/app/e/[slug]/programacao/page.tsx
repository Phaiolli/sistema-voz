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
    <div className="min-h-[100dvh] text-white" style={{ background: bg }}>
      <header className="sticky top-0 z-10 flex h-[52px] items-center justify-between px-4" style={{ background: `linear-gradient(180deg, ${bg} 60%, transparent)`, backdropFilter: "blur(8px)" }}>
        <VozWordmark size={20} inverse />
        <Link
          href={`/e/${slug}`}
          className="flex items-center gap-1.5 text-[13px] no-underline"
          style={{ color: "rgba(255,255,255,.7)" }}
          aria-label="Voltar ao evento"
        >
          <ArrowLeft size={15} aria-hidden /> Voltar
        </Link>
      </header>

      <main className="mx-auto max-w-[600px] px-6 pt-8 pb-20">
        <p className="mb-2 text-xs font-medium uppercase tracking-[0.1em]" style={{ fontFamily: '"JetBrains Mono", monospace', color: accent }}>
          Programação
        </p>
        <h1 className="mb-8 text-white font-black leading-[0.95]" style={{ fontFamily: '"Archivo Black", sans-serif', fontSize: "clamp(32px, 8vw, 52px)", letterSpacing: "-0.03em" }}>
          {event.name.toUpperCase()}<span style={{ color: accent }}>.</span>
        </h1>

        {items.length === 0 ? (
          <p className="text-[15px]" style={{ color: "rgba(255,255,255,.5)" }}>Programação ainda não disponível.</p>
        ) : (
          <ol className="m-0 list-none p-0">
            {items.map((item, i) => (
              <li
                key={item.id}
                className="flex gap-5 py-5"
                style={{ borderTop: i === 0 ? "none" : `1px solid rgba(255,255,255,.1)` }}
              >
                <div className="flex min-w-[72px] shrink-0 items-start gap-1.5">
                  <Clock size={13} className="mt-0.5 shrink-0" style={{ color: accent }} aria-hidden />
                  <span className="text-lg leading-tight" style={{ fontFamily: '"Archivo Black", sans-serif', color: accent, letterSpacing: "-0.01em" }}>
                    {item.time}
                  </span>
                </div>
                <div>
                  <p className="mb-1 text-base font-semibold leading-[1.35] text-white">{item.title}</p>
                  {item.description && (
                    <p className="m-0 text-[13px] leading-normal" style={{ color: "rgba(255,255,255,.6)" }}>{item.description}</p>
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
