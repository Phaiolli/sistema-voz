/**
 * Environment switcher for admin/superadmin users.
 *
 * Allows quick navigation between `/admin/eventos` and `/mediador` environments.
 * Only visible to users with admin or superadmin roles.
 *
 * Styled as a segmented control (tabs).
 */
"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";

/**
 * Props for EnvSwitcher component.
 */
interface EnvSwitcherProps {
  /** Currently active environment */
  active: "admin" | "mediador";
}

/**
 * Renders environment switcher (admin/mediador tabs).
 *
 * @param props - Component props
 * @returns Tabbed switcher element or null if user is not admin
 *
 * @example
 * <EnvSwitcher active="admin" />  // Shows admin/mediador tabs, admin is highlighted
 */
export function EnvSwitcher({ active }: EnvSwitcherProps) {
  const { data: session } = useSession();
  const role = session?.user?.role;

  if (role !== "admin" && role !== "superadmin") return null;

  return (
    <div
      role="tablist"
      aria-label="Alternar ambiente"
      style={{
        display: "inline-flex",
        background: "hsl(var(--muted))",
        border: "1px solid hsl(var(--border))",
        borderRadius: 9,
        padding: 3,
        gap: 2,
        flexShrink: 0,
      }}
    >
      <Link
        role="tab"
        aria-selected={active === "admin"}
        href="/admin/eventos"
        style={{
          padding: "5px 14px",
          borderRadius: 7,
          fontSize: 13,
          fontWeight: 600,
          textDecoration: "none",
          background: active === "admin" ? "hsl(var(--background))" : "transparent",
          color: active === "admin" ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))",
          boxShadow: active === "admin" ? "0 1px 3px rgba(0,0,0,.1)" : "none",
        }}
      >
        Admin
      </Link>
      <Link
        role="tab"
        aria-selected={active === "mediador"}
        href="/mediador"
        style={{
          padding: "5px 14px",
          borderRadius: 7,
          fontSize: 13,
          fontWeight: 600,
          textDecoration: "none",
          background: active === "mediador" ? "hsl(var(--background))" : "transparent",
          color: active === "mediador" ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))",
          boxShadow: active === "mediador" ? "0 1px 3px rgba(0,0,0,.1)" : "none",
        }}
      >
        Moderador
      </Link>
    </div>
  );
}
