"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save } from "lucide-react";
import { VozWordmark } from "@/components/voz/wordmark";
import { toast } from "sonner";
import type { Event } from "@/lib/types";

function toSlug(value: string) {
  return value.toLowerCase().trim().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

export default function NovoEventoPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [place, setPlace] = useState("");
  const [address, setAddress] = useState("");
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const inp: React.CSSProperties = {
    padding: "10px 14px",
    borderRadius: 8,
    border: "1.5px solid hsl(var(--border))",
    background: "hsl(var(--background))",
    color: "hsl(var(--foreground))",
    fontSize: 15,
    fontFamily: "inherit",
    width: "100%",
    boxSizing: "border-box" as const,
  };

  function handleNameChange(value: string) {
    setName(value);
    if (!slugEdited) setSlug(toSlug(value));
  }

  function handleSlugChange(value: string) {
    setSlugEdited(true);
    setSlug(value.toLowerCase().replace(/[^a-z0-9-]/g, "-"));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFieldErrors({});
    setSaving(true);
    try {
      const res = await fetch("/api/v1/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          slug,
          startsAt: new Date(startsAt).toISOString(),
          endsAt: new Date(endsAt).toISOString(),
          place,
          address,
          status: "draft",
        }),
      });

      if (res.status === 409) {
        setFieldErrors({ slug: "Slug já em uso" });
        return;
      }

      if (res.status === 422) {
        const body = await res.json() as { errors?: Record<string, string>; message?: string };
        if (body.errors) {
          setFieldErrors(body.errors);
        } else {
          toast.error(body.message ?? "Dados inválidos.");
        }
        return;
      }

      if (!res.ok) {
        toast.error("Erro ao criar evento. Tente novamente.");
        return;
      }

      const event = await res.json() as Event;
      toast.success("Evento criado.");
      router.push(`/admin/eventos/${event.id}`);
    } catch {
      toast.error("Erro ao criar evento. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ minHeight: "100dvh", background: "hsl(var(--background))", color: "hsl(var(--foreground))" }}>
      <header style={{ height: 56, borderBottom: "1px solid hsl(var(--border))", display: "flex", alignItems: "center", padding: "0 24px", gap: 12 }}>
        <Link
          href="/admin/eventos"
          aria-label="Voltar"
          style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 36, height: 36, borderRadius: 8, border: "1px solid hsl(var(--border))", textDecoration: "none", color: "hsl(var(--foreground))" }}
        >
          <ArrowLeft size={16} aria-hidden />
        </Link>
        <VozWordmark size={20} />
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 13, color: "hsl(var(--muted-foreground))" }}>Novo evento</span>
        <button
          form="form-novo-evento"
          type="submit"
          disabled={saving}
          style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 36, padding: "0 14px", borderRadius: 8, border: "none", background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))", fontSize: 13, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}
        >
          <Save size={14} aria-hidden /> {saving ? "Criando…" : "Criar evento"}
        </button>
      </header>

      <main style={{ maxWidth: 960, margin: "0 auto", padding: "32px 24px" }}>
        <form id="form-novo-evento" onSubmit={handleSubmit}>
          <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 600 }}>
            <h2 style={{ fontFamily: '"Archivo", sans-serif', fontWeight: 700, fontSize: 22, margin: 0 }}>Informações gerais</h2>

            <Field label="Nome do evento" htmlFor="ev-name" error={fieldErrors["name"]}>
              <input
                id="ev-name"
                required
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                style={inp}
              />
            </Field>

            <Field label="Slug (URL)" htmlFor="ev-slug" error={fieldErrors["slug"]}>
              <input
                id="ev-slug"
                required
                value={slug}
                onChange={(e) => handleSlugChange(e.target.value)}
                style={inp}
              />
              <p style={{ fontSize: 12, color: "hsl(var(--muted-foreground))", margin: "4px 0 0" }}>
                voz.app/e/{slug || "slug-do-evento"}
              </p>
            </Field>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <Field label="Início" htmlFor="ev-start" error={fieldErrors["startsAt"]}>
                <input
                  id="ev-start"
                  type="datetime-local"
                  required
                  value={startsAt}
                  onChange={(e) => setStartsAt(e.target.value)}
                  style={inp}
                />
              </Field>
              <Field label="Término" htmlFor="ev-end" error={fieldErrors["endsAt"]}>
                <input
                  id="ev-end"
                  type="datetime-local"
                  required
                  value={endsAt}
                  onChange={(e) => setEndsAt(e.target.value)}
                  style={inp}
                />
              </Field>
            </div>

            <Field label="Local" htmlFor="ev-place" error={fieldErrors["place"]}>
              <input
                id="ev-place"
                required
                value={place}
                onChange={(e) => setPlace(e.target.value)}
                style={inp}
              />
            </Field>

            <Field label="Endereço completo" htmlFor="ev-address" error={fieldErrors["address"]}>
              <input
                id="ev-address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                style={inp}
              />
            </Field>
          </div>
        </form>
      </main>
    </div>
  );
}

function Field({ label, htmlFor, children, error }: { label: string; htmlFor: string; children: React.ReactNode; error?: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label htmlFor={htmlFor} style={{ fontSize: 14, fontWeight: 500 }}>{label}</label>
      {children}
      {error && <p style={{ fontSize: 12, color: "hsl(var(--destructive))", margin: "2px 0 0" }}>{error}</p>}
    </div>
  );
}
