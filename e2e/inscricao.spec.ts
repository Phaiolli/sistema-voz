import { test, expect } from "@playwright/test";

/**
 * E2E: Fluxo de inscrição pública
 *
 * Pré-condição: evento com slug "e2e-test" deve existir e ter inscrições abertas.
 * Use a variável E2E_EVENT_SLUG para apontar para um evento de teste real.
 */

const slug = process.env.E2E_EVENT_SLUG ?? "e2e-test";

test.describe("Inscrição pública", () => {
  test("exibe formulário quando inscrições estão abertas", async ({ page }) => {
    await page.goto(`/e/${slug}/inscricao`);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByLabel(/nome/i)).toBeVisible();
    await expect(page.getByLabel(/e-mail/i)).toBeVisible();
  });

  test("valida campos obrigatórios antes de submeter", async ({ page }) => {
    await page.goto(`/e/${slug}/inscricao`);
    await page.getByRole("button", { name: /inscrever/i }).click();
    // Form should not navigate away — still on same URL
    await expect(page).toHaveURL(new RegExp(`/e/${slug}/inscricao$`));
  });

  test("inscrição completa redireciona para confirmação com QR Code", async ({ page }) => {
    await page.goto(`/e/${slug}/inscricao`);

    const uniqueEmail = `playwright-${Date.now()}@e2e.test`;
    await page.getByLabel(/nome/i).fill("Playwright Teste");
    await page.getByLabel(/e-mail/i).fill(uniqueEmail);

    // Accept LGPD if present
    const lgpd = page.getByRole("checkbox");
    if (await lgpd.count() > 0) {
      await lgpd.check();
    }

    await page.getByRole("button", { name: /inscrever/i }).click();

    // Should navigate to confirmation page
    await expect(page).toHaveURL(new RegExp(`/e/${slug}/inscricao/confirmacao`));
    await expect(page.getByText(/inscrição confirmada/i)).toBeVisible();

    // QR Code image should eventually appear
    await expect(page.locator("img[alt*='QR']")).toBeVisible({ timeout: 10_000 });
  });
});
