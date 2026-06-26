import { useState } from "react";
import type { UserRole } from "@/lib/types";

export type Tab = "geral" | "sobre" | "identidade" | "mediadores" | "participantes" | "qrcode" | "configuracoes" | "inscricoes" | "sorteio";

export interface UserPublic {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: string;
  lastSeenAt: string | null;
}

export const inp: React.CSSProperties = {
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

export const smInp: React.CSSProperties = { ...inp, fontSize: 14, padding: "8px 12px" };

export function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label htmlFor={htmlFor} style={{ fontSize: 14, fontWeight: 500 }}>{label}</label>
      {children}
    </div>
  );
}

export function SectionBlock({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div style={{ padding: 20, background: "hsl(var(--muted) / .4)", border: "1px solid hsl(var(--border))", borderRadius: 12 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <p style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>{title}</p>
        {action}
      </div>
      {children}
    </div>
  );
}

export function ConfigToggle({ label, description, defaultChecked }: { label: string; description: string; defaultChecked?: boolean }) {
  const [checked, setChecked] = useState(defaultChecked ?? false);
  return (
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
      <div>
        <p style={{ fontWeight: 500, fontSize: 15, margin: "0 0 2px" }}>{label}</p>
        <p style={{ fontSize: 13, color: "hsl(var(--muted-foreground))", margin: 0 }}>{description}</p>
      </div>
      <Toggle checked={checked} onToggle={() => setChecked((v) => !v)} />
    </div>
  );
}

export function Toggle({ label, description, checked, onToggle }: { label?: string; description?: string; checked: boolean; onToggle: () => void }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, width: "100%" }}>
      {(label || description) && (
        <div>
          {label && <p style={{ fontWeight: 500, fontSize: 15, margin: "0 0 2px" }}>{label}</p>}
          {description && <p style={{ fontSize: 13, color: "hsl(var(--muted-foreground))", margin: 0 }}>{description}</p>}
        </div>
      )}
      <button
        role="switch"
        aria-checked={checked}
        onClick={onToggle}
        style={{ width: 44, height: 24, borderRadius: 999, border: "none", cursor: "pointer", position: "relative", flexShrink: 0, background: checked ? "hsl(var(--primary))" : "hsl(var(--muted))" }}
      >
        <span style={{ position: "absolute", top: 2, left: checked ? 22 : 2, width: 20, height: 20, borderRadius: "50%", background: "#fff" }} />
      </button>
    </div>
  );
}

export function Badge({ active, label }: { active: boolean; label: string }) {
  return (
    <span style={{ padding: "3px 8px", borderRadius: 999, fontSize: 11, fontWeight: 600, background: active ? "hsl(142 71% 45% / .12)" : "hsl(var(--muted))", color: active ? "hsl(142 71% 35%)" : "hsl(var(--muted-foreground))" }}>
      {label}
    </span>
  );
}
