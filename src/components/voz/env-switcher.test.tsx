// @vitest-environment jsdom
/// <reference types="vitest/globals" />
import { render, screen } from "@testing-library/react"
import { vi, describe, it, expect, beforeEach } from "vitest"

// Mock the Clerk-backed user hook
vi.mock("@/lib/use-app-user", () => ({
  useAppUser: vi.fn(),
}))

// Mock next/link
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode; [k: string]: unknown }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}))

import { useAppUser } from "@/lib/use-app-user"
import { EnvSwitcher } from "./env-switcher"

const mockUseAppUser = useAppUser as ReturnType<typeof vi.fn>

describe("EnvSwitcher", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders null when there is no user", () => {
    mockUseAppUser.mockReturnValue({ role: undefined })
    const { container } = render(<EnvSwitcher active="admin" />)
    expect(container.firstChild).toBeNull()
  })

  it("renders null for mediador role", () => {
    mockUseAppUser.mockReturnValue({ role: "mediador" })
    const { container } = render(<EnvSwitcher active="admin" />)
    expect(container.firstChild).toBeNull()
  })

  it("renders for admin role", () => {
    mockUseAppUser.mockReturnValue({ role: "admin" })
    render(<EnvSwitcher active="admin" />)
    expect(screen.getByRole("tablist")).toBeTruthy()
    expect(screen.getByText("Admin")).toBeTruthy()
    expect(screen.getByText("Moderador")).toBeTruthy()
  })

  it("renders for superadmin role", () => {
    mockUseAppUser.mockReturnValue({ role: "superadmin" })
    render(<EnvSwitcher active="mediador" />)
    expect(screen.getByRole("tablist")).toBeTruthy()
  })

  it("marks Admin tab as selected when active=admin", () => {
    mockUseAppUser.mockReturnValue({ role: "admin" })
    render(<EnvSwitcher active="admin" />)
    const adminTab = screen.getByText("Admin").closest("[role='tab']")
    expect(adminTab?.getAttribute("aria-selected")).toBe("true")
    const modTab = screen.getByText("Moderador").closest("[role='tab']")
    expect(modTab?.getAttribute("aria-selected")).toBe("false")
  })

  it("marks Moderador tab as selected when active=mediador", () => {
    mockUseAppUser.mockReturnValue({ role: "admin" })
    render(<EnvSwitcher active="mediador" />)
    const modTab = screen.getByText("Moderador").closest("[role='tab']")
    expect(modTab?.getAttribute("aria-selected")).toBe("true")
    const adminTab = screen.getByText("Admin").closest("[role='tab']")
    expect(adminTab?.getAttribute("aria-selected")).toBe("false")
  })

  it("Admin tab links to /admin/eventos", () => {
    mockUseAppUser.mockReturnValue({ role: "admin" })
    render(<EnvSwitcher active="admin" />)
    const adminLink = screen.getByText("Admin").closest("a")
    expect(adminLink?.getAttribute("href")).toBe("/admin/eventos")
  })

  it("Moderador tab links to /mediador", () => {
    mockUseAppUser.mockReturnValue({ role: "admin" })
    render(<EnvSwitcher active="admin" />)
    const modLink = screen.getByText("Moderador").closest("a")
    expect(modLink?.getAttribute("href")).toBe("/mediador")
  })
})
