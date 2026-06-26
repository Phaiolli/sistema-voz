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
    <div className="min-h-[100dvh] bg-background text-foreground pb-20">
      {/* Header */}
      <header className="h-14 flex items-center gap-2.5 px-4 sticky top-0 bg-background z-10" style={{ borderBottom: "1px solid hsl(var(--border))" }}>
        <VozWordmark size={20} />
        <EnvSwitcher active="admin" />
        <div className="flex-1" />
        <HeaderControls />
      </header>

      {/* Desktop top nav */}
      <div className="admin-subnav flex items-center px-4 gap-1 bg-background" style={{ borderBottom: "1px solid hsl(var(--border))" }}>
        <NavLink href="/admin/eventos" active>Eventos</NavLink>
        <NavLink href="/admin/usuarios">Usuários</NavLink>
      </div>

      <main className="max-w-[960px] mx-auto px-4 py-6">
        {/* Page title + desktop new button */}
        <div className="flex items-center justify-between mb-5">
          <h1 style={{ fontFamily: '"Archivo", sans-serif', fontWeight: 700, fontSize: "clamp(22px, 5vw, 28px)", margin: 0 }}>Eventos</h1>
          <Link
            href="/admin/eventos/novo"
            className="btn-new-desktop inline-flex items-center gap-1.5 h-11 rounded-[10px] border-0 bg-primary text-primary-foreground text-sm font-semibold no-underline"
            style={{ padding: "0 18px" }}
          >
            <Plus size={15} aria-hidden /> Novo evento
          </Link>
        </div>

        {loading && (
          <div className="p-12 text-center text-muted-foreground">
            Carregando eventos…
          </div>
        )}

        {!loading && events.length === 0 && (
          <div className="p-12 text-center text-muted-foreground">
            <p className="font-semibold text-lg text-foreground" style={{ fontFamily: '"Archivo", sans-serif', margin: "0 0 16px" }}>
              Nenhum evento cadastrado.
            </p>
            <Link
              href="/admin/eventos/novo"
              className="inline-flex items-center gap-1.5 h-11 px-5 rounded-[10px] border-0 bg-primary text-primary-foreground text-sm font-semibold no-underline"
            >
              <Plus size={15} aria-hidden /> Criar primeiro evento
            </Link>
          </div>
        )}

        {!loading && events.length > 0 && (
          <div className="flex flex-col gap-2.5">
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
                    className="w-12 h-12 rounded-[10px] shrink-0 overflow-hidden flex items-center justify-center relative z-[1]"
                    style={{ background: bg }}
                    aria-hidden
                  >
                    {logo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={logo} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="font-black text-xl leading-none select-none" style={{ fontFamily: '"Archivo Black", sans-serif', color: accent }}>
                        {ev.name.slice(0, 1).toUpperCase()}
                      </span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0 relative z-[1]">
                    <p className="font-semibold text-[15px] overflow-hidden whitespace-nowrap" style={{ fontFamily: '"Archivo", sans-serif', margin: "0 0 4px", textOverflow: "ellipsis" }}>{ev.name}</p>
                    <div className="flex items-center gap-2.5 flex-wrap">
                      {ev.startsAt && (
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar size={11} aria-hidden />
                          {new Date(ev.startsAt).toLocaleDateString("pt-BR", { day: "numeric", month: "short", year: "numeric" })}
                        </span>
                      )}
                      {ev.place && (
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin size={11} aria-hidden />
                          {ev.place}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Status badge */}
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold shrink-0 relative z-[1] whitespace-nowrap" style={{ color: st.color, background: st.bg }}>
                    {st.label}
                  </span>

                  {/* Action buttons */}
                  <div className="ev-actions flex gap-1.5 relative z-[1]">
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
        className="fab fixed right-5 w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center no-underline z-20"
        aria-label="Novo evento"
        style={{
          bottom: 88,
          boxShadow: "0 4px 16px hsl(var(--primary) / .4)",
        }}
      >
        <Plus size={24} aria-hidden />
      </Link>

      <style>{`
        .admin-subnav { display: flex; }
        .btn-new-desktop { display: inline-flex; }
        .fab { display: none; }
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
      className="text-sm font-medium no-underline"
      style={{ padding: "12px 14px", borderBottom: active ? "2px solid hsl(var(--primary))" : "2px solid transparent", color: active ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))", marginBottom: -1 }}
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
      className="inline-flex items-center justify-center w-11 h-11 rounded-[9px] bg-background no-underline text-foreground"
      style={{ border: "1px solid hsl(var(--border))" }}
    >
      {icon}
    </Link>
  );
}

