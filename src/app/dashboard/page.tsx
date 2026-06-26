"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, Mic, Eye, Edit, Download, Zap } from "lucide-react";
import { VozWordmark } from "@/components/voz/wordmark";
import { HeaderControls } from "@/components/voz/header-controls";
import { toast } from "sonner";
import type { Event } from "@/lib/types";
import { FREE_EVENT_LIMIT } from "@/lib/plan-limits";

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

export default function DashboardPage() {
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

  const atLimit = events.length >= FREE_EVENT_LIMIT;

  return (
    <div className="bg-background text-foreground" style={{ minHeight: "100dvh" }}>
      <header className="flex items-center gap-4 border-b border-border px-6" style={{ height: 56 }}>
        <VozWordmark size={22} />
        <nav className="flex gap-1" aria-label="Dashboard">
          <NavLink href="/dashboard" active>Eventos</NavLink>
          <NavLink href="/dashboard/conta">Conta</NavLink>
        </nav>
        <div className="flex-1" />
        <div className="bg-border" style={{ width: 1, height: 24 }} aria-hidden />
        <HeaderControls />
      </header>

      <main className="mx-auto py-8 px-6" style={{ maxWidth: 960 }}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-bold text-[28px] mb-1" style={{ fontFamily: '"Archivo", sans-serif' }}>Meus eventos</h1>
            <p className="text-[13px] text-muted-foreground m-0">
              {loading ? "Carregando…" : `${events.length} de ${FREE_EVENT_LIMIT} evento${FREE_EVENT_LIMIT !== 1 ? "s" : ""} no plano gratuito`}
            </p>
          </div>
          <Link
            href="/dashboard/novo-evento"
            className="inline-flex items-center gap-1.5 px-3.5 rounded-lg border-0 bg-primary text-primary-foreground text-[13px] font-semibold no-underline"
            style={{ height: 36 }}
          >
            <Plus size={14} aria-hidden /> Novo evento
          </Link>
        </div>

        {atLimit && !loading && (
          <div className="flex items-center justify-between gap-4 mb-6 py-4 px-5 rounded-xl border" style={{ borderColor: "hsl(var(--primary) / .3)", background: "hsl(var(--primary) / .06)" }}>
            <div className="flex items-center gap-3">
              <Zap size={20} className="text-primary shrink-0" aria-hidden />
              <div>
                <p className="font-semibold text-sm mb-0.5" style={{ fontFamily: '"Archivo", sans-serif' }}>
                  Limite do plano gratuito atingido
                </p>
                <p className="text-[13px] text-muted-foreground m-0">
                  Crie mais eventos por R$&nbsp;59,90 cada.
                </p>
              </div>
            </div>
            <Link
              href="/dashboard/novo-evento"
              className="shrink-0 inline-flex items-center gap-1.5 px-3.5 rounded-lg border-0 bg-primary text-primary-foreground text-[13px] font-semibold no-underline"
              style={{ height: 36 }}
            >
              <Plus size={14} aria-hidden /> Criar novo evento — R$&nbsp;59,90
            </Link>
          </div>
        )}

        {loading && (
          <div className="p-12 text-center text-muted-foreground">
            Carregando eventos…
          </div>
        )}

        {!loading && events.length === 0 && (
          <div className="p-12 text-center text-muted-foreground">
            <p className="font-semibold text-lg text-foreground mb-3" style={{ fontFamily: '"Archivo", sans-serif' }}>
              Nenhum evento cadastrado.
            </p>
            <Link
              href="/dashboard/novo-evento"
              className="inline-flex items-center gap-1.5 px-4 rounded-lg border-0 bg-primary text-primary-foreground text-sm font-semibold no-underline"
              style={{ height: 40 }}
            >
              <Plus size={14} aria-hidden /> Criar primeiro evento grátis
            </Link>
          </div>
        )}

        {!loading && events.length > 0 && (
          <div className="flex flex-col gap-3">
            {events.map((ev) => {
              const st = eventDateLabel(ev.status, ev.startsAt ?? null);
              const logo = ev.theme?.logoUrl ?? ev.config?.page?.logo;
              const bg = ev.theme?.background ?? "#1E4953";
              const accent = ev.theme?.accent ?? "#F2B33D";
              return (
                <div key={ev.id} className="ev-row">
                  <Link href={`/admin/eventos/${ev.id}`} className="ev-overlay" aria-label={`Editar ${ev.name}`} />

                  <div
                    className="relative z-[1] flex items-center justify-center shrink-0 overflow-hidden rounded-[10px]"
                    style={{ width: 48, height: 48, background: bg }}
                    aria-hidden
                  >
                    {logo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={logo} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="font-black text-xl select-none" style={{ fontFamily: '"Archivo Black", sans-serif', color: accent, lineHeight: 1 }}>
                        {ev.name.slice(0, 1).toUpperCase()}
                      </span>
                    )}
                  </div>

                  <div className="relative z-[1] flex-1 min-w-0">
                    <p className="font-semibold text-base mb-1" style={{ fontFamily: '"Archivo", sans-serif' }}>{ev.name}</p>
                    <p className="text-[13px] text-muted-foreground m-0">
                      {ev.startsAt
                        ? new Date(ev.startsAt).toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" })
                        : "Sem data"}
                      {ev.place ? ` · ${ev.place}` : ""}
                    </p>
                  </div>

                  <span className="relative z-[1] shrink-0 rounded-full py-1 px-2.5 text-xs font-semibold" style={{ color: st.color, background: st.bg }}>
                    {st.label}
                  </span>

                  <div className="relative z-[1] flex gap-1.5">
                    <ActionBtn href="/mediador" icon={<Mic size={14} />} label="Abrir mediador" />
                    <ActionBtn href={`/e/${ev.slug}`} icon={<Eye size={14} />} label="Ver página do evento" />
                    <ActionBtn href={`/admin/eventos/${ev.id}`} icon={<Edit size={14} />} label="Editar evento" />
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
    <Link
      href={href}
      className={`py-1.5 px-3 rounded-lg text-sm font-medium no-underline ${active ? "bg-muted text-foreground" : "bg-transparent text-muted-foreground"}`}
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
      className="inline-flex items-center justify-center rounded-lg border border-border bg-background no-underline text-foreground"
      style={{ width: 36, height: 36 }}
    >
      {icon}
    </Link>
  );
}
