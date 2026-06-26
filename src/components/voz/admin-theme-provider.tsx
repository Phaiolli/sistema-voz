/**
 * Scoped dark/light theme provider for admin and mediador layouts.
 *
 * Manages theme state separately from the public event pages theme.
 * Persists preference in localStorage with key "theme-admin".
 *
 * Used in `/admin/eventos`, `/admin/usuarios`, and `/mediador` routes.
 */
"use client"

import { createContext, useContext, useState, type ReactNode } from "react"

type Theme = "dark" | "light"

interface AdminThemeContextValue {
  theme: Theme
  toggleTheme: () => void
}

const AdminThemeContext = createContext<AdminThemeContextValue>({
  theme: "dark",
  toggleTheme: () => {},
})

/**
 * Hook to access the admin theme context (current theme + toggle function).
 *
 * @returns Theme context value (theme and toggleTheme function)
 * @throws If used outside AdminThemeProvider
 *
 * @example
 * const { theme, toggleTheme } = useAdminTheme();
 */
export function useAdminTheme(): AdminThemeContextValue {
  return useContext(AdminThemeContext)
}

const STORAGE_KEY = "theme-admin"

/**
 * Scoped theme provider component for /admin and /mediador routes.
 *
 * Features:
 * - Defaults to dark mode
 * - Persists user preference in localStorage
 * - Applies `.dark` class to wrapper div (does NOT touch `<html>`)
 * - Prevents hydration mismatch with `suppressHydrationWarning`
 *
 * @param props - Component props
 * @param props.children - Child components to wrap
 * @returns Theme provider wrapper element
 *
 * @example
 * <AdminThemeProvider>
 *   <AdminLayout />
 * </AdminThemeProvider>
 */
export function AdminThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === "undefined") return "dark"
    const stored = localStorage.getItem(STORAGE_KEY)
    return (stored === "light" || stored === "dark") ? stored : "dark"
  })
  function toggleTheme() {
    const next: Theme = theme === "dark" ? "light" : "dark"
    setTheme(next)
    localStorage.setItem(STORAGE_KEY, next)
  }

  return (
    <AdminThemeContext.Provider value={{ theme, toggleTheme }}>
      <div
        suppressHydrationWarning
        className={`${theme === "dark" ? "dark" : ""} min-h-screen bg-background text-foreground`}
      >
        {children}
      </div>
    </AdminThemeContext.Provider>
  )
}
