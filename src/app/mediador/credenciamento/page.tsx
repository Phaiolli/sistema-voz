"use client";

import { useState, useEffect, useMemo } from "react";
import { VozLockup } from "@/components/voz/wordmark";
import { HeaderControls } from "@/components/voz/header-controls";
import { toast } from "sonner";
import { Search, CheckCircle2, Package, Trophy } from "lucide-react";
import type { Registration } from "@/lib/types";

interface Assignment {
  eventId: string;
  event: { id: string; slug: string; name: string };
  assignedAt: string;
}

interface AssignmentsResponse {
  events?: { id: string; slug: string; name: string }[];
}

type CredTab = "credenciamento" | "sorteio";

// ─── Sorteio ────────────────────────────────────────────────────────────────

function SorteioTab({ eventId }: { eventId: string }) {
  const [phase, setPhase] = useState<"idle" | "counting" | "winner">("idle");
  const [countdown, setCountdown] = useState(5);
  const [winner, setWinner] = useState<{ id: string; name: string } | null>(null);
  const [remainingCount, setRemainingCount] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleDraw() {
    if (busy) return;
    setBusy(true);
    setPhase("counting");
    setCountdown(5);
    setWinner(null);

    let tick = 5;
    const interval = setInterval(() => {
      tick -= 1;
      setCountdown(tick);
      if (tick <= 0) clearInterval(interval);
    }, 1000);

    await new Promise((r) => setTimeout(r, 5000));
    clearInterval(interval);

    try {
      const res = await fetch(`/api/v1/events/${eventId}/draw`, { method: "POST" });
      const data = await res.json() as { winner?: { id: string; name: string }; remainingCount?: number; error?: { message?: string; code?: string } };
      if (!res.ok) {
        if (data.error?.code === "NO_ELIGIBLE") {
          toast.info("Todos os inscritos com check-in já foram sorteados.");
        } else {
          toast.error(data.error?.message ?? "Erro ao sortear.");
        }
        setPhase("idle");
        return;
      }
      setWinner(data.winner ?? null);
      setRemainingCount(data.remainingCount ?? null);
      setPhase("winner");
    } catch {
      toast.error("Erro de conexão.");
      setPhase("idle");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", gap: 32, padding: "40px 24px" }}>
      {phase === "idle" && (
        <>
          <div style={{ textAlign: "center" }}>
            <p style={{ fontFamily: '"Archivo", sans-serif', fontWeight: 700, fontSize: 24, margin: "0 0 8px" }}>Sorteio</p>
            <p style={{ fontSize: 14, color: "hsl(var(--muted-foreground))", margin: 0 }}>Apenas inscritos com check-in participam do sorteio.</p>
          </div>
          <button
            onClick={handleDraw}
            style={{ display: "inline-flex", alignItems: "center", gap: 10, height: 64, padding: "0 40px", borderRadius: 16, border: "none", background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))", fontSize: 20, fontWeight: 700, cursor: "pointer" }}
          >
            <Trophy size={22} aria-hidden /> Sortear
          </button>
        </>
      )}

      {phase === "counting" && (
        <div style={{ textAlign: "center" }}>
          <p style={{ fontFamily: '"Archivo Black", sans-serif', fontSize: 96, margin: 0, lineHeight: 1, color: "hsl(var(--primary))", animationName: "pulse", animationDuration: "1s", animationIterationCount: "infinite" }}>
            {countdown}
          </p>
          <p style={{ fontSize: 16, color: "hsl(var(--muted-foreground))", margin: "16px 0 0" }}>Sorteando…</p>
        </div>
      )}

      {phase === "winner" && winner && (
        <div style={{ textAlign: "center" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "hsl(142 71% 40%)", marginBottom: 16 }}>
            <Trophy size={28} />
            <span style={{ fontSize: 18, fontWeight: 600 }}>Sorteado!</span>
          </div>
          <p style={{ fontFamily: '"Archivo Black", sans-serif', fontSize: 48, margin: "0 0 8px", lineHeight: 1.1 }}>{winner.name}</p>
          {remainingCount !== null && (
            <p style={{ fontSize: 13, color: "hsl(var(--muted-foreground))", margin: "0 0 32px" }}>
              {remainingCount} {remainingCount === 1 ? "inscrito restante" : "inscritos restantes"} para sortear
            </p>
          )}
          <button
            onClick={() => { setPhase("idle"); setWinner(null); }}
            style={{ height: 44, padding: "0 24px", borderRadius: 10, border: "1px solid hsl(var(--border))", background: "transparent", fontSize: 14, cursor: "pointer" }}
          >
            Novo sorteio
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Credenciamento List ─────────────────────────────────────────────────────

function CredenciamentoTab({ eventId }: { eventId: string }) {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch(`/api/v1/events/${eventId}/registrations`)
      .then((r) => r.json() as Promise<{ registrations: Registration[] }>)
      .then((d) => setRegistrations(d.registrations ?? []))
      .catch(() => toast.error("Erro ao carregar inscritos."))
      .finally(() => setLoading(false));
  }, [eventId]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return registrations;
    return registrations.filter((r) =>
      r.name.toLowerCase().includes(q) ||
      r.email.toLowerCase().includes(q) ||
      (r.document ?? "").toLowerCase().includes(q)
    );
  }, [registrations, search]);

  async function toggle(reg: Registration, field: "checkedIn" | "kitDelivered") {
    const newVal = !reg[field];
    setRegistrations((prev) => prev.map((r) => r.id === reg.id ? { ...r, [field]: newVal } : r));
    try {
      const res = await fetch(`/api/v1/events/${eventId}/registrations/${reg.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: newVal }),
      });
      if (!res.ok) throw new Error("Falha");
      toast.success(field === "checkedIn" ? (newVal ? "Check-in registrado." : "Check-in removido.") : (newVal ? "Kit entregue registrado." : "Kit removido."));
    } catch {
      setRegistrations((prev) => prev.map((r) => r.id === reg.id ? { ...r, [field]: !newVal } : r));
      toast.error("Erro ao atualizar.");
    }
  }

  const checkedInCount = registrations.filter((r) => r.checkedIn).length;
  const kitCount = registrations.filter((r) => r.kitDelivered).length;

  return (
    <div style={{ padding: "24px" }}>
      <div style={{ display: "flex", gap: 16, marginBottom: 20, flexWrap: "wrap" }}>
        <Stat label="Total inscritos" value={registrations.length} />
        <Stat label="Check-in feito" value={checkedInCount} accent />
        <Stat label="Kit entregue" value={kitCount} />
      </div>

      <div style={{ position: "relative", marginBottom: 16 }}>
        <Search size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "hsl(var(--muted-foreground))", pointerEvents: "none" }} />
        <input
          type="search"
          placeholder="Buscar por nome, e-mail ou CPF…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: "100%", height: 40, padding: "0 14px 0 36px", borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--muted))", color: "hsl(var(--foreground))", fontSize: 14, fontFamily: "inherit", boxSizing: "border-box" }}
        />
      </div>

      {loading && <div style={{ padding: 40, textAlign: "center", color: "hsl(var(--muted-foreground))" }}>Carregando inscritos…</div>}

      {!loading && filtered.length === 0 && (
        <div style={{ padding: 40, textAlign: "center", color: "hsl(var(--muted-foreground))" }}>
          {search ? "Nenhum resultado para a busca." : "Nenhum inscrito ainda."}
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtered.map((reg) => (
            <div key={reg.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", background: "hsl(var(--muted))", borderRadius: 10, border: "1px solid hsl(var(--border))" }}>
              <div style={{ width: 40, height: 40, borderRadius: "50%", background: "hsl(var(--primary) / .12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
                {reg.name.trim().split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontWeight: 600, fontSize: 14, margin: "0 0 2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{reg.name}</p>
                <p style={{ fontSize: 12, color: "hsl(var(--muted-foreground))", margin: 0 }}>{reg.email}{reg.document ? ` · ${reg.document}` : ""}</p>
              </div>
              <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                <ToggleBtn
                  active={reg.checkedIn}
                  icon={<CheckCircle2 size={14} />}
                  label={reg.checkedIn ? "Check-in ✓" : "Check-in"}
                  onClick={() => toggle(reg, "checkedIn")}
                />
                <ToggleBtn
                  active={reg.kitDelivered}
                  icon={<Package size={14} />}
                  label={reg.kitDelivered ? "Kit ✓" : "Kit"}
                  onClick={() => toggle(reg, "kitDelivered")}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div style={{ padding: "12px 16px", borderRadius: 10, background: "hsl(var(--muted))", border: "1px solid hsl(var(--border))", minWidth: 100 }}>
      <p style={{ fontSize: 22, fontWeight: 700, margin: "0 0 2px", color: accent ? "hsl(142 71% 40%)" : "hsl(var(--foreground))" }}>{value}</p>
      <p style={{ fontSize: 12, color: "hsl(var(--muted-foreground))", margin: 0 }}>{label}</p>
    </div>
  );
}

function ToggleBtn({ active, icon, label, onClick }: { active: boolean; icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{ display: "inline-flex", alignItems: "center", gap: 5, height: 32, padding: "0 10px", borderRadius: 7, border: "1px solid hsl(var(--border))", fontSize: 12, fontWeight: 500, cursor: "pointer", background: active ? "hsl(142 71% 45% / .12)" : "transparent", color: active ? "hsl(142 71% 35%)" : "hsl(var(--foreground))" }}
    >
      {icon} {label}
    </button>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function CredenciamentoPage() {
  const [eventId, setEventId] = useState<string | null>(null);
  const [eventName, setEventName] = useState("");
  const [tab, setTab] = useState<CredTab>("credenciamento");

  useEffect(() => {
    fetch("/api/v1/me/assignments")
      .then((r) => r.json() as Promise<AssignmentsResponse>)
      .then((d) => {
        const first = d.events?.[0];
        if (first) { setEventId(first.id); setEventName(first.name); }
      })
      .catch(() => toast.error("Erro ao carregar evento."));
  }, []);

  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: "12px 18px", border: "none", cursor: "pointer", fontSize: 14, fontWeight: 500,
    background: "transparent", color: active ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))",
    borderBottom: active ? "2px solid hsl(var(--primary))" : "2px solid transparent",
  });

  return (
    <div style={{ minHeight: "100dvh", background: "hsl(var(--background))", color: "hsl(var(--foreground))" }}>
      <header style={{ height: 56, borderBottom: "1px solid hsl(var(--border))", display: "flex", alignItems: "center", padding: "0 24px", gap: 16 }}>
        <VozLockup eventName={eventName || "Credenciamento"} size={20} />
        <div style={{ flex: 1 }} />
        <HeaderControls />
      </header>

      <div style={{ borderBottom: "1px solid hsl(var(--border))", padding: "0 24px", display: "flex", gap: 2 }} role="tablist">
        <button role="tab" aria-selected={tab === "credenciamento"} onClick={() => setTab("credenciamento")} style={tabStyle(tab === "credenciamento")}>
          Credenciamento
        </button>
        <button role="tab" aria-selected={tab === "sorteio"} onClick={() => setTab("sorteio")} style={tabStyle(tab === "sorteio")}>
          Sorteio
        </button>
      </div>

      <main style={{ maxWidth: 800, margin: "0 auto" }} role="tabpanel">
        {!eventId && (
          <div style={{ padding: 48, textAlign: "center", color: "hsl(var(--muted-foreground))" }}>Carregando evento…</div>
        )}
        {eventId && tab === "credenciamento" && <CredenciamentoTab eventId={eventId} />}
        {eventId && tab === "sorteio" && <SorteioTab eventId={eventId} />}
      </main>
    </div>
  );
}
