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
    <div className="min-h-[100dvh] bg-background text-foreground">
      <header className="h-14 flex items-center gap-3 px-6" style={{ borderBottom: "1px solid hsl(var(--border))" }}>
        <Link
          href="/admin/eventos"
          aria-label="Voltar"
          className="flex items-center justify-center w-9 h-9 rounded-lg no-underline text-foreground"
          style={{ border: "1px solid hsl(var(--border))" }}
        >
          <ArrowLeft size={16} aria-hidden />
        </Link>
        <VozWordmark size={20} />
        <div className="flex-1" />
        <span className="text-[13px] text-muted-foreground">Novo evento</span>
        <button
          form="form-novo-evento"
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg border-0 bg-primary text-primary-foreground text-[13px] font-semibold"
          style={{ cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}
        >
          <Save size={14} aria-hidden /> {saving ? "Criando…" : "Criar evento"}
        </button>
      </header>

      <main className="max-w-[960px] mx-auto px-6 py-8">
        <form id="form-novo-evento" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-5 max-w-[600px]">
            <h2 className="font-bold text-[22px] m-0" style={{ fontFamily: '"Archivo", sans-serif' }}>Informações gerais</h2>

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
              <p className="text-xs text-muted-foreground" style={{ margin: "4px 0 0" }}>
                voz.app/e/{slug || "slug-do-evento"}
              </p>
            </Field>

            <div className="grid gap-4" style={{ gridTemplateColumns: "1fr 1fr" }}>
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
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium">{label}</label>
      {children}
      {error && <p className="text-xs text-destructive" style={{ margin: "2px 0 0" }}>{error}</p>}
    </div>
  );
}
