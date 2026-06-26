import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Calendar, MapPin, Mic, Lock, UserPlus } from "lucide-react";
import { createServerClient } from "@/lib/supabase";
import { VozWordmark } from "@/components/voz/wordmark";
import type { Event, EventPage } from "@/lib/types";
import type { Database } from "@/lib/db/database.types";

function mapEvent(row: Database["public"]["Tables"]["events"]["Row"]): Event {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    place: row.place,
    address: row.address,
    status: row.status,
    about: row.about,
    theme: row.theme ?? {},
    config: row.config ?? {},
    organizerId: row.organizer_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

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

      <header style={{ position: "sticky", top: 0, zIndex: 10, height: 52, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px", background: `linear-gradient(180deg, ${bg} 60%, transparent)`, backdropFilter: "blur(8px)" }}>
        {page.logo ? (
          <Image src={page.logo} alt={event.name} width={120} height={32} style={{ objectFit: "contain", height: 32, width: "auto" }} unoptimized />
        ) : (
          <VozWordmark size={20} inverse />
        )}
        <Link href="/entrar" aria-label="Acesso administrativo" className="admin-link" style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 8, borderRadius: 8, color: "#fff" }}>
          <Lock size={15} aria-hidden />
        </Link>
      </header>

      <main id="conteudo-principal">
        {/* Cover image */}
        {coverUrl && (
          <div style={{ width: "100%", height: 200, overflow: "hidden", position: "relative" }}>
            <Image src={coverUrl} alt={event.name} fill style={{ objectFit: "cover" }} unoptimized priority />
          </div>
        )}

        {/* Hero */}
        <section aria-labelledby="hero-heading" style={{ padding: "8px 24px 32px" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: `${accent}30`, color: accent, padding: "6px 12px", borderRadius: 999, fontSize: 12, fontWeight: 700, letterSpacing: "0.06em", marginBottom: 16 }}>
            {new Date(event.startsAt).getFullYear()}
          </div>

          <h1 id="hero-heading" style={{ fontFamily: '"Archivo Black", sans-serif', fontWeight: 900, fontSize: "clamp(48px, 12vw, 76px)", lineHeight: 0.95, letterSpacing: "-0.03em", margin: "0 0 16px", color: "#fff" }}>
            {event.name.toUpperCase()}<span style={{ color: accent }}>.</span>
          </h1>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <Chip icon={<Calendar size={16} />} label={formatDate(event.startsAt)} accent={accent} />
            {event.place && <Chip icon={<MapPin size={16} />} label={[event.place, event.address].filter(Boolean).join(" · ")} accent={accent} />}
          </div>
        </section>

        <div style={{ height: 4, background: `linear-gradient(90deg, ${accent} 0 56px, transparent 56px)` }} />

        {/* Sobre */}
        {page.aboutText && (
          <section aria-labelledby="sobre-heading" style={{ padding: "28px 24px" }}>
            <SectionLabel label="SOBRE" accent={accent} id="sobre-heading" />
            <p style={{ fontFamily: '"Archivo", sans-serif', fontSize: 20, fontWeight: 600, color: "#fff", lineHeight: 1.35 }}>
              {page.aboutText}
            </p>
          </section>
        )}

        {/* Programação */}
        {schedule.length > 0 && (
          <section aria-labelledby="programacao-heading" style={{ padding: "0 24px 28px" }}>
            <SectionLabel label="PROGRAMAÇÃO" accent={accent} id="programacao-heading" />
            <ol style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column" }}>
              {schedule.map((item, i) => (
                <li key={item.id} style={{ display: "flex", gap: 14, padding: "12px 0", borderTop: i === 0 ? "none" : "1px solid rgba(255,255,255,.1)" }}>
                  <span style={{ fontFamily: '"Archivo Black", sans-serif', fontSize: 18, color: accent, minWidth: 56, letterSpacing: "-0.01em", flexShrink: 0 }}>
                    {item.time}
                  </span>
                  <span style={{ color: "#fff", fontSize: 15, lineHeight: 1.45 }}>
                    {item.title}
                    {item.description && <span style={{ display: "block", color: "rgba(255,255,255,.6)", fontSize: 13, marginTop: 2 }}>{item.description}</span>}
                  </span>
                </li>
              ))}
            </ol>
          </section>
        )}

        {/* Palestrantes */}
        {speakers.length > 0 && (
          <section aria-labelledby="palestrantes-heading" style={{ padding: "0 24px 28px" }}>
            <SectionLabel label="PALESTRANTES" accent={accent} id="palestrantes-heading" />
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {speakers.map((s) => (
                <li key={s.id} style={{ background: "rgba(255,255,255,.08)", borderRadius: 12, padding: 14 }}>
                  <div style={{ width: 64, height: 64, borderRadius: "50%", overflow: "hidden", marginBottom: 10, background: "rgba(255,255,255,.1)", border: `1px solid ${accent}55`, flexShrink: 0 }}>
                    {s.photoUrl && (
                      <Image src={s.photoUrl} alt={s.name} width={64} height={64} style={{ objectFit: "cover", width: "100%", height: "100%" }} unoptimized />
                    )}
                  </div>
                  <p style={{ color: "#fff", fontSize: 14, fontWeight: 600, lineHeight: 1.25, margin: "0 0 2px" }}>{s.name}</p>
                  <p style={{ color: "rgba(255,255,255,.6)", fontSize: 12, margin: 0 }}>{s.role}</p>
                  {s.bio && <p style={{ color: "rgba(255,255,255,.5)", fontSize: 11, marginTop: 6, lineHeight: 1.4 }}>{s.bio}</p>}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Local */}
        {event.place && (
          <section aria-labelledby="local-heading" style={{ padding: "0 24px 28px" }}>
            <SectionLabel label="LOCAL" accent={accent} id="local-heading" />
            <div style={{ background: "rgba(255,255,255,.08)", borderRadius: 12, padding: 14 }}>
              <p style={{ color: "#fff", fontSize: 15, fontWeight: 600, margin: "0 0 4px" }}>{event.place}</p>
              {event.address && <p style={{ color: "rgba(255,255,255,.6)", fontSize: 13, margin: 0 }}>{event.address}</p>}
            </div>
          </section>
        )}

        {/* Footer */}
        <footer style={{ padding: "16px 24px 130px", borderTop: "1px solid rgba(255,255,255,.1)" }}>
          {organizer && (
            <>
              <p style={{ color: "rgba(255,255,255,.5)", fontSize: 12, margin: "0 0 4px" }}>realização</p>
              <p style={{ color: "#fff", fontWeight: 600, fontSize: 14, margin: "0 0 10px" }}>{organizer}</p>
            </>
          )}
          {organizerInstagram && (
            <div style={{ display: "flex", gap: 14, color: "rgba(255,255,255,.5)", fontSize: 13, marginBottom: 16 }}>
              <Link href={`https://instagram.com/${organizerInstagram.replace("@", "")}`} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "inherit", textDecoration: "none" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor"/></svg>
                {organizerInstagram}
              </Link>
            </div>
          )}
          <p style={{ color: "rgba(255,255,255,.4)", fontSize: 12 }}>
            powered by <VozWordmark size={13} inverse />
          </p>
        </footer>
      </main>

      {/* Sticky CTA */}
      <div style={{ position: "fixed", left: 0, right: 0, bottom: 0, padding: "14px 16px 28px", background: `linear-gradient(180deg, transparent, ${bg} 30%)`, zIndex: 10 }}>
        {regOpen ? (
          <Link
            href={`/e/${slug}/inscricao`}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, height: 52, width: "100%", borderRadius: 10, fontSize: 16, fontWeight: 700, background: accent, color: bg, textDecoration: "none", boxShadow: `0 8px 24px ${accent}55` }}
          >
            <UserPlus size={20} aria-hidden /> Se inscrever
          </Link>
        ) : (
          <Link
            href={`/e/${slug}/perguntar`}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, height: 52, width: "100%", borderRadius: 10, fontSize: 16, fontWeight: 700, background: accent, color: bg, textDecoration: "none", boxShadow: `0 8px 24px ${accent}55` }}
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
    <div style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "#fff", background: "rgba(255,255,255,.1)", padding: "8px 12px", borderRadius: 999, fontSize: 13, fontWeight: 500, alignSelf: "flex-start" }}>
      <span style={{ color: accent, display: "flex" }}>{icon}</span>
      {label}
    </div>
  );
}

function SectionLabel({ label, accent, id }: { label: string; accent: string; id?: string }) {
  return (
    <p id={id} style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 12, fontWeight: 500, letterSpacing: "0.1em", color: accent, textTransform: "uppercase", marginBottom: 12 }}>
      {label}
    </p>
  );
}
