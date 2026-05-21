"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, Mic, Eye, Download } from "lucide-react";
import { VozWordmark } from "@/components/voz/wordmark";
import { HeaderControls } from "@/components/voz/header-controls";
import { toast } from "sonner";
import type { Event } from "@/lib/types";

function eventDateLabel(status: string, startsAt: string | null) {
  if (status === "active") return { label: "Ao vivo", color: "hsl(var(--success))", bg: "hsl(142 71% 45% / .12)" };
  if (status === "ended") return { label: "Encerrado", color: "hsl(var(--muted-foreground))", bg: "hsl(var(--muted))" };

  if (!startsAt) return { label: "Sem data", color: "hsl(var(--muted-foreground))", bg: "hsl(var(--muted))" };

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const start = new Date(startsAt); start.setHours(0, 0, 0, 0);
  const diff = Math.round((start.getTime() - today.getTime()) / 86400000);

  if (diff < 0) return { label: `Há ${Math.abs(diff)} dia${Math.abs(diff) !== 1 ? "s" : ""}`, color: "hsl(var(--muted-foreground))", bg: "hsl(var(--muted))" };
  if (diff === 0) return { label: "Hoje", color: "hsl(var(--success))", bg: "hsl(142 71% 45% / .12)" };
  if (diff === 1) return { label: "Amanhã", color: "hsl(38 85% 40%)", bg: "hsl(var(--accent) / .12)" };
  return { label: `Em ${diff} dias`, color: "hsl(38 85% 40%)", bg: "hsl(var(--accent) / .12)" };
}

export default function AdminEventosPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/v1/events")
      .then((r) => {
        if (!r.ok) throw new Error("Falha ao carregar eventos");
        return r.json();
      })
      .then((data: { events: Event[] }) => setEvents(data.events))
      .catch(() => toast.error("Erro ao carregar eventos. Tente novamente."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ minHeight: "100dvh", background: "hsl(var(--background))", color: "hsl(var(--foreground))" }}>
      <header style={{ height: 56, borderBottom: "1px solid hsl(var(--border))", display: "flex", alignItems: "center", padding: "0 24px", gap: 16 }}>
        <VozWordmark size={22} />
        <nav style={{ display: "flex", gap: 4 }} aria-label="Admin">
          <NavLink href="/admin/eventos" active>Eventos</NavLink>
          <NavLink href="/admin/usuarios">Usuários</NavLink>
        </nav>
        <div style={{ flex: 1 }} />
        <Link
          href="/admin/eventos/novo"
          style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 36, padding: "0 14px", borderRadius: 8, border: "none", background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))", fontSize: 13, fontWeight: 600, textDecoration: "none" }}
        >
          <Plus size={14} aria-hidden /> Novo evento
        </Link>
        <div style={{ width: 1, height: 24, background: "hsl(var(--border))" }} aria-hidden />
        <HeaderControls />
      </header>

      <main style={{ maxWidth: 960, margin: "0 auto", padding: "32px 24px" }}>
        <h1 style={{ fontFamily: '"Archivo", sans-serif', fontWeight: 700, fontSize: 28, margin: "0 0 24px" }}>Eventos</h1>

        {loading && (
          <div style={{ padding: 48, textAlign: "center", color: "hsl(var(--muted-foreground))" }}>
            Carregando eventos…
          </div>
        )}

        {!loading && events.length === 0 && (
          <div style={{ padding: 48, textAlign: "center", color: "hsl(var(--muted-foreground))" }}>
            <p style={{ fontFamily: '"Archivo", sans-serif', fontWeight: 600, fontSize: 18, color: "hsl(var(--foreground))", margin: "0 0 12px" }}>
              Nenhum evento cadastrado.
            </p>
            <Link
              href="/admin/eventos/novo"
              style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 40, padding: "0 16px", borderRadius: 8, border: "none", background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))", fontSize: 14, fontWeight: 600, textDecoration: "none" }}
            >
              <Plus size={14} aria-hidden /> Criar primeiro evento
            </Link>
          </div>
        )}

        {!loading && events.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {events.map((ev) => {
              const st = eventDateLabel(ev.status, ev.startsAt ?? null);
              const logo = ev.theme?.logoUrl ?? ev.config?.page?.logo;
              const bg = ev.theme?.background ?? "#1E4953";
              const accent = ev.theme?.accent ?? "#F2B33D";
              return (
                <div key={ev.id} className="ev-row">
                  {/* Overlay link — cobre a linha e vai para o editor */}
                  <Link href={`/admin/eventos/${ev.id}`} className="ev-overlay" aria-label={`Editar ${ev.name}`} />

                  {/* Ícone do evento */}
                  <div
                    style={{ width: 48, height: 48, borderRadius: 10, background: bg, flexShrink: 0, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", zIndex: 1 }}
                    aria-hidden
                  >
                    {logo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={logo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <span style={{ fontFamily: '"Archivo Black", sans-serif', fontSize: 20, fontWeight: 900, color: accent, lineHeight: 1, userSelect: "none" }}>
                        {ev.name.slice(0, 1).toUpperCase()}
                      </span>
                    )}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0, position: "relative", zIndex: 1 }}>
                    <p style={{ fontFamily: '"Archivo", sans-serif', fontWeight: 600, fontSize: 16, margin: "0 0 4px" }}>{ev.name}</p>
                    <p style={{ fontSize: 13, color: "hsl(var(--muted-foreground))", margin: 0 }}>
                      {ev.startsAt
                        ? new Date(ev.startsAt).toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" })
                        : "Sem data"}
                      {ev.place ? ` · ${ev.place}` : ""}
                    </p>
                  </div>

                  {/* Label de data/status */}
                  <span style={{ padding: "4px 10px", borderRadius: 999, fontSize: 12, fontWeight: 600, color: st.color, background: st.bg, flexShrink: 0, position: "relative", zIndex: 1 }}>
                    {st.label}
                  </span>

                  {/* Botões de ação */}
                  <div style={{ display: "flex", gap: 6, position: "relative", zIndex: 1 }}>
                    <ActionBtn href="/mediador" icon={<Mic size={14} />} label="Abrir mediador" />
                    <ActionBtn href={`/e/${ev.slug}`} icon={<Eye size={14} />} label="Ver página do evento" />
                    <ActionBtn href="#" icon={<Download size={14} />} label="Exportar CSV" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <style>{`
        .ev-row {
          position: relative;
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 16px 20px;
          background: hsl(var(--muted));
          border-radius: 12px;
          border: 1px solid hsl(var(--border));
          cursor: pointer;
        }
        .ev-row:hover { background: hsl(var(--accent) / .06); border-color: hsl(var(--primary) / .25); }
        .ev-overlay { position: absolute; inset: 0; border-radius: 12px; z-index: 0; }
      `}</style>
    </div>
  );
}

function NavLink({ href, children, active }: { href: string; children: React.ReactNode; active?: boolean }) {
  return (
    <Link href={href} style={{ padding: "6px 12px", borderRadius: 8, fontSize: 14, fontWeight: 500, textDecoration: "none", background: active ? "hsl(var(--muted))" : "transparent", color: active ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))" }}>
      {children}
    </Link>
  );
}

function ActionBtn({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link href={href} aria-label={label} title={label} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 36, height: 36, borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--background))", textDecoration: "none", color: "hsl(var(--foreground))" }}>
      {icon}
    </Link>
  );
}
