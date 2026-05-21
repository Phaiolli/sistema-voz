import { test, expect } from "@playwright/test";

/**
 * E2E: Fluxo de envio de pergunta (Q&A)
 *
 * Pré-condição: evento com slug "e2e-test" deve estar ativo.
 */

const slug = process.env.E2E_EVENT_SLUG ?? "e2e-test";

test.describe("Q&A público", () => {
  test("exibe formulário de perguntas na landing do evento", async ({ page }) => {
    await page.goto(`/e/${slug}`);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("navega para /perguntar ao clicar no CTA", async ({ page }) => {
    await page.goto(`/e/${slug}/perguntar`);
    await expect(page.getByLabel(/nome/i)).toBeVisible();
    await expect(page.getByLabel(/pergunta/i)).toBeVisible();
  });

  test("submete pergunta e redireciona para /obrigado", async ({ page }) => {
    await page.goto(`/e/${slug}/perguntar`);

    await page.getByLabel(/nome/i).fill("Participante E2E");

    const textArea = page.getByLabel(/pergunta/i);
    await textArea.fill("Esta é uma pergunta de teste E2E — pode ignorar.");

    // Accept LGPD if present
    const lgpd = page.getByRole("checkbox");
    if (await lgpd.count() > 0) {
      await lgpd.check();
    }

    await page.getByRole("button", { name: /enviar/i }).click();

    await expect(page).toHaveURL(new RegExp(`/e/${slug}/obrigado`), { timeout: 8_000 });
    await expect(page.getByText(/obrigado/i)).toBeVisible();
  });
});
