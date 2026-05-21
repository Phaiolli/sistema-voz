"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { VozWordmark } from "@/components/voz/wordmark";
import { HeaderControls } from "@/components/voz/header-controls";
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

export default function AdminUsuariosPage() {
  const [users, setUsers] = useState<UserPublic[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<UserForm>(emptyForm());
  const [submitting, setSubmitting] = useState(false);

  const inp: React.CSSProperties = {
    padding: "8px 12px",
    borderRadius: 8,
    border: "1.5px solid hsl(var(--border))",
    background: "hsl(var(--background))",
    color: "hsl(var(--foreground))",
    fontSize: 14,
    fontFamily: "inherit",
    width: "100%",
    boxSizing: "border-box" as const,
  };

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
    <div style={{ minHeight: "100dvh", background: "hsl(var(--background))", color: "hsl(var(--foreground))" }}>
      <header style={{ height: 56, borderBottom: "1px solid hsl(var(--border))", display: "flex", alignItems: "center", padding: "0 24px", gap: 16 }}>
        <VozWordmark size={22} />
        <nav style={{ display: "flex", gap: 4 }} aria-label="Admin">
          <NavLink href="/admin/eventos">Eventos</NavLink>
          <NavLink href="/admin/usuarios" active>Usuários</NavLink>
        </nav>
        <div style={{ flex: 1 }} />
        <div style={{ width: 1, height: 24, background: "hsl(var(--border))" }} aria-hidden />
        <HeaderControls />
      </header>

      <main style={{ maxWidth: 800, margin: "0 auto", padding: "32px 24px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <h1 style={{ fontFamily: '"Archivo", sans-serif', fontWeight: 700, fontSize: 28, margin: 0 }}>Administradores</h1>
          <button
            onClick={openCreate}
            style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 36, padding: "0 14px", borderRadius: 8, border: "none", background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
          >
            <Plus size={14} aria-hidden /> Novo administrador
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
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <FormField label="Nome" htmlFor="u-name">
                <input id="u-name" required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} style={inp} />
              </FormField>
              <FormField label="E-mail" htmlFor="u-email">
                <input id="u-email" type="email" required value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} style={inp} />
              </FormField>
              <FormField label={editingId ? "Senha (deixar vazio = sem alteração)" : "Senha"} htmlFor="u-pass">
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
            <div style={{ display: "flex", gap: 8 }}>
              <button type="submit" disabled={submitting} style={{ height: 36, padding: "0 16px", borderRadius: 8, border: "none", background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))", fontSize: 13, fontWeight: 600, cursor: submitting ? "not-allowed" : "pointer", opacity: submitting ? 0.7 : 1 }}>
                {submitting ? "Salvando…" : editingId ? "Salvar alterações" : "Criar usuário"}
              </button>
              <button type="button" onClick={cancelForm} style={{ height: 36, padding: "0 14px", borderRadius: 8, border: "1px solid hsl(var(--border))", background: "transparent", fontSize: 13, cursor: "pointer" }}>
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

        {!loading && users.length > 0 && (
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
                {users.map((u, i) => (
                  <tr key={u.id} style={{ borderBottom: i < users.length - 1 ? "1px solid hsl(var(--border))" : "none" }}>
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
                    <td style={{ padding: "12px 16px", color: "hsl(var(--muted-foreground))", fontSize: 13 }}>
                      {u.lastSeenAt ? new Date(u.lastSeenAt).toLocaleDateString("pt-BR") : "nunca"}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={() => openEdit(u)} style={{ height: 30, padding: "0 10px", borderRadius: 6, border: "1px solid hsl(var(--border))", background: "transparent", fontSize: 12, cursor: "pointer" }}>Editar</button>
                        <button onClick={() => handleDelete(u)} style={{ height: 30, padding: "0 10px", borderRadius: 6, border: "1px solid hsl(var(--border))", background: "transparent", fontSize: 12, cursor: "pointer", color: "hsl(var(--destructive))" }}>Remover</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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

function FormField({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <label htmlFor={htmlFor} style={{ fontSize: 13, fontWeight: 500 }}>{label}</label>
      {children}
    </div>
  );
}
