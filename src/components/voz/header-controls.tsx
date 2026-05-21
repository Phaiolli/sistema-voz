"use client"

import { useState, useEffect } from "react"
import { signOut, getSession } from "next-auth/react"
import { LogOut, UserCircle } from "lucide-react"
import { ThemeToggle } from "@/components/voz/theme-toggle"

export function HeaderControls() {
  const [email, setEmail] = useState<string | null>(null)

  useEffect(() => {
    getSession().then((s) => setEmail(s?.user?.email ?? null))
  }, [])

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      {email && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 10px", borderRadius: 8, background: "hsl(var(--muted))", border: "1px solid hsl(var(--border))", fontSize: 13, color: "hsl(var(--muted-foreground))", maxWidth: 200 }}>
          <UserCircle size={14} style={{ flexShrink: 0 }} aria-hidden />
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{email}</span>
        </div>
      )}
      <button
        onClick={() => signOut({ callbackUrl: "/entrar" })}
        aria-label="Sair da conta"
        title="Sair"
        style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 36, padding: "0 12px", borderRadius: 8, border: "1px solid hsl(var(--border))", background: "transparent", fontSize: 13, cursor: "pointer", color: "hsl(var(--foreground))" }}
      >
        <LogOut size={14} aria-hidden />
        Sair
      </button>
      <ThemeToggle />
    </div>
  )
}
