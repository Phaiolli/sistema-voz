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

/** Returns the current admin theme and a toggle function. Must be used inside AdminThemeProvider. */
export function useAdminTheme(): AdminThemeContextValue {
  return useContext(AdminThemeContext)
}

const STORAGE_KEY = "theme-admin"

/**
 * Scoped theme provider for /admin and /mediador routes.
 * Defaults to dark mode; persists preference in localStorage.
 * Applies `.dark` class to a wrapper div — does NOT touch `<html>`.
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
