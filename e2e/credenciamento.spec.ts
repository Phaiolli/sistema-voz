import { test, expect } from "@playwright/test";

/**
 * E2E: Fluxo de credenciamento pelo mediador
 *
 * Pré-condição:
 * - Usuário mediador com credenciais E2E_MEDIADOR_EMAIL / E2E_MEDIADOR_PASSWORD
 * - Ao menos um inscrito no evento atribuído ao mediador
 */

const email = process.env.E2E_MEDIADOR_EMAIL ?? "mediador@e2e.test";
const password = process.env.E2E_MEDIADOR_PASSWORD ?? "senha-e2e";

test.describe("Credenciamento — mediador", () => {
  test("mediador faz login e acessa credenciamento", async ({ page }) => {
    await page.goto("/entrar");

    await page.getByLabel(/e-mail/i).fill(email);
    await page.getByLabel(/senha/i).fill(password);
    await page.getByRole("button", { name: /entrar/i }).click();

    // Redirected to mediador dashboard
    await expect(page).toHaveURL(/\/mediador/, { timeout: 8_000 });
  });

  test("acessa página de credenciamento e vê lista de inscritos", async ({ page }) => {
    // Login first
    await page.goto("/entrar");
    await page.getByLabel(/e-mail/i).fill(email);
    await page.getByLabel(/senha/i).fill(password);
    await page.getByRole("button", { name: /entrar/i }).click();
    await page.waitForURL(/\/mediador/);

    await page.goto("/mediador/credenciamento");
    await expect(page.getByPlaceholder(/buscar/i)).toBeVisible({ timeout: 8_000 });
  });

  test("busca por nome filtra a lista", async ({ page }) => {
    await page.goto("/entrar");
    await page.getByLabel(/e-mail/i).fill(email);
    await page.getByLabel(/senha/i).fill(password);
    await page.getByRole("button", { name: /entrar/i }).click();
    await page.waitForURL(/\/mediador/);

    await page.goto("/mediador/credenciamento");
    const search = page.getByPlaceholder(/buscar/i);
    await expect(search).toBeVisible({ timeout: 8_000 });

    await search.fill("zzzznonexistent");
    await expect(page.getByText(/nenhum resultado/i)).toBeVisible();
  });
});
