import Link from "next/link";
import { Plus, Mic, QrCode, Download, Edit } from "lucide-react";
import { VozWordmark } from "@/components/voz/wordmark";
import { eventIncluir } from "@/lib/fixtures";

const EVENTS = [eventIncluir];

function statusLabel(s: string) {
  if (s === "active") return { label: "Ao vivo", color: "hsl(var(--success))", bg: "hsl(142 71% 45% / .12)" };
  if (s === "ended") return { label: "Encerrado", color: "hsl(var(--muted-foreground))", bg: "hsl(var(--muted))" };
  return { label: "Rascunho", color: "hsl(38 85% 40%)", bg: "hsl(var(--accent) / .12)" };
}

export default function AdminEventosPage() {
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
          href="/admin/eventos/new"
          style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 36, padding: "0 14px", borderRadius: 8, border: "none", background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))", fontSize: 13, fontWeight: 600, textDecoration: "none" }}
        >
          <Plus size={14} aria-hidden /> Novo evento
        </Link>
      </header>

      <main style={{ maxWidth: 960, margin: "0 auto", padding: "32px 24px" }}>
        <h1 style={{ fontFamily: '"Archivo", sans-serif', fontWeight: 700, fontSize: 28, margin: "0 0 24px" }}>Eventos</h1>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {EVENTS.map((ev) => {
            const st = statusLabel(ev.status);
            return (
              <div key={ev.id} style={{ display: "flex", alignItems: "center", gap: 16, padding: "16px 20px", background: "hsl(var(--muted))", borderRadius: 12, border: "1px solid hsl(var(--border))" }}>
                <div style={{ width: 48, height: 48, borderRadius: 10, background: ev.theme.background ?? "#1E4953", flexShrink: 0 }} aria-hidden />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontFamily: '"Archivo", sans-serif', fontWeight: 600, fontSize: 16, margin: "0 0 4px" }}>{ev.name}</p>
                  <p style={{ fontSize: 13, color: "hsl(var(--muted-foreground))", margin: 0 }}>
                    {new Date(ev.startsAt).toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" })} · {ev.place}
                  </p>
                </div>
                <span style={{ padding: "4px 10px", borderRadius: 999, fontSize: 12, fontWeight: 600, color: st.color, background: st.bg }}>
                  {st.label}
                </span>
                <div style={{ display: "flex", gap: 6 }}>
                  <ActionBtn href={`/mediador`} icon={<Mic size={14} />} label="Abrir mediador" />
                  <ActionBtn href={`/admin/eventos/${ev.id}`} icon={<Edit size={14} />} label="Editar" />
                  <ActionBtn href={`/e/${ev.slug}`} icon={<QrCode size={14} />} label="Ver QR" />
                  <ActionBtn href="#" icon={<Download size={14} />} label="Exportar CSV" />
                </div>
              </div>
            );
          })}
        </div>
      </main>
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
    <Link href={href} aria-label={label} title={label} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 36, height: 36, borderRadius: 8, border: "1px solid hsl(var(--border))", background: "transparent", textDecoration: "none", color: "hsl(var(--foreground))" }}>
      {icon}
    </Link>
  );
}
