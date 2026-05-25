"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, Mic, Eye, Edit, Calendar, MapPin } from "lucide-react";
import { VozWordmark } from "@/components/voz/wordmark";
import { HeaderControls } from "@/components/voz/header-controls";
import { EnvSwitcher } from "@/components/voz/env-switcher";
import { toast } from "sonner";
import type { Event } from "@/lib/types";

function eventStatusInfo(status: string, startsAt: string | null) {
  if (status === "active") return { label: "Ao vivo", color: "hsl(142 71% 32%)", bg: "hsl(142 71% 45% / .12)" };
  if (status === "ended") return { label: "Encerrado", color: "hsl(var(--muted-foreground))", bg: "hsl(var(--muted))" };

  if (!startsAt) return { label: "Sem data", color: "hsl(var(--muted-foreground))", bg: "hsl(var(--muted))" };

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const start = new Date(startsAt); start.setHours(0, 0, 0, 0);
  const diff = Math.round((start.getTime() - today.getTime()) / 86400000);

  if (diff < 0) return { label: `Há ${Math.abs(diff)}d`, color: "hsl(var(--muted-foreground))", bg: "hsl(var(--muted))" };
  if (diff === 0) return { label: "Hoje", color: "hsl(142 71% 32%)", bg: "hsl(142 71% 45% / .12)" };
  if (diff === 1) return { label: "Amanhã", color: "hsl(38 85% 40%)", bg: "hsl(44 92% 54% / .15)" };
  return { label: `Em ${diff}d`, color: "hsl(38 85% 40%)", bg: "hsl(44 92% 54% / .15)" };
}

export default function AdminEventosPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/v1/events")
      .then((r) => {
        if (!r.ok) throw new Error("Falha");
        return r.json();
      })
      .then((data: { events: Event[] }) => setEvents(data.events))
      .catch(() => toast.error("Erro ao carregar eventos."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ minHeight: "100dvh", background: "hsl(var(--background))", color: "hsl(var(--foreground))", paddingBottom: 80 }}>
      {/* Header */}
      <header style={{ height: 56, borderBottom: "1px solid hsl(var(--border))", display: "flex", alignItems: "center", padding: "0 16px", gap: 10, position: "sticky", top: 0, background: "hsl(var(--background))", zIndex: 10 }}>
        <VozWordmark size={20} />
        <EnvSwitcher active="admin" />
        <div style={{ flex: 1 }} />
        <HeaderControls />
      </header>

      {/* Desktop top nav */}
      <div className="admin-subnav" style={{ borderBottom: "1px solid hsl(var(--border))", display: "flex", alignItems: "center", padding: "0 16px", gap: 4, background: "hsl(var(--background))" }}>
        <NavLink href="/admin/eventos" active>Eventos</NavLink>
        <NavLink href="/admin/usuarios">Usuários</NavLink>
      </div>

      <main style={{ maxWidth: 960, margin: "0 auto", padding: "24px 16px" }}>
        {/* Page title + desktop new button */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <h1 style={{ fontFamily: '"Archivo", sans-serif', fontWeight: 700, fontSize: "clamp(22px, 5vw, 28px)", margin: 0 }}>Eventos</h1>
          <Link
            href="/admin/eventos/novo"
            className="btn-new-desktop"
            style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 44, padding: "0 18px", borderRadius: 10, border: "none", background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))", fontSize: 14, fontWeight: 600, textDecoration: "none" }}
          >
            <Plus size={15} aria-hidden /> Novo evento
          </Link>
        </div>

        {loading && (
          <div style={{ padding: 48, textAlign: "center", color: "hsl(var(--muted-foreground))" }}>
            Carregando eventos…
          </div>
        )}

        {!loading && events.length === 0 && (
          <div style={{ padding: 48, textAlign: "center", color: "hsl(var(--muted-foreground))" }}>
            <p style={{ fontFamily: '"Archivo", sans-serif', fontWeight: 600, fontSize: 18, color: "hsl(var(--foreground))", margin: "0 0 16px" }}>
              Nenhum evento cadastrado.
            </p>
            <Link
              href="/admin/eventos/novo"
              style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 44, padding: "0 20px", borderRadius: 10, border: "none", background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))", fontSize: 14, fontWeight: 600, textDecoration: "none" }}
            >
              <Plus size={15} aria-hidden /> Criar primeiro evento
            </Link>
          </div>
        )}

        {!loading && events.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {events.map((ev) => {
              const st = eventStatusInfo(ev.status, ev.startsAt ?? null);
              const logo = ev.theme?.logoUrl ?? ev.config?.page?.logo;
              const bg = ev.theme?.background ?? "#1E4953";
              const accent = ev.theme?.accent ?? "#F2B33D";
              return (
                <div key={ev.id} className="ev-card">
                  {/* Clickable overlay to editor */}
                  <Link href={`/admin/eventos/${ev.id}`} className="ev-overlay" aria-label={`Editar ${ev.name}`} />

                  {/* Event icon */}
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
                    <p style={{ fontFamily: '"Archivo", sans-serif', fontWeight: 600, fontSize: 15, margin: "0 0 4px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ev.name}</p>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                      {ev.startsAt && (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, color: "hsl(var(--muted-foreground))" }}>
                          <Calendar size={11} aria-hidden />
                          {new Date(ev.startsAt).toLocaleDateString("pt-BR", { day: "numeric", month: "short", year: "numeric" })}
                        </span>
                      )}
                      {ev.place && (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, color: "hsl(var(--muted-foreground))" }}>
                          <MapPin size={11} aria-hidden />
                          {ev.place}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Status badge */}
                  <span style={{ padding: "4px 10px", borderRadius: 999, fontSize: 12, fontWeight: 600, color: st.color, background: st.bg, flexShrink: 0, position: "relative", zIndex: 1, whiteSpace: "nowrap" }}>
                    {st.label}
                  </span>

                  {/* Action buttons */}
                  <div className="ev-actions" style={{ display: "flex", gap: 6, position: "relative", zIndex: 1 }}>
                    <ActionBtn href={`/mediador`} icon={<Mic size={15} />} label="Abrir moderador" />
                    <ActionBtn href={`/e/${ev.slug}`} icon={<Eye size={15} />} label="Ver página" />
                    <ActionBtn href={`/admin/eventos/${ev.id}`} icon={<Edit size={15} />} label="Editar" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* FAB mobile */}
      <Link
        href="/admin/eventos/novo"
        className="fab"
        aria-label="Novo evento"
        style={{
          position: "fixed",
          bottom: 88,
          right: 20,
          width: 56,
          height: 56,
          borderRadius: "50%",
          background: "hsl(var(--primary))",
          color: "hsl(var(--primary-foreground))",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          textDecoration: "none",
          boxShadow: "0 4px 16px hsl(var(--primary) / .4)",
          zIndex: 20,
        }}
      >
        <Plus size={24} aria-hidden />
      </Link>

      {/* Bottom nav — mobile only */}
      <nav className="bottom-nav" aria-label="Navegação admin" style={{ position: "fixed", bottom: 0, left: 0, right: 0, height: 68, background: "hsl(var(--background))", borderTop: "1px solid hsl(var(--border))", display: "flex", zIndex: 20 }}>
        <BottomNavItem href="/admin/eventos" icon={<CalendarIcon />} label="Eventos" active />
        <BottomNavItem href="/admin/usuarios" icon={<UsersIcon />} label="Usuários" />
        <BottomNavItem href="/mediador" icon={<MicIcon />} label="Moderador" />
      </nav>

      <style>{`
        .admin-subnav { display: flex; }
        .btn-new-desktop { display: inline-flex; }
        .fab { display: none; }
        .bottom-nav { display: none; }
        .ev-actions { display: flex; }
        .ev-card {
          position: relative;
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 14px 16px;
          background: hsl(var(--muted));
          border-radius: 12px;
          border: 1px solid hsl(var(--border));
          cursor: pointer;
        }
        .ev-card:hover { background: hsl(var(--accent) / .06); border-color: hsl(var(--primary) / .25); }
        .ev-overlay { position: absolute; inset: 0; border-radius: 12px; z-index: 0; }

        @media (max-width: 639px) {
          .admin-subnav { display: none; }
          .btn-new-desktop { display: none; }
          .fab { display: flex; }
          .bottom-nav { display: flex; }
          .ev-actions { display: none; }
        }
      `}</style>
    </div>
  );
}

function NavLink({ href, children, active }: { href: string; children: React.ReactNode; active?: boolean }) {
  return (
    <Link
      href={href}
      style={{ padding: "12px 14px", fontSize: 14, fontWeight: 500, textDecoration: "none", borderBottom: active ? "2px solid hsl(var(--primary))" : "2px solid transparent", color: active ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))", marginBottom: -1 }}
    >
      {children}
    </Link>
  );
}

function ActionBtn({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      href={href}
      aria-label={label}
      title={label}
      style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 44, height: 44, borderRadius: 9, border: "1px solid hsl(var(--border))", background: "hsl(var(--background))", textDecoration: "none", color: "hsl(var(--foreground))" }}
    >
      {icon}
    </Link>
  );
}

function BottomNavItem({ href, icon, label, active }: { href: string; icon: React.ReactNode; label: string; active?: boolean }) {
  return (
    <Link
      href={href}
      style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3, textDecoration: "none", color: active ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))", fontSize: 11, fontWeight: active ? 600 : 500 }}
      aria-current={active ? "page" : undefined}
    >
      {icon}
      {label}
    </Link>
  );
}

function CalendarIcon() {
  return <Calendar size={22} aria-hidden />;
}
function UsersIcon() {
  return (
    <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
function MicIcon() {
  return <Mic size={22} aria-hidden />;
}
