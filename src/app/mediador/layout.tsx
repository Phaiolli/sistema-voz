import type { ReactNode } from "react"
import { AdminThemeProvider } from "@/components/voz/admin-theme-provider"
import { ThemeToggle } from "@/components/voz/theme-toggle"
import { Toaster } from "@/components/ui/sonner"

export default function MediadorLayout({ children }: { children: ReactNode }) {
  return (
    <AdminThemeProvider>
      <div className="relative">
        <div className="absolute top-3 right-3 z-50">
          <ThemeToggle />
        </div>
        {children}
      </div>
      <Toaster position="bottom-center" />
    </AdminThemeProvider>
  )
}
