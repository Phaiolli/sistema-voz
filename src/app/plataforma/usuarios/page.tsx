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
    <div className="bg-background text-foreground" style={{ minHeight: "100dvh" }}>
      <PlataformaHeader active="usuarios" />

      <main className="mx-auto px-6 py-8" style={{ maxWidth: 1200 }}>
        <div className="mb-7">
          <h1 className="font-bold" style={{ fontFamily: '"Archivo", sans-serif', fontSize: 24, margin: "0 0 4px" }}>
            Usuários
          </h1>
          <p className="text-muted-foreground" style={{ fontSize: 13, margin: 0 }}>
            {loading ? "Carregando…" : `${users.length} usuário${users.length !== 1 ? "s" : ""} registrados`}
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-5">
          <input
            type="search"
            placeholder="Buscar por nome ou e-mail…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 h-9 px-3.5 rounded-[10px] border border-border bg-muted text-foreground text-sm outline-none"
            style={{ minWidth: 240, fontFamily: "inherit" }}
          />
          <select
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value)}
            className="h-9 px-3 rounded-[10px] border border-border bg-muted text-foreground cursor-pointer"
            style={{ fontSize: 13, fontFamily: "inherit" }}
          >
            <option value="all">Todos os cargos</option>
            {roles.map(r => <option key={r} value={r}>{roleName(r)}</option>)}
          </select>
          <select
            value={planFilter}
            onChange={e => setPlanFilter(e.target.value)}
            className="h-9 px-3 rounded-[10px] border border-border bg-muted text-foreground cursor-pointer"
            style={{ fontSize: 13, fontFamily: "inherit" }}
          >
            <option value="all">Todos os planos</option>
            <option value="free">Gratuito</option>
            <option value="paid">Pago</option>
          </select>
        </div>

        {/* Table */}
        <div className="bg-muted border border-border rounded-2xl overflow-hidden">
          {loading ? (
            <p className="p-8 text-center text-muted-foreground" style={{ fontSize: 13 }}>Carregando…</p>
          ) : filtered.length === 0 ? (
            <p className="p-8 text-center text-muted-foreground" style={{ fontSize: 13 }}>
              Nenhum usuário encontrado.
            </p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className="w-full" style={{ borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr className="border-b border-border bg-background">
                    {["Usuário", "Cargo", "Plano", "Eventos", "Último acesso", "Cadastro"].map(h => (
                      <th key={h} className="py-3 px-4 text-left font-semibold text-muted-foreground uppercase whitespace-nowrap" style={{ fontSize: 12, letterSpacing: ".05em" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(u => (
                    <tr key={u.id} className="border-b border-border">
                      <td className="py-3.5 px-4">
                        <p className="m-0 font-semibold">{u.name}</p>
                        <p className="m-0 text-muted-foreground" style={{ fontSize: 12 }}>{u.email}</p>
                      </td>
                      <td className="py-3.5 px-4">
                        <RoleBadge role={u.role} />
                      </td>
                      <td className="py-3.5 px-4">
                        <PlanBadge plan={u.plan} />
                      </td>
                      <td className="py-3.5 px-4 font-semibold">
                        {u.eventsCount}
                      </td>
                      <td className="py-3.5 px-4 text-muted-foreground" style={{ fontSize: 12 }}>
                        {u.lastSeenAt ? new Date(u.lastSeenAt).toLocaleDateString("pt-BR") : "—"}
                      </td>
                      <td className="py-3.5 px-4 text-muted-foreground whitespace-nowrap" style={{ fontSize: 12 }}>
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
    <span className="py-1 px-2.5 rounded-full font-semibold whitespace-nowrap" style={{ fontSize: 12, color: s.color, background: s.bg }}>
      {s.label}
    </span>
  );
}

function PlanBadge({ plan }: { plan: string }) {
  const isPaid = plan === "paid";
  return (
    <span
      className={`py-1 px-2.5 rounded-full font-semibold ${isPaid ? "text-primary bg-primary/10" : "text-muted-foreground bg-border"}`}
      style={{ fontSize: 12 }}
    >
      {isPaid ? "Pago" : "Grátis"}
    </span>
  );
}
