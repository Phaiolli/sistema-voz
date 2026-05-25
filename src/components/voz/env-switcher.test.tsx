// @vitest-environment jsdom
/// <reference types="vitest/globals" />
import { render, screen } from "@testing-library/react"
import { vi, describe, it, expect, beforeEach } from "vitest"

// Mock next-auth
vi.mock("next-auth/react", () => ({
  useSession: vi.fn(),
}))

// Mock next/link
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode; [k: string]: unknown }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}))

import { useSession } from "next-auth/react"
import { EnvSwitcher } from "./env-switcher"

const mockUseSession = useSession as ReturnType<typeof vi.fn>

describe("EnvSwitcher", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders null when session has no user", () => {
    mockUseSession.mockReturnValue({ data: null })
    const { container } = render(<EnvSwitcher active="admin" />)
    expect(container.firstChild).toBeNull()
  })

  it("renders null for mediador role", () => {
    mockUseSession.mockReturnValue({ data: { user: { role: "mediador" } } })
    const { container } = render(<EnvSwitcher active="admin" />)
    expect(container.firstChild).toBeNull()
  })

  it("renders for admin role", () => {
    mockUseSession.mockReturnValue({ data: { user: { role: "admin" } } })
    render(<EnvSwitcher active="admin" />)
    expect(screen.getByRole("tablist")).toBeTruthy()
    expect(screen.getByText("Admin")).toBeTruthy()
    expect(screen.getByText("Moderador")).toBeTruthy()
  })

  it("renders for superadmin role", () => {
    mockUseSession.mockReturnValue({ data: { user: { role: "superadmin" } } })
    render(<EnvSwitcher active="mediador" />)
    expect(screen.getByRole("tablist")).toBeTruthy()
  })

  it("marks Admin tab as selected when active=admin", () => {
    mockUseSession.mockReturnValue({ data: { user: { role: "admin" } } })
    render(<EnvSwitcher active="admin" />)
    const adminTab = screen.getByText("Admin").closest("[role='tab']")
    expect(adminTab?.getAttribute("aria-selected")).toBe("true")
    const modTab = screen.getByText("Moderador").closest("[role='tab']")
    expect(modTab?.getAttribute("aria-selected")).toBe("false")
  })

  it("marks Moderador tab as selected when active=mediador", () => {
    mockUseSession.mockReturnValue({ data: { user: { role: "admin" } } })
    render(<EnvSwitcher active="mediador" />)
    const modTab = screen.getByText("Moderador").closest("[role='tab']")
    expect(modTab?.getAttribute("aria-selected")).toBe("true")
    const adminTab = screen.getByText("Admin").closest("[role='tab']")
    expect(adminTab?.getAttribute("aria-selected")).toBe("false")
  })

  it("Admin tab links to /admin/eventos", () => {
    mockUseSession.mockReturnValue({ data: { user: { role: "admin" } } })
    render(<EnvSwitcher active="admin" />)
    const adminLink = screen.getByText("Admin").closest("a")
    expect(adminLink?.getAttribute("href")).toBe("/admin/eventos")
  })

  it("Moderador tab links to /mediador", () => {
    mockUseSession.mockReturnValue({ data: { user: { role: "admin" } } })
    render(<EnvSwitcher active="admin" />)
    const modLink = screen.getByText("Moderador").closest("a")
    expect(modLink?.getAttribute("href")).toBe("/mediador")
  })
})
