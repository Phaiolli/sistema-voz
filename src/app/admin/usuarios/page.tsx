import Link from "next/link";
import { Plus } from "lucide-react";
import { VozWordmark } from "@/components/voz/wordmark";

const USERS = [
  { id: "usr_andre", name: "Pastor André", email: "andre@ippaiquere.org", role: "admin" as const, lastSeen: "há 2h" },
  { id: "usr_leonardo", name: "Leonardo Veríssimo", email: "leonardo@incluir.org", role: "mediador" as const, lastSeen: "há 5 min" },
  { id: "usr_davi", name: "Davi Nogueira", email: "davi@ippaiquere.org", role: "mediador" as const, lastSeen: "há 1h" },
  { id: "usr_carla", name: "Carla Marcondes", email: "carla.m@ippaiquere.org", role: "mediador" as const, lastSeen: "nunca" },
];

export default function AdminUsuariosPage() {
  return (
    <div style={{ minHeight: "100dvh", background: "hsl(var(--background))", color: "hsl(var(--foreground))" }}>
      <header style={{ height: 56, borderBottom: "1px solid hsl(var(--border))", display: "flex", alignItems: "center", padding: "0 24px", gap: 16 }}>
        <VozWordmark size={22} />
        <nav style={{ display: "flex", gap: 4 }} aria-label="Admin">
          <NavLink href="/admin/eventos">Eventos</NavLink>
          <NavLink href="/admin/usuarios" active>Usuários</NavLink>
        </nav>
        <div style={{ flex: 1 }} />
        <button style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 36, padding: "0 14px", borderRadius: 8, border: "none", background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
          <Plus size={14} aria-hidden /> Convidar usuário
        </button>
      </header>

      <main style={{ maxWidth: 800, margin: "0 auto", padding: "32px 24px" }}>
        <h1 style={{ fontFamily: '"Archivo", sans-serif', fontWeight: 700, fontSize: 28, margin: "0 0 24px" }}>Usuários</h1>

        <div style={{ border: "1px solid hsl(var(--border))", borderRadius: 12, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ background: "hsl(var(--muted))", borderBottom: "1px solid hsl(var(--border))" }}>
                {["Nome", "Email", "Função", "Último acesso", "Ações"].map((h) => (
                  <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontWeight: 600, fontSize: 13 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {USERS.map((u, i) => (
                <tr key={u.id} style={{ borderBottom: i < USERS.length - 1 ? "1px solid hsl(var(--border))" : "none" }}>
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: "50%", background: "hsl(var(--muted))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, border: "1px solid hsl(var(--border))" }}>
                        {u.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}
                      </div>
                      <span style={{ fontWeight: 500 }}>{u.name}</span>
                    </div>
                  </td>
                  <td style={{ padding: "12px 16px", color: "hsl(var(--muted-foreground))" }}>{u.email}</td>
                  <td style={{ padding: "12px 16px" }}>
                    <span style={{ padding: "3px 8px", borderRadius: 999, fontSize: 12, fontWeight: 600, background: u.role === "admin" ? "hsl(var(--primary) / .12)" : "hsl(var(--muted))", color: u.role === "admin" ? "hsl(var(--primary))" : "hsl(var(--foreground))" }}>
                      {u.role}
                    </span>
                  </td>
                  <td style={{ padding: "12px 16px", color: "hsl(var(--muted-foreground))", fontSize: 13 }}>{u.lastSeen}</td>
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button style={{ height: 30, padding: "0 10px", borderRadius: 6, border: "1px solid hsl(var(--border))", background: "transparent", fontSize: 12, cursor: "pointer" }}>Editar</button>
                      <button style={{ height: 30, padding: "0 10px", borderRadius: 6, border: "1px solid hsl(var(--border))", background: "transparent", fontSize: 12, cursor: "pointer" }}>Reset senha</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
