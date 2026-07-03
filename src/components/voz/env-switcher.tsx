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
import { useAppUser } from "@/lib/use-app-user";

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
  const { role } = useAppUser();

  if (role !== "admin" && role !== "superadmin") return null;

  return (
    <div
      role="tablist"
      aria-label="Alternar ambiente"
      className="inline-flex shrink-0 gap-0.5 rounded-[9px] border border-border bg-muted p-0.5"
    >
      <Link
        role="tab"
        aria-selected={active === "admin"}
        href="/admin/eventos"
        className="rounded-md px-3.5 py-1 text-[13px] font-semibold no-underline"
        style={{
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
        className="rounded-md px-3.5 py-1 text-[13px] font-semibold no-underline"
        style={{
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
