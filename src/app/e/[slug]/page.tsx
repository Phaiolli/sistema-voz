import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Calendar, MapPin, Mic, Lock } from "lucide-react";
import { eventIncluir, speakersIncluir, agendaIncluir } from "@/lib/fixtures";
import { VozWordmark } from "@/components/voz/wordmark";
import type { Event } from "@/lib/types";

async function getEvent(slug: string): Promise<Event | null> {
  if (slug === "incluir-2025") return eventIncluir;
  return null;
}

export default async function EventPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = await getEvent(slug);
  if (!event) notFound();

  return (
    <>
      <a href="#conteudo-principal" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-3 focus:bg-background focus:text-foreground">
        Pular para conteúdo principal
      </a>

      <header style={{ position: "sticky", top: 0, zIndex: 10, height: 52, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px", background: "linear-gradient(180deg, hsl(var(--background)) 60%, hsl(var(--background) / 0))", backdropFilter: "blur(8px)" }}>
        <VozWordmark size={20} inverse />
        <Link
          href="/entrar"
          aria-label="Acesso administrativo"
          className="admin-link"
          style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 8, borderRadius: 8, color: "#fff" }}
        >
          <Lock size={15} aria-hidden />
        </Link>
      </header>

      <main id="conteudo-principal">
        {/* Hero */}
        <section aria-labelledby="hero-heading" style={{ padding: "8px 24px 32px" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "hsl(var(--accent) / .18)", color: "hsl(var(--accent))", padding: "6px 12px", borderRadius: 999, fontSize: 12, fontWeight: 700, letterSpacing: "0.06em", marginBottom: 16 }}>
            1ª EDIÇÃO · 2025
          </div>

          <h1 id="hero-heading" style={{ fontFamily: '"Archivo Black", sans-serif', fontWeight: 900, fontSize: "clamp(52px, 14vw, 80px)", lineHeight: 0.95, letterSpacing: "-0.03em", margin: "0 0 16px" }}>
            <span style={{ color: "#fff" }}>IN</span>
            <span style={{ color: "hsl(var(--accent))" }}>CLUIR</span>
            <span style={{ color: "hsl(var(--accent))" }}>.</span>
          </h1>

          <p style={{ fontFamily: '"Archivo", sans-serif', fontSize: 18, fontWeight: 500, color: "#fff", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 20 }}>
            Diálogos sobre a<br />Neurodiversidade
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <Chip icon={<Calendar size={16} />} label="Sábado, 23 de maio · 14h–19h" />
            <Chip icon={<MapPin size={16} />} label="IP Paiquerê · Valinhos, SP" />
          </div>
        </section>

        <div style={{ height: 4, background: "linear-gradient(90deg, hsl(var(--accent)) 0 56px, transparent 56px)" }} />

        {/* Sobre */}
        <section aria-labelledby="sobre-heading" style={{ padding: "28px 24px" }}>
          <p style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 12, fontWeight: 500, letterSpacing: "0.1em", color: "hsl(var(--accent))", textTransform: "uppercase", marginBottom: 8 }}>
            SOBRE
          </p>
          <p style={{ fontFamily: '"Archivo", sans-serif', fontSize: 20, fontWeight: 600, color: "#fff", lineHeight: 1.35 }} id="sobre-heading">
            Uma tarde para conversar sobre como acolher mentes diferentes — na família, na escola e no trabalho.
          </p>
        </section>

        {/* Programação */}
        <section aria-labelledby="programacao-heading" style={{ padding: "0 24px 28px" }}>
          <p style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 12, fontWeight: 500, letterSpacing: "0.1em", color: "hsl(var(--accent))", textTransform: "uppercase", marginBottom: 12 }} id="programacao-heading">
            PROGRAMAÇÃO
          </p>
          <ol style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column" }}>
            {agendaIncluir.map((item, i) => (
              <li key={item.id} style={{ display: "flex", gap: 14, padding: "12px 0", borderTop: i === 0 ? "none" : "1px solid hsl(var(--border))" }}>
                <span style={{ fontFamily: '"Archivo Black", sans-serif', fontSize: 18, color: "hsl(var(--accent))", minWidth: 56, letterSpacing: "-0.01em", flexShrink: 0 }}>
                  {item.time}
                </span>
                <span style={{ color: "#fff", fontSize: 15, lineHeight: 1.45 }}>
                  {item.title}
                  {item.description && <span style={{ display: "block", color: "hsl(var(--muted-foreground))", fontSize: 13, marginTop: 2 }}>{item.description}</span>}
                </span>
              </li>
            ))}
          </ol>
        </section>

        {/* Palestrantes */}
        <section aria-labelledby="palestrantes-heading" style={{ padding: "0 24px 28px" }}>
          <p style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 12, fontWeight: 500, letterSpacing: "0.1em", color: "hsl(var(--accent))", textTransform: "uppercase", marginBottom: 12 }} id="palestrantes-heading">
            PALESTRANTES
          </p>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {speakersIncluir.map((s) => (
              <li key={s.id} style={{ background: "hsl(var(--muted))", borderRadius: 12, padding: 14 }}>
                <div style={{ width: 64, height: 64, borderRadius: "50%", overflow: "hidden", marginBottom: 10, background: "hsl(var(--background))", border: "1px solid hsl(var(--accent) / .35)", flexShrink: 0 }}>
                  {s.photoUrl && (
                    <Image src={s.photoUrl} alt={s.name} width={64} height={64} style={{ objectFit: "cover", width: "100%", height: "100%", filter: "sepia(0.05)" }} />
                  )}
                </div>
                <p style={{ color: "#fff", fontSize: 14, fontWeight: 600, lineHeight: 1.25, margin: 0 }}>{s.name}</p>
                <p style={{ color: "hsl(var(--muted-foreground))", fontSize: 12, marginTop: 2 }}>{s.role}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* Local */}
        <section aria-labelledby="local-heading" style={{ padding: "0 24px 28px" }}>
          <p style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 12, fontWeight: 500, letterSpacing: "0.1em", color: "hsl(var(--accent))", textTransform: "uppercase", marginBottom: 12 }} id="local-heading">
            LOCAL
          </p>
          <div style={{ background: "hsl(var(--muted))", borderRadius: 12, padding: 14 }}>
            <p style={{ color: "#fff", fontSize: 15, fontWeight: 600, margin: "0 0 4px" }}>Igreja Presbiteriana Paiquerê</p>
            <p style={{ color: "hsl(var(--muted-foreground))", fontSize: 13, margin: 0 }}>
              Rua Dr. Eraldo Aurélio Franzese, 157<br />
              Paiquerê · Valinhos / SP
            </p>
          </div>
        </section>

        {/* Footer */}
        <footer style={{ padding: "16px 24px 130px", borderTop: "1px solid hsl(var(--border))" }}>
          <p style={{ color: "hsl(var(--muted-foreground))", fontSize: 12, margin: "0 0 8px" }}>realização</p>
          <p style={{ color: "#fff", fontWeight: 600, fontSize: 14, margin: "0 0 12px" }}>Igreja Presbiteriana Paiquerê</p>
          <div style={{ display: "flex", gap: 14, color: "hsl(var(--muted-foreground))", fontSize: 13 }}>
            <Link href="https://instagram.com/ippaiquere" target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "inherit", textDecoration: "none" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor"/></svg>
              @ippaiquere
            </Link>
          </div>
          <p style={{ marginTop: 18, color: "hsl(var(--muted-foreground))", fontSize: 12 }}>
            powered by <VozWordmark size={13} inverse />
          </p>
        </footer>
      </main>

      {/* Sticky CTA */}
      <div style={{ position: "fixed", left: 0, right: 0, bottom: 0, padding: "14px 16px 28px", background: "linear-gradient(180deg, hsl(var(--background) / 0), hsl(var(--background)) 30%)", zIndex: 10 }}>
        <Link
          href={`/e/${slug}/perguntar`}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            height: 52, width: "100%", borderRadius: 10, fontSize: 16, fontWeight: 700,
            background: "hsl(var(--accent))", color: "hsl(var(--accent-foreground))",
            textDecoration: "none", boxShadow: "0 8px 24px hsl(var(--accent) / .35)",
          }}
        >
          <Mic size={20} aria-hidden /> Fazer uma pergunta
        </Link>
      </div>
    </>
  );
}

function Chip({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "#fff", background: "hsl(var(--muted))", padding: "8px 12px", borderRadius: 999, fontSize: 13, fontWeight: 500, alignSelf: "flex-start" }}>
      <span style={{ color: "hsl(var(--accent))", display: "flex" }}>{icon}</span>
      {label}
    </div>
  );
}
