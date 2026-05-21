"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"

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
  const [theme, setTheme] = useState<Theme>("dark")
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === "light" || stored === "dark") setTheme(stored)
    setMounted(true)
  }, [])

  function toggleTheme() {
    const next: Theme = theme === "dark" ? "light" : "dark"
    setTheme(next)
    localStorage.setItem(STORAGE_KEY, next)
  }

  // Suppress hydration mismatch: server and initial client both render "dark".
  // After mount, localStorage may override — the class update happens silently.
  return (
    <AdminThemeContext.Provider value={{ theme, toggleTheme }}>
      <div
        suppressHydrationWarning
        data-mounted={mounted}
        className={`${theme === "dark" ? "dark" : ""} min-h-screen bg-background text-foreground`}
      >
        {children}
      </div>
    </AdminThemeContext.Provider>
  )
}
