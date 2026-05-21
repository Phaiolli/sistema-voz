import type { ReactNode } from "react"
import { AdminThemeProvider } from "@/components/voz/admin-theme-provider"
import { ThemeToggle } from "@/components/voz/theme-toggle"
import { Toaster } from "@/components/ui/sonner"

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <AdminThemeProvider>
      <div className="fixed top-3 right-3 z-50 rounded-lg border border-border/40 bg-background/80 shadow-sm backdrop-blur-sm">
        <ThemeToggle />
      </div>
      {children}
      <Toaster position="bottom-center" />
    </AdminThemeProvider>
  )
}
