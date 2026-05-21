// @vitest-environment jsdom
/// <reference types="vitest/globals" />
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { AdminThemeProvider } from "./admin-theme-provider"
import { ThemeToggle } from "./theme-toggle"

function renderToggle() {
  return render(
    <AdminThemeProvider>
      <ThemeToggle />
    </AdminThemeProvider>
  )
}

beforeEach(() => {
  localStorage.clear()
})

describe("ThemeToggle", () => {
  it("renders Sun icon in dark mode (default)", () => {
    renderToggle()
    expect(screen.getByRole("button", { name: "Ativar modo claro" })).toBeTruthy()
  })

  it("renders Moon icon after switching to light mode", async () => {
    const user = userEvent.setup()
    renderToggle()

    await user.click(screen.getByRole("button", { name: "Ativar modo claro" }))

    expect(screen.getByRole("button", { name: "Ativar modo escuro" })).toBeTruthy()
  })

  it("has accessible aria-label in dark mode", () => {
    renderToggle()
    const btn = screen.getByRole("button", { name: "Ativar modo claro" })
    expect(btn.getAttribute("aria-label")).toBe("Ativar modo claro")
  })

  it("has accessible aria-label in light mode", async () => {
    const user = userEvent.setup()
    renderToggle()

    await user.click(screen.getByRole("button", { name: "Ativar modo claro" }))

    const btn = screen.getByRole("button", { name: "Ativar modo escuro" })
    expect(btn.getAttribute("aria-label")).toBe("Ativar modo escuro")
  })

  it("accepts and applies custom className", () => {
    const { container } = render(
      <AdminThemeProvider>
        <ThemeToggle className="custom-class" />
      </AdminThemeProvider>
    )
    const btn = container.querySelector("button")
    expect(btn?.className).toContain("custom-class")
  })
})
