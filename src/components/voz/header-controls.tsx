/**
 * Header user menu and logout control.
 *
 * Displays authenticated user's initials, name, and email in a dropdown-like header area.
 * Provides logout button and theme toggle.
 *
 * Used in `/admin/eventos`, `/admin/usuarios`, and `/mediador` layouts.
 */
"use client"

import { signOut, useSession } from "next-auth/react"
import { LogOut } from "lucide-react"
import { ThemeToggle } from "@/components/voz/theme-toggle"

/**
 * @internal Derives user initials from name or email for avatar badge.
 */
function initials(name: string | null | undefined, email: string | null | undefined): string {
  if (name) {
    return name.split(" ").map((w) => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
  }
  return email?.[0]?.toUpperCase() ?? "?";
}

/**
 * Renders header user controls: avatar with name/email and logout button.
 *
 * Responsive: hides text on mobile, shows only avatar and logout button.
 *
 * @returns Header controls component (or null if not authenticated)
 */
export function HeaderControls() {
  const { data: session } = useSession();
  const u = session?.user as { name?: string | null; email?: string | null } | undefined;
  const name = u?.name ?? null;
  const email = u?.email ?? null;
  const abbr = initials(name, email);

  return (
    <div className="flex items-center gap-1.5">
      {email && (
        <div className="hc-user flex items-center gap-2">
          <div
            aria-hidden
            className="flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold"
          >
            {abbr}
          </div>
          <div className="hc-name flex flex-col leading-[1.2]">
            {name && <span className="overflow-hidden text-ellipsis whitespace-nowrap max-w-[160px] text-[13px] font-semibold text-foreground">{name}</span>}
            <span className="overflow-hidden text-ellipsis whitespace-nowrap max-w-[160px] text-[11px] text-muted-foreground">{email}</span>
          </div>
        </div>
      )}
      <button
        onClick={() => signOut({ callbackUrl: "/entrar" })}
        aria-label="Sair da conta"
        title="Sair"
        className="inline-flex h-11 shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-border bg-transparent px-3 text-[13px] text-foreground"
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
