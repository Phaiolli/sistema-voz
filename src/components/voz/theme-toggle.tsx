"use client"

import { Moon, Sun } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useAdminTheme } from "@/components/voz/admin-theme-provider"

interface ThemeToggleProps {
  className?: string
}

/** Discrete dark/light mode toggle for admin and mediador layouts. */
export function ThemeToggle({ className }: ThemeToggleProps) {
  const { theme, toggleTheme } = useAdminTheme()
  const isDark = theme === "dark"

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      aria-label={isDark ? "Ativar modo claro" : "Ativar modo escuro"}
      className={cn("opacity-60 hover:opacity-100", className)}
    >
      {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </Button>
  )
}
