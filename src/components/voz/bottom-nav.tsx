"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { Calendar, Mic, User } from "lucide-react";

function NavItem({ href, icon, label, active }: { href: string; icon: React.ReactNode; label: string; active?: boolean }) {
  return (
    <Link
      href={href}
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 3,
        textDecoration: "none",
        color: active ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))",
        fontSize: 11,
        fontWeight: active ? 600 : 500,
        minWidth: 0,
        padding: "0 4px",
      }}
      aria-current={active ? "page" : undefined}
    >
      {icon}
      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "100%" }}>{label}</span>
    </Link>
  );
}

function UsersIcon() {
  return (
    <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const role = (session?.user as { role?: string } | undefined)?.role;
  const isAdmin = role === "admin" || role === "superadmin";

  const isEventos = pathname.startsWith("/admin/eventos");
  const isUsuarios = pathname.startsWith("/admin/usuarios");
  const isModerador = pathname.startsWith("/mediador");
  const isConta = pathname.startsWith("/conta");

  return (
    <>
      <nav
        className="app-bottom-nav"
        aria-label="Navegação principal"
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          height: 68,
          background: "hsl(var(--background))",
          borderTop: "1px solid hsl(var(--border))",
          display: "flex",
          zIndex: 30,
        }}
      >
        {isAdmin && (
          <>
            <NavItem href="/admin/eventos" icon={<Calendar size={22} aria-hidden />} label="Eventos" active={isEventos} />
            <NavItem href="/admin/usuarios" icon={<UsersIcon />} label="Usuários" active={isUsuarios} />
          </>
        )}
        <NavItem href="/mediador" icon={<Mic size={22} aria-hidden />} label="Moderador" active={isModerador} />
        <NavItem href="/conta" icon={<User size={22} aria-hidden />} label="Minha conta" active={isConta} />
      </nav>
      <style>{`
        .app-bottom-nav { display: none; }
        @media (max-width: 639px) { .app-bottom-nav { display: flex; } }
      `}</style>
    </>
  );
}
