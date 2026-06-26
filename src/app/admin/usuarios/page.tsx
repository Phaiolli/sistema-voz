"use client";

import { useState, useEffect, useCallback } from "react";
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

  const fetchUsers = useCallback(() =>
    fetch("/api/v1/users?role=admin")
      .then((r) => {
        if (!r.ok) throw new Error("Falha ao carregar usuários");
        return r.json();
      })
      .then((data: { users: UserPublic[] }) => setUsers(data.users))
      .catch(() => toast.error("Erro ao carregar usuários."))
      .finally(() => setLoading(false)),
  []);

  function loadUsers() {
    setLoading(true);
    void fetchUsers();
  }

  useEffect(() => {
    // `loading` já inicia como `true`; o fetch atualiza o estado apenas nos
    // callbacks (assíncronos), evitando setState síncrono dentro do efeito.
    void fetchUsers();
  }, [fetchUsers]);

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
    <div className="min-h-[100dvh] bg-background text-foreground pb-20">
      {/* Header */}
      <header className="h-14 flex items-center gap-2.5 px-4 sticky top-0 bg-background z-10" style={{ borderBottom: "1px solid hsl(var(--border))" }}>
        <VozWordmark size={20} />
        <EnvSwitcher active="admin" />
        <div className="flex-1" />
        <HeaderControls />
      </header>

      {/* Desktop sub-nav */}
      <div className="admin-subnav flex items-center px-4 gap-1 bg-background" style={{ borderBottom: "1px solid hsl(var(--border))" }}>
        <NavLink href="/admin/eventos">Eventos</NavLink>
        <NavLink href="/admin/usuarios" active>Usuários</NavLink>
      </div>

      <main className="max-w-[800px] mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-5">
          <h1 style={{ fontFamily: '"Archivo", sans-serif', fontWeight: 700, fontSize: "clamp(22px, 5vw, 28px)", margin: 0 }}>Administradores</h1>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-1.5 h-11 px-4 rounded-[10px] border-0 bg-primary text-primary-foreground text-sm font-semibold cursor-pointer"
          >
            <Plus size={15} aria-hidden /> <span className="btn-label">Novo administrador</span>
          </button>
        </div>

        {showForm && (
          <form
            onSubmit={handleSubmit}
            className="mb-6 p-5 bg-muted rounded-xl flex flex-col gap-3.5"
            style={{ border: "1px solid hsl(var(--border))" }}
          >
            <h2 className="text-base font-semibold m-0" style={{ fontFamily: '"Archivo", sans-serif' }}>
              {editingId ? "Editar usuário" : "Novo usuário"}
            </h2>
            <div className="form-grid grid gap-3" style={{ gridTemplateColumns: "1fr 1fr" }}>
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
            <div className="flex gap-2 flex-wrap">
              <button
                type="submit"
                disabled={submitting}
                className="h-11 px-5 rounded-[9px] border-0 bg-primary text-primary-foreground text-sm font-semibold"
                style={{ cursor: submitting ? "not-allowed" : "pointer", opacity: submitting ? 0.7 : 1 }}
              >
                {submitting ? "Salvando…" : editingId ? "Salvar alterações" : "Criar usuário"}
              </button>
              <button
                type="button"
                onClick={cancelForm}
                className="h-11 px-4 rounded-[9px] bg-transparent text-sm cursor-pointer"
                style={{ border: "1px solid hsl(var(--border))" }}
              >
                Cancelar
              </button>
            </div>
          </form>
        )}

        {loading && (
          <div className="p-12 text-center text-muted-foreground">Carregando usuários…</div>
        )}

        {!loading && users.length === 0 && (
          <div className="p-12 text-center text-muted-foreground">Nenhum usuário cadastrado.</div>
        )}

        {/* Desktop table */}
        {!loading && users.length > 0 && (
          <>
            <div className="users-table rounded-xl overflow-hidden" style={{ border: "1px solid hsl(var(--border))" }}>
              <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}>
                <thead>
                  <tr className="bg-muted" style={{ borderBottom: "1px solid hsl(var(--border))" }}>
                    {["Nome", "Email", "Função", "Último acesso", "Ações"].map((h) => (
                      <th key={h} className="px-4 py-2.5 text-left font-semibold text-[13px]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.map((u, i) => (
                    <tr key={u.id} style={{ borderBottom: i < users.length - 1 ? "1px solid hsl(var(--border))" : "none" }}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <UserAvatar name={u.name} size={32} />
                          <span className="font-medium">{u.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                      <td className="px-4 py-3">
                        <RoleBadge role={u.role} />
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-[13px]">
                        {u.lastSeenAt ? new Date(u.lastSeenAt).toLocaleDateString("pt-BR") : "nunca"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1.5">
                          <button onClick={() => openEdit(u)} className="h-9 px-3 rounded-md bg-transparent text-xs cursor-pointer" style={{ border: "1px solid hsl(var(--border))" }}>Editar</button>
                          <button onClick={() => handleDelete(u)} className="h-9 px-3 rounded-md bg-transparent text-xs cursor-pointer text-destructive" style={{ border: "1px solid hsl(var(--border))" }}>Remover</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="users-cards hidden flex-col gap-2.5">
              {users.map((u) => (
                <div key={u.id} className="bg-muted rounded-xl p-4" style={{ border: "1px solid hsl(var(--border))" }}>
                  <div className="flex items-center gap-3 mb-3">
                    <UserAvatar name={u.name} size={40} />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-[15px] overflow-hidden whitespace-nowrap" style={{ margin: "0 0 2px", textOverflow: "ellipsis" }}>{u.name}</p>
                      <p className="text-[13px] text-muted-foreground m-0 overflow-hidden whitespace-nowrap" style={{ textOverflow: "ellipsis" }}>{u.email}</p>
                    </div>
                    <RoleBadge role={u.role} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      Acesso: {u.lastSeenAt ? new Date(u.lastSeenAt).toLocaleDateString("pt-BR") : "nunca"}
                    </span>
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(u)} className="h-11 px-3.5 rounded-[9px] bg-transparent text-[13px] cursor-pointer" style={{ border: "1px solid hsl(var(--border))" }}>Editar</button>
                      <button onClick={() => handleDelete(u)} className="h-11 px-3.5 rounded-[9px] bg-transparent text-[13px] cursor-pointer text-destructive" style={{ border: "1px solid hsl(var(--border))" }}>Remover</button>
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
    <div
      className="rounded-full text-primary flex items-center justify-center font-bold shrink-0"
      style={{ width: size, height: size, background: "hsl(var(--primary) / .12)", fontSize: size * 0.35, border: "1px solid hsl(var(--primary) / .2)" }}
    >
      {abbr}
    </div>
  );
}

function RoleBadge({ role }: { role: UserRole }) {
  return (
    <span
      className="rounded-full text-xs font-semibold whitespace-nowrap"
      style={{ padding: "3px 8px", background: role === "admin" ? "hsl(var(--primary) / .12)" : "hsl(var(--muted))", color: role === "admin" ? "hsl(var(--primary))" : "hsl(var(--foreground))" }}
    >
      {role}
    </span>
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

function FormField({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-[13px] font-medium">{label}</label>
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
