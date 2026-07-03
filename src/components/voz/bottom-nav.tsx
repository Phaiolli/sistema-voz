/**
 * Bottom navigation bar for mobile-first navigation.
 *
 * Fixed navigation shown on mobile (<= 639px). The visible items are
 * role-aware so each user only sees destinations their role can actually reach:
 * - owner: Painel (/dashboard) + Minha conta
 * - mediador: Moderador (/mediador) + Minha conta
 * - admin: Eventos + Usuários + Minha conta
 * - superadmin: Plataforma + Eventos + Usuários + Minha conta
 *
 * Responsively hides on larger screens.
 */
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAppUser } from "@/lib/use-app-user";
import { Calendar, LayoutDashboard, Mic, Shield, User } from "lucide-react";

/**
 * @internal Individual navigation item component.
 */
function NavItem({ href, icon, label, active }: { href: string; icon: React.ReactNode; label: string; active?: boolean }) {
  return (
    <Link
      href={href}
      className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-1 px-1 text-[11px] no-underline ${active ? "font-semibold" : "font-medium"}`}
      style={{
        color: active ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))",
      }}
      aria-current={active ? "page" : undefined}
    >
      {icon}
      <span className="overflow-hidden text-ellipsis whitespace-nowrap max-w-full">{label}</span>
    </Link>
  );
}

/**
 * @internal Users/people icon (custom SVG).
 */
function UsersIcon() {
  return (
    <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

/** Navigation entries available per role, in display order. */
type NavEntry = { href: string; icon: React.ReactNode; label: string };

const ACCOUNT_ENTRY: NavEntry = {
  href: "/conta",
  icon: <User size={22} aria-hidden />,
  label: "Minha conta",
};

/**
 * Returns the navigation entries a given role is allowed to reach. Returns an
 * empty list for unknown/absent roles so no unreachable link is rendered.
 *
 * @internal
 */
function entriesForRole(role: string | undefined): NavEntry[] {
  const eventos: NavEntry = {
    href: "/admin/eventos",
    icon: <Calendar size={22} aria-hidden />,
    label: "Eventos",
  };
  const usuarios: NavEntry = {
    href: "/admin/usuarios",
    icon: <UsersIcon />,
    label: "Usuários",
  };

  switch (role) {
    case "owner":
      return [
        { href: "/dashboard", icon: <LayoutDashboard size={22} aria-hidden />, label: "Painel" },
        ACCOUNT_ENTRY,
      ];
    case "mediador":
      return [
        { href: "/mediador", icon: <Mic size={22} aria-hidden />, label: "Moderador" },
        ACCOUNT_ENTRY,
      ];
    case "admin":
      return [eventos, usuarios, ACCOUNT_ENTRY];
    case "superadmin":
      return [
        { href: "/plataforma", icon: <Shield size={22} aria-hidden />, label: "Plataforma" },
        eventos,
        usuarios,
        ACCOUNT_ENTRY,
      ];
    default:
      return [];
  }
}

/**
 * Renders the bottom navigation bar with role-aware links.
 *
 * Visible only on mobile (<= 639px). Each role sees only the destinations it can
 * reach (see {@link entriesForRole}). Renders nothing for roles with no entries.
 *
 * @returns Fixed bottom navigation bar, or null when there are no entries
 */
export function BottomNav() {
  const pathname = usePathname();
  const { role } = useAppUser();
  const entries = entriesForRole(role);

  if (entries.length === 0) return null;

  return (
    <>
      <nav
        className="app-bottom-nav fixed inset-x-0 bottom-0 z-30 flex h-[68px] border-t border-border bg-background"
        aria-label="Navegação principal"
      >
        {entries.map((entry) => (
          <NavItem
            key={entry.href}
            href={entry.href}
            icon={entry.icon}
            label={entry.label}
            active={pathname.startsWith(entry.href)}
          />
        ))}
      </nav>
      <style>{`
        .app-bottom-nav { display: none; }
        @media (max-width: 639px) { .app-bottom-nav { display: flex; } }
      `}</style>
    </>
  );
}
