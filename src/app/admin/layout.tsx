import type { ReactNode } from "react"
import { SessionProvider } from "next-auth/react"
import { AdminThemeProvider } from "@/components/voz/admin-theme-provider"
import { BottomNav } from "@/components/voz/bottom-nav"
import { Toaster } from "@/components/ui/sonner"

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <AdminThemeProvider>
        {children}
        <BottomNav />
        <Toaster position="bottom-center" />
      </AdminThemeProvider>
    </SessionProvider>
  )
}
