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
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium">{label}</label>
      {children}
    </div>
  );
}

export function SectionBlock({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="p-5 bg-muted/40 border border-border rounded-xl">
      <div className="flex items-center justify-between mb-3.5">
        <p className="text-sm font-semibold m-0">{title}</p>
        {action}
      </div>
      {children}
    </div>
  );
}

export function ConfigToggle({ label, description, defaultChecked }: { label: string; description: string; defaultChecked?: boolean }) {
  const [checked, setChecked] = useState(defaultChecked ?? false);
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="font-medium text-[15px] mt-0 mb-0.5 mx-0">{label}</p>
        <p className="text-[13px] text-muted-foreground m-0">{description}</p>
      </div>
      <Toggle checked={checked} onToggle={() => setChecked((v) => !v)} />
    </div>
  );
}

export function Toggle({ label, description, checked, onToggle }: { label?: string; description?: string; checked: boolean; onToggle: () => void }) {
  return (
    <div className="flex items-start justify-between gap-4 w-full">
      {(label || description) && (
        <div>
          {label && <p className="font-medium text-[15px] mt-0 mb-0.5 mx-0">{label}</p>}
          {description && <p className="text-[13px] text-muted-foreground m-0">{description}</p>}
        </div>
      )}
      <button
        role="switch"
        aria-checked={checked}
        onClick={onToggle}
        className={`w-11 h-6 rounded-full border-0 cursor-pointer relative shrink-0 ${checked ? "bg-primary" : "bg-muted"}`}
      >
        <span className="absolute top-0.5 w-5 h-5 rounded-full bg-white" style={{ left: checked ? 22 : 2 }} />
      </button>
    </div>
  );
}

export function Badge({ active, label }: { active: boolean; label: string }) {
  return (
    <span
      className="rounded-full text-[11px] font-semibold"
      style={{ padding: "3px 8px", background: active ? "hsl(142 71% 45% / .12)" : "hsl(var(--muted))", color: active ? "hsl(142 71% 35%)" : "hsl(var(--muted-foreground))" }}
    >
      {label}
    </span>
  );
}
