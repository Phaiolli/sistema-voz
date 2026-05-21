// @vitest-environment jsdom
/// <reference types="vitest/globals" />
import { render, screen, act } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { AdminThemeProvider, useAdminTheme } from "./admin-theme-provider"

function ThemeDisplay() {
  const { theme, toggleTheme } = useAdminTheme()
  return (
    <div>
      <span data-testid="theme">{theme}</span>
      <button onClick={toggleTheme}>toggle</button>
    </div>
  )
}

function renderWithProvider() {
  return render(
    <AdminThemeProvider>
      <ThemeDisplay />
    </AdminThemeProvider>
  )
}

beforeEach(() => {
  localStorage.clear()
})

describe("AdminThemeProvider", () => {
  it("defaults to dark mode", () => {
    renderWithProvider()
    expect(screen.getByTestId("theme").textContent).toBe("dark")
  })

  it("applies .dark class to wrapper by default", () => {
    const { container } = renderWithProvider()
    const wrapper = container.firstChild as HTMLElement
    expect(wrapper.className).toContain("dark")
  })

  it("does not apply .dark class in light mode", async () => {
    const user = userEvent.setup()
    const { container } = renderWithProvider()
    const wrapper = container.firstChild as HTMLElement

    await user.click(screen.getByRole("button", { name: "toggle" }))

    expect(wrapper.className).not.toContain("dark")
    expect(screen.getByTestId("theme").textContent).toBe("light")
  })

  it("persists theme preference to localStorage", async () => {
    const user = userEvent.setup()
    renderWithProvider()

    await user.click(screen.getByRole("button", { name: "toggle" }))

    expect(localStorage.getItem("theme-admin")).toBe("light")
  })

  it("reads persisted theme from localStorage on mount", async () => {
    localStorage.setItem("theme-admin", "light")

    renderWithProvider()

    await act(async () => {})

    expect(screen.getByTestId("theme").textContent).toBe("light")
  })

  it("toggles back to dark after two clicks", async () => {
    const user = userEvent.setup()
    renderWithProvider()

    await user.click(screen.getByRole("button", { name: "toggle" }))
    await user.click(screen.getByRole("button", { name: "toggle" }))

    expect(screen.getByTestId("theme").textContent).toBe("dark")
    expect(localStorage.getItem("theme-admin")).toBe("dark")
  })

  it("ignores invalid localStorage values", async () => {
    localStorage.setItem("theme-admin", "invalid-value")
    renderWithProvider()
    await act(async () => {})
    expect(screen.getByTestId("theme").textContent).toBe("dark")
  })
})

describe("useAdminTheme outside provider", () => {
  it("returns default dark theme without crashing", () => {
    function Standalone() {
      const { theme } = useAdminTheme()
      return <span>{theme}</span>
    }
    render(<Standalone />)
    expect(screen.getByText("dark")).toBeTruthy()
  })
})
