"use client"

import { signOut, useSession } from "next-auth/react"
import { LogOut } from "lucide-react"
import { ThemeToggle } from "@/components/voz/theme-toggle"

function initials(name: string | null | undefined, email: string | null | undefined): string {
  if (name) {
    return name.split(" ").map((w) => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
  }
  return email?.[0]?.toUpperCase() ?? "?";
}

export function HeaderControls() {
  const { data: session } = useSession();
  const u = session?.user as { name?: string | null; email?: string | null } | undefined;
  const name = u?.name ?? null;
  const email = u?.email ?? null;
  const abbr = initials(name, email);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      {email && (
        <div className="hc-user" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            aria-hidden
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              background: "hsl(var(--primary))",
              color: "hsl(var(--primary-foreground))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 12,
              fontWeight: 700,
              flexShrink: 0,
              userSelect: "none",
            }}
          >
            {abbr}
          </div>
          <div className="hc-name" style={{ display: "flex", flexDirection: "column", lineHeight: 1.2 }}>
            {name && <span style={{ fontSize: 13, fontWeight: 600, color: "hsl(var(--foreground))", whiteSpace: "nowrap", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis" }}>{name}</span>}
            <span style={{ fontSize: 11, color: "hsl(var(--muted-foreground))", whiteSpace: "nowrap", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis" }}>{email}</span>
          </div>
        </div>
      )}
      <button
        onClick={() => signOut({ callbackUrl: "/entrar" })}
        aria-label="Sair da conta"
        title="Sair"
        style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, height: 44, padding: "0 12px", borderRadius: 8, border: "1px solid hsl(var(--border))", background: "transparent", fontSize: 13, cursor: "pointer", color: "hsl(var(--foreground))", flexShrink: 0 }}
      >
        <LogOut size={15} aria-hidden />
        <span className="hc-logout-label">Sair</span>
      </button>
      <ThemeToggle />
      <style>{`
        .hc-name { display: flex; }
        .hc-user { max-width: 220px; }
        @media (max-width: 639px) {
          .hc-name { display: none; }
          .hc-logout-label { display: none; }
          .hc-user { max-width: unset; }
        }
      `}</style>
    </div>
  )
}
