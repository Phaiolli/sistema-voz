"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { VozWordmark } from "@/components/voz/wordmark";
import { HeaderControls } from "@/components/voz/header-controls";
import { EnvSwitcher } from "@/components/voz/env-switcher";
import { toast } from "sonner";
import type { UserRole } from "@/lib/types";

interface UserPublic {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: string;
  lastSeenAt: string | null;
}

interface UserForm {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}

const emptyForm = (): UserForm => ({ name: "", email: "", password: "", role: "admin" });

const inp: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 8,
  border: "1.5px solid hsl(var(--border))",
  background: "hsl(var(--background))",
  color: "hsl(var(--foreground))",
  fontSize: 14,
  fontFamily: "inherit",
  width: "100%",
  boxSizing: "border-box",
  minHeight: 44,
};

export default function AdminUsuariosPage() {
  const [users, setUsers] = useState<UserPublic[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<UserForm>(emptyForm());
  const [submitting, setSubmitting] = useState(false);

  function loadUsers() {
    setLoading(true);
    fetch("/api/v1/users?role=admin")
      .then((r) => {
        if (!r.ok) throw new Error("Falha ao carregar usuários");
        return r.json();
      })
      .then((data: { users: UserPublic[] }) => setUsers(data.users))
      .catch(() => toast.error("Erro ao carregar usuários."))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadUsers();
  }, []);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm());
    setShowForm(true);
    setTimeout(() => document.getElementById("u-name")?.focus(), 50);
  }

  function openEdit(user: UserPublic) {
    setEditingId(user.id);
    setForm({ name: user.name, email: user.email, password: "", role: user.role });
    setShowForm(true);
  }

  function cancelForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm());
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const body: Record<string, string> = { name: form.name, email: form.email, role: form.role };
      if (form.password) body["password"] = form.password;

      const isEdit = editingId !== null;
      const res = await fetch(isEdit ? `/api/v1/users/${editingId}` : "/api/v1/users", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json() as { message?: string };
        toast.error(err.message ?? "Erro ao salvar usuário.");
        return;
      }

      toast.success(isEdit ? "Usuário atualizado." : "Usuário criado.");
      cancelForm();
      loadUsers();
    } catch {
      toast.error("Erro ao salvar usuário.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(user: UserPublic) {
    if (!window.confirm("Remover este usuário? Esta ação não pode ser desfeita.")) return;
    try {
      const res = await fetch(`/api/v1/users/${user.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Falha");
      toast.success("Usuário removido.");
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
    } catch {
      toast.error("Erro ao remover usuário.");
    }
  }

  return (
    <div style={{ minHeight: "100dvh", background: "hsl(var(--background))", color: "hsl(var(--foreground))", paddingBottom: 80 }}>
      {/* Header */}
      <header style={{ height: 56, borderBottom: "1px solid hsl(var(--border))", display: "flex", alignItems: "center", padding: "0 16px", gap: 10, position: "sticky", top: 0, background: "hsl(var(--background))", zIndex: 10 }}>
        <VozWordmark size={20} />
        <EnvSwitcher active="admin" />
        <div style={{ flex: 1 }} />
        <HeaderControls />
      </header>

      {/* Desktop sub-nav */}
      <div className="admin-subnav" style={{ borderBottom: "1px solid hsl(var(--border))", display: "flex", alignItems: "center", padding: "0 16px", gap: 4, background: "hsl(var(--background))" }}>
        <NavLink href="/admin/eventos">Eventos</NavLink>
        <NavLink href="/admin/usuarios" active>Usuários</NavLink>
      </div>

      <main style={{ maxWidth: 800, margin: "0 auto", padding: "24px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <h1 style={{ fontFamily: '"Archivo", sans-serif', fontWeight: 700, fontSize: "clamp(22px, 5vw, 28px)", margin: 0 }}>Administradores</h1>
          <button
            onClick={openCreate}
            style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 44, padding: "0 16px", borderRadius: 10, border: "none", background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))", fontSize: 14, fontWeight: 600, cursor: "pointer" }}
          >
            <Plus size={15} aria-hidden /> <span className="btn-label">Novo administrador</span>
          </button>
        </div>

        {showForm && (
          <form
            onSubmit={handleSubmit}
            style={{ marginBottom: 24, padding: 20, background: "hsl(var(--muted))", borderRadius: 12, border: "1px solid hsl(var(--border))", display: "flex", flexDirection: "column", gap: 14 }}
          >
            <h2 style={{ fontFamily: '"Archivo", sans-serif', fontWeight: 600, fontSize: 16, margin: 0 }}>
              {editingId ? "Editar usuário" : "Novo usuário"}
            </h2>
            <div className="form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <FormField label="Nome" htmlFor="u-name">
                <input id="u-name" required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} style={inp} />
              </FormField>
              <FormField label="E-mail" htmlFor="u-email">
                <input id="u-email" type="email" required value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} style={inp} />
              </FormField>
              <FormField label={editingId ? "Senha (vazio = sem alteração)" : "Senha"} htmlFor="u-pass">
                <input
                  id="u-pass"
                  type="password"
                  required={!editingId}
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  placeholder={editingId ? "deixar vazio = sem alteração" : ""}
                  style={inp}
                />
              </FormField>
              <FormField label="Função" htmlFor="u-role">
                <input id="u-role" value="admin" readOnly style={{ ...inp, color: "hsl(var(--muted-foreground))" }} />
              </FormField>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                type="submit"
                disabled={submitting}
                style={{ height: 44, padding: "0 20px", borderRadius: 9, border: "none", background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))", fontSize: 14, fontWeight: 600, cursor: submitting ? "not-allowed" : "pointer", opacity: submitting ? 0.7 : 1 }}
              >
                {submitting ? "Salvando…" : editingId ? "Salvar alterações" : "Criar usuário"}
              </button>
              <button
                type="button"
                onClick={cancelForm}
                style={{ height: 44, padding: "0 16px", borderRadius: 9, border: "1px solid hsl(var(--border))", background: "transparent", fontSize: 14, cursor: "pointer" }}
              >
                Cancelar
              </button>
            </div>
          </form>
        )}

        {loading && (
          <div style={{ padding: 48, textAlign: "center", color: "hsl(var(--muted-foreground))" }}>Carregando usuários…</div>
        )}

        {!loading && users.length === 0 && (
          <div style={{ padding: 48, textAlign: "center", color: "hsl(var(--muted-foreground))" }}>Nenhum usuário cadastrado.</div>
        )}

        {/* Desktop table */}
        {!loading && users.length > 0 && (
          <>
            <div className="users-table" style={{ border: "1px solid hsl(var(--border))", borderRadius: 12, overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                <thead>
                  <tr style={{ background: "hsl(var(--muted))", borderBottom: "1px solid hsl(var(--border))" }}>
                    {["Nome", "Email", "Função", "Último acesso", "Ações"].map((h) => (
                      <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontWeight: 600, fontSize: 13 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.map((u, i) => (
                    <tr key={u.id} style={{ borderBottom: i < users.length - 1 ? "1px solid hsl(var(--border))" : "none" }}>
                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <UserAvatar name={u.name} size={32} />
                          <span style={{ fontWeight: 500 }}>{u.name}</span>
                        </div>
                      </td>
                      <td style={{ padding: "12px 16px", color: "hsl(var(--muted-foreground))" }}>{u.email}</td>
                      <td style={{ padding: "12px 16px" }}>
                        <RoleBadge role={u.role} />
                      </td>
                      <td style={{ padding: "12px 16px", color: "hsl(var(--muted-foreground))", fontSize: 13 }}>
                        {u.lastSeenAt ? new Date(u.lastSeenAt).toLocaleDateString("pt-BR") : "nunca"}
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button onClick={() => openEdit(u)} style={{ height: 36, padding: "0 12px", borderRadius: 7, border: "1px solid hsl(var(--border))", background: "transparent", fontSize: 12, cursor: "pointer" }}>Editar</button>
                          <button onClick={() => handleDelete(u)} style={{ height: 36, padding: "0 12px", borderRadius: 7, border: "1px solid hsl(var(--border))", background: "transparent", fontSize: 12, cursor: "pointer", color: "hsl(var(--destructive))" }}>Remover</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="users-cards" style={{ display: "none", flexDirection: "column", gap: 10 }}>
              {users.map((u) => (
                <div key={u.id} style={{ background: "hsl(var(--muted))", border: "1px solid hsl(var(--border))", borderRadius: 12, padding: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                    <UserAvatar name={u.name} size={40} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontWeight: 600, fontSize: 15, margin: "0 0 2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.name}</p>
                      <p style={{ fontSize: 13, color: "hsl(var(--muted-foreground))", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.email}</p>
                    </div>
                    <RoleBadge role={u.role} />
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 12, color: "hsl(var(--muted-foreground))" }}>
                      Acesso: {u.lastSeenAt ? new Date(u.lastSeenAt).toLocaleDateString("pt-BR") : "nunca"}
                    </span>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={() => openEdit(u)} style={{ height: 44, padding: "0 14px", borderRadius: 9, border: "1px solid hsl(var(--border))", background: "transparent", fontSize: 13, cursor: "pointer" }}>Editar</button>
                      <button onClick={() => handleDelete(u)} style={{ height: 44, padding: "0 14px", borderRadius: 9, border: "1px solid hsl(var(--border))", background: "transparent", fontSize: 13, cursor: "pointer", color: "hsl(var(--destructive))" }}>Remover</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </main>

      <style>{`
        .admin-subnav { display: flex; }
        .btn-label { display: inline; }
        .users-table { display: block; }
        .users-cards { display: none; }
        .form-grid { grid-template-columns: 1fr 1fr; }

        @media (max-width: 639px) {
          .admin-subnav { display: none; }
          .btn-label { display: none; }
          .users-table { display: none; }
          .users-cards { display: flex !important; }
          .form-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

function UserAvatar({ name, size }: { name: string; size: number }) {
  const abbr = name.split(" ").map((w) => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: "hsl(var(--primary) / .12)", color: "hsl(var(--primary))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.35, fontWeight: 700, border: "1px solid hsl(var(--primary) / .2)", flexShrink: 0 }}>
      {abbr}
    </div>
  );
}

function RoleBadge({ role }: { role: UserRole }) {
  return (
    <span style={{ padding: "3px 8px", borderRadius: 999, fontSize: 12, fontWeight: 600, background: role === "admin" ? "hsl(var(--primary) / .12)" : "hsl(var(--muted))", color: role === "admin" ? "hsl(var(--primary))" : "hsl(var(--foreground))", whiteSpace: "nowrap" }}>
      {role}
    </span>
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

function FormField({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <label htmlFor={htmlFor} style={{ fontSize: 13, fontWeight: 500 }}>{label}</label>
      {children}
    </div>
  );
}

function UsersIcon() {
  return (
    <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
