import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Calendar, MapPin, Mic, Lock, UserPlus } from "lucide-react";
import { createServerClient } from "@/lib/supabase";
import { VozWordmark } from "@/components/voz/wordmark";
import type { Event, EventPage } from "@/lib/types";
import { mapEvent } from "@/lib/api/mappers";

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

function registrationIsOpen(event: Event): boolean {
  const reg = event.config?.registration;
  if (!reg?.enabled) return false;
  const now = new Date();
  if (reg.opensAt && new Date(reg.opensAt) > now) return false;
  if (reg.closesAt && new Date(reg.closesAt) < now) return false;
  return true;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit",
  });
}

export default async function EventPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = await getEvent(slug);
  if (!event) notFound();

  const accent = event.theme?.accent ?? "#F2B33D";
  const bg = event.theme?.background ?? "#1E4953";
  const regOpen = registrationIsOpen(event);
  const page: EventPage = event.config?.page ?? {};
  const coverUrl = page.coverUrl ?? null;
  const speakers = page.speakers ?? [];
  const schedule = page.schedule ?? [];
  const organizer = page.organizer ?? "";
  const organizerInstagram = page.organizerInstagram ?? "";

  return (
    <>
      <a href="#conteudo-principal" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-3 focus:bg-background focus:text-foreground">
        Pular para conteúdo principal
      </a>

      <header className="sticky top-0 z-10 flex h-[52px] items-center justify-between px-4" style={{ background: `linear-gradient(180deg, ${bg} 60%, transparent)`, backdropFilter: "blur(8px)" }}>
        {page.logo ? (
          <Image src={page.logo} alt={event.name} width={120} height={32} className="h-8 w-auto object-contain" unoptimized />
        ) : (
          <VozWordmark size={20} inverse />
        )}
        <Link href="/entrar" aria-label="Acesso administrativo" className="admin-link flex items-center justify-center rounded-lg p-2 text-white">
          <Lock size={15} aria-hidden />
        </Link>
      </header>

      <main id="conteudo-principal">
        {/* Cover image */}
        {coverUrl && (
          <div className="relative h-[200px] w-full overflow-hidden">
            <Image src={coverUrl} alt={event.name} fill className="object-cover" unoptimized priority />
          </div>
        )}

        {/* Hero */}
        <section aria-labelledby="hero-heading" className="px-6 pt-2 pb-8">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold tracking-[0.06em]" style={{ background: `${accent}30`, color: accent }}>
            {new Date(event.startsAt).getFullYear()}
          </div>

          <h1 id="hero-heading" className="mb-4 text-white font-black leading-[0.95]" style={{ fontFamily: '"Archivo Black", sans-serif', fontSize: "clamp(48px, 12vw, 76px)", letterSpacing: "-0.03em" }}>
            {event.name.toUpperCase()}<span style={{ color: accent }}>.</span>
          </h1>

          <div className="flex flex-col gap-2.5">
            <Chip icon={<Calendar size={16} />} label={formatDate(event.startsAt)} accent={accent} />
            {event.place && <Chip icon={<MapPin size={16} />} label={[event.place, event.address].filter(Boolean).join(" · ")} accent={accent} />}
          </div>
        </section>

        <div className="h-1" style={{ background: `linear-gradient(90deg, ${accent} 0 56px, transparent 56px)` }} />

        {/* Sobre */}
        {page.aboutText && (
          <section aria-labelledby="sobre-heading" className="px-6 py-7">
            <SectionLabel label="SOBRE" accent={accent} id="sobre-heading" />
            <p className="text-xl font-semibold leading-[1.35] text-white" style={{ fontFamily: '"Archivo", sans-serif' }}>
              {page.aboutText}
            </p>
          </section>
        )}

        {/* Programação */}
        {schedule.length > 0 && (
          <section aria-labelledby="programacao-heading" className="px-6 pb-7">
            <SectionLabel label="PROGRAMAÇÃO" accent={accent} id="programacao-heading" />
            <ol className="m-0 flex list-none flex-col p-0">
              {schedule.map((item, i) => (
                <li key={item.id} className="flex gap-3.5 py-3" style={{ borderTop: i === 0 ? "none" : "1px solid rgba(255,255,255,.1)" }}>
                  <span className="min-w-[56px] shrink-0 text-lg" style={{ fontFamily: '"Archivo Black", sans-serif', color: accent, letterSpacing: "-0.01em" }}>
                    {item.time}
                  </span>
                  <span className="text-[15px] leading-[1.45] text-white">
                    {item.title}
                    {item.description && <span className="mt-0.5 block text-[13px]" style={{ color: "rgba(255,255,255,.6)" }}>{item.description}</span>}
                  </span>
                </li>
              ))}
            </ol>
          </section>
        )}

        {/* Palestrantes */}
        {speakers.length > 0 && (
          <section aria-labelledby="palestrantes-heading" className="px-6 pb-7">
            <SectionLabel label="PALESTRANTES" accent={accent} id="palestrantes-heading" />
            <ul className="m-0 grid grid-cols-2 list-none gap-3 p-0">
              {speakers.map((s) => (
                <li key={s.id} className="rounded-xl p-3.5" style={{ background: "rgba(255,255,255,.08)" }}>
                  <div className="mb-2.5 h-16 w-16 shrink-0 overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,.1)", border: `1px solid ${accent}55` }}>
                    {s.photoUrl && (
                      <Image src={s.photoUrl} alt={s.name} width={64} height={64} className="h-full w-full object-cover" unoptimized />
                    )}
                  </div>
                  <p className="mb-0.5 text-sm font-semibold leading-tight text-white">{s.name}</p>
                  <p className="m-0 text-xs" style={{ color: "rgba(255,255,255,.6)" }}>{s.role}</p>
                  {s.bio && <p className="mt-1.5 text-[11px] leading-[1.4]" style={{ color: "rgba(255,255,255,.5)" }}>{s.bio}</p>}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Local */}
        {event.place && (
          <section aria-labelledby="local-heading" className="px-6 pb-7">
            <SectionLabel label="LOCAL" accent={accent} id="local-heading" />
            <div className="rounded-xl p-3.5" style={{ background: "rgba(255,255,255,.08)" }}>
              <p className="mb-1 text-[15px] font-semibold text-white">{event.place}</p>
              {event.address && <p className="m-0 text-[13px]" style={{ color: "rgba(255,255,255,.6)" }}>{event.address}</p>}
            </div>
          </section>
        )}

        {/* Footer */}
        <footer className="px-6 pt-4 pb-32" style={{ borderTop: "1px solid rgba(255,255,255,.1)" }}>
          {organizer && (
            <>
              <p className="mb-1 text-xs" style={{ color: "rgba(255,255,255,.5)" }}>realização</p>
              <p className="mb-2.5 text-sm font-semibold text-white">{organizer}</p>
            </>
          )}
          {organizerInstagram && (
            <div className="mb-4 flex gap-3.5 text-[13px]" style={{ color: "rgba(255,255,255,.5)" }}>
              <Link href={`https://instagram.com/${organizerInstagram.replace("@", "")}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-inherit no-underline">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor"/></svg>
                {organizerInstagram}
              </Link>
            </div>
          )}
          <p className="text-xs" style={{ color: "rgba(255,255,255,.4)" }}>
            powered by <VozWordmark size={13} inverse />
          </p>
        </footer>
      </main>

      {/* Sticky CTA */}
      <div className="fixed inset-x-0 bottom-0 z-10 px-4 pt-3.5 pb-7" style={{ background: `linear-gradient(180deg, transparent, ${bg} 30%)` }}>
        {regOpen ? (
          <Link
            href={`/e/${slug}/inscricao`}
            className="flex h-[52px] w-full items-center justify-center gap-2 rounded-[10px] text-base font-bold no-underline"
            style={{ background: accent, color: bg, boxShadow: `0 8px 24px ${accent}55` }}
          >
            <UserPlus size={20} aria-hidden /> Se inscrever
          </Link>
        ) : (
          <Link
            href={`/e/${slug}/perguntar`}
            className="flex h-[52px] w-full items-center justify-center gap-2 rounded-[10px] text-base font-bold no-underline"
            style={{ background: accent, color: bg, boxShadow: `0 8px 24px ${accent}55` }}
          >
            <Mic size={20} aria-hidden /> Fazer uma pergunta
          </Link>
        )}
      </div>
    </>
  );
}

function Chip({ icon, label, accent }: { icon: React.ReactNode; label: string; accent: string }) {
  return (
    <div className="inline-flex items-center gap-2 self-start rounded-full px-3 py-2 text-[13px] font-medium text-white" style={{ background: "rgba(255,255,255,.1)" }}>
      <span className="flex" style={{ color: accent }}>{icon}</span>
      {label}
    </div>
  );
}

function SectionLabel({ label, accent, id }: { label: string; accent: string; id?: string }) {
  return (
    <p id={id} className="mb-3 text-xs font-medium uppercase tracking-[0.1em]" style={{ fontFamily: '"JetBrains Mono", monospace', color: accent }}>
      {label}
    </p>
  );
}
