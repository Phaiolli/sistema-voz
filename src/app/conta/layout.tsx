import type { ReactNode } from "react"
import { AdminThemeProvider } from "@/components/voz/admin-theme-provider"
import { BottomNav } from "@/components/voz/bottom-nav"
import { Toaster } from "@/components/ui/sonner"

export default function ContaLayout({ children }: { children: ReactNode }) {
  return (
    <AdminThemeProvider>
      {children}
      <BottomNav />
      <Toaster position="bottom-center" />
    </AdminThemeProvider>
  )
}
