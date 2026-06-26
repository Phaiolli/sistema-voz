/**
 * Dark/light mode toggle button for admin and mediador layouts.
 *
 * Uses the admin theme context to toggle between dark and light modes.
 * Displays sun/moon icon and adjusts opacity on hover.
 *
 * Only works inside AdminThemeProvider.
 */
"use client"

import { Moon, Sun } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useAdminTheme } from "@/components/voz/admin-theme-provider"

/**
 * Props for ThemeToggle component.
 */
interface ThemeToggleProps {
  /** Optional additional CSS classes */
  className?: string
}

/**
 * Renders a theme toggle button (sun/moon icon).
 *
 * @param props - Component props
 * @returns Icon button that toggles dark/light mode
 *
 * @example
 * <ThemeToggle className="ml-4" />  // Toggle button in header
 */
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
