"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { PlataformaHeader } from "../page";
import { toast } from "sonner";

interface PlatUser {
  id: string;
  name: string;
  email: string;
  role: string;
  plan: string;
  eventsCount: number;
  createdAt: string;
  lastSeenAt: string | null;
}

export default function UsuariosPage() {
  const [users, setUsers] = useState<PlatUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [planFilter, setPlanFilter] = useState("all");

  useEffect(() => {
    fetch("/api/v1/plataforma/users")
      .then(r => r.json())
      .then(data => setUsers((data as { users: PlatUser[] }).users ?? []))
      .catch(() => toast.error("Erro ao carregar usuários."))
      .finally(() => setLoading(false));
  }, []);

  const filtered = users.filter(u => {
    if (search && !u.name.toLowerCase().includes(search.toLowerCase()) && !u.email.toLowerCase().includes(search.toLowerCase())) return false;
    if (roleFilter !== "all" && u.role !== roleFilter) return false;
    if (planFilter !== "all" && u.plan !== planFilter) return false;
    return true;
  });

  const roles = [...new Set(users.map(u => u.role))];

  return (
    <div style={{ minHeight: "100dvh", background: "hsl(var(--background))", color: "hsl(var(--foreground))" }}>
      <PlataformaHeader active="usuarios" />

      <main style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px" }}>
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontFamily: '"Archivo", sans-serif', fontWeight: 700, fontSize: 24, margin: "0 0 4px" }}>
            Usuários
          </h1>
          <p style={{ fontSize: 13, color: "hsl(var(--muted-foreground))", margin: 0 }}>
            {loading ? "Carregando…" : `${users.length} usuário${users.length !== 1 ? "s" : ""} registrados`}
          </p>
        </div>

        {/* Filters */}
        <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
          <input
            type="search"
            placeholder="Buscar por nome ou e-mail…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              flex: 1, minWidth: 240, height: 38, padding: "0 14px", borderRadius: 10,
              border: "1px solid hsl(var(--border))", background: "hsl(var(--muted))",
              color: "hsl(var(--foreground))", fontSize: 14, fontFamily: "inherit", outline: "none",
            }}
          />
          <select
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value)}
            style={{ height: 38, padding: "0 12px", borderRadius: 10, border: "1px solid hsl(var(--border))", background: "hsl(var(--muted))", color: "hsl(var(--foreground))", fontSize: 13, fontFamily: "inherit", cursor: "pointer" }}
          >
            <option value="all">Todos os cargos</option>
            {roles.map(r => <option key={r} value={r}>{roleName(r)}</option>)}
          </select>
          <select
            value={planFilter}
            onChange={e => setPlanFilter(e.target.value)}
            style={{ height: 38, padding: "0 12px", borderRadius: 10, border: "1px solid hsl(var(--border))", background: "hsl(var(--muted))", color: "hsl(var(--foreground))", fontSize: 13, fontFamily: "inherit", cursor: "pointer" }}
          >
            <option value="all">Todos os planos</option>
            <option value="free">Gratuito</option>
            <option value="paid">Pago</option>
          </select>
        </div>

        {/* Table */}
        <div style={{ background: "hsl(var(--muted))", border: "1px solid hsl(var(--border))", borderRadius: 16, overflow: "hidden" }}>
          {loading ? (
            <p style={{ padding: 32, fontSize: 13, color: "hsl(var(--muted-foreground))", textAlign: "center" }}>Carregando…</p>
          ) : filtered.length === 0 ? (
            <p style={{ padding: 32, fontSize: 13, color: "hsl(var(--muted-foreground))", textAlign: "center" }}>
              Nenhum usuário encontrado.
            </p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid hsl(var(--border))", background: "hsl(var(--background))" }}>
                    {["Usuário", "Cargo", "Plano", "Eventos", "Último acesso", "Cadastro"].map(h => (
                      <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontWeight: 600, color: "hsl(var(--muted-foreground))", fontSize: 12, textTransform: "uppercase", letterSpacing: ".05em", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(u => (
                    <tr key={u.id} style={{ borderBottom: "1px solid hsl(var(--border))" }}>
                      <td style={{ padding: "14px 16px" }}>
                        <p style={{ margin: 0, fontWeight: 600 }}>{u.name}</p>
                        <p style={{ margin: 0, color: "hsl(var(--muted-foreground))", fontSize: 12 }}>{u.email}</p>
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        <RoleBadge role={u.role} />
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        <PlanBadge plan={u.plan} />
                      </td>
                      <td style={{ padding: "14px 16px", fontWeight: 600 }}>
                        {u.eventsCount}
                      </td>
                      <td style={{ padding: "14px 16px", color: "hsl(var(--muted-foreground))", fontSize: 12 }}>
                        {u.lastSeenAt ? new Date(u.lastSeenAt).toLocaleDateString("pt-BR") : "—"}
                      </td>
                      <td style={{ padding: "14px 16px", color: "hsl(var(--muted-foreground))", fontSize: 12, whiteSpace: "nowrap" }}>
                        {new Date(u.createdAt).toLocaleDateString("pt-BR")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function roleName(role: string) {
  const map: Record<string, string> = { owner: "Organizador", admin: "Admin", mediador: "Mediador" };
  return map[role] ?? role;
}

function RoleBadge({ role }: { role: string }) {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    owner: { label: "Organizador", color: "hsl(var(--primary))", bg: "hsl(var(--primary) / .1)" },
    admin: { label: "Admin", color: "hsl(0 72% 51%)", bg: "hsl(0 72% 51% / .1)" },
    mediador: { label: "Mediador", color: "hsl(var(--muted-foreground))", bg: "hsl(var(--border))" },
  };
  const s = map[role] ?? { label: role, color: "hsl(var(--muted-foreground))", bg: "hsl(var(--border))" };
  return (
    <span style={{ padding: "3px 10px", borderRadius: 999, fontSize: 12, fontWeight: 600, color: s.color, background: s.bg, whiteSpace: "nowrap" }}>
      {s.label}
    </span>
  );
}

function PlanBadge({ plan }: { plan: string }) {
  const isPaid = plan === "paid";
  return (
    <span style={{
      padding: "3px 10px", borderRadius: 999, fontSize: 12, fontWeight: 600,
      color: isPaid ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))",
      background: isPaid ? "hsl(var(--primary) / .1)" : "hsl(var(--border))",
    }}>
      {isPaid ? "Pago" : "Grátis"}
    </span>
  );
}
