import { test, expect } from "@playwright/test";

/**
 * E2E: Fluxo de pagamento (checkout Stripe) — criação de evento adicional.
 *
 * O owner que atingiu o limite do plano gratuito inicia o checkout de um evento
 * adicional via POST /api/v1/stripe/checkout. O endpoint cria a Checkout Session
 * na Stripe e devolve `{ checkoutUrl }` apontando para checkout.stripe.com.
 *
 * Como a Stripe é externa, NÃO completamos pagamento real: validamos apenas até
 * o ponto controlável — autorização (não-autenticado e role inválida são
 * barrados) e que o owner recebe uma checkoutUrl válida da Stripe.
 *
 * Pré-condições:
 * - Usuário owner com credenciais E2E_OWNER_EMAIL / E2E_OWNER_PASSWORD.
 * - Stripe configurada no ambiente (chave de teste). Se a sessão de checkout
 *   não puder ser criada, o teste faz `test.skip` com motivo claro em vez de
 *   falhar — seguindo o padrão dos demais specs para pré-condições ausentes.
 *
 * Dados de teste: sintéticos (nenhuma PII real).
 */

const ownerEmail = process.env.E2E_OWNER_EMAIL ?? "owner@e2e.test";
const ownerPassword = process.env.E2E_OWNER_PASSWORD ?? "senha-e2e";

/** Faz login pela UI de /entrar (NextAuth credentials). */
async function login(page: import("@playwright/test").Page, email: string, password: string) {
  await page.goto("/entrar");
  await page.getByLabel(/e-?mail/i).fill(email);
  await page.getByLabel(/senha/i).fill(password);
  await page.getByRole("button", { name: /entrar/i }).click();
  // Aguarda sair da tela de login (sucesso) — owner cai em /dashboard.
  await page.waitForURL((url) => !url.pathname.startsWith("/entrar"), { timeout: 8_000 });
}

const SYNTHETIC_EVENT = {
  name: "Evento E2E Pagamento",
  slug: `e2e-pagamento-${Date.now()}`,
  status: "draft" as const,
};

test.describe("Pagamento — checkout Stripe", () => {
  test("usuário não autenticado é barrado (401)", async ({ request }) => {
    const res = await request.post("/api/v1/stripe/checkout", {
      data: { eventData: SYNTHETIC_EVENT },
    });
    expect(res.status()).toBe(401);
    const body = (await res.json()) as { error?: { code?: string } };
    expect(body.error?.code).toBe("UNAUTHORIZED");
  });

  test("payload inválido é rejeitado com 422 (autenticado como owner)", async ({ page }) => {
    await login(page, ownerEmail, ownerPassword).catch(() => {
      test.skip(true, "Login do owner indisponível (E2E_OWNER_* não seedado).");
    });

    // Reutiliza a sessão autenticada do navegador no request context.
    const res = await page.request.post("/api/v1/stripe/checkout", {
      data: { eventData: { name: "" } }, // falha o createEventSchema
    });

    // 401/403 indicam que a sessão não foi de fato um owner — pré-condição ausente.
    if (res.status() === 401 || res.status() === 403) {
      test.skip(true, `Sessão não é de owner (status ${res.status()}); seed ausente.`);
    }
    expect(res.status()).toBe(422);
    const body = (await res.json()) as { error?: { code?: string } };
    expect(body.error?.code).toBe("VALIDATION_FAILED");
  });

  test("owner inicia checkout e recebe checkoutUrl da Stripe", async ({ page }) => {
    await login(page, ownerEmail, ownerPassword).catch(() => {
      test.skip(true, "Login do owner indisponível (E2E_OWNER_* não seedado).");
    });

    const res = await page.request.post("/api/v1/stripe/checkout", {
      data: { eventData: { ...SYNTHETIC_EVENT, slug: `e2e-pagamento-${Date.now()}` } },
    });

    if (res.status() === 401 || res.status() === 403) {
      test.skip(true, `Sessão não é de owner (status ${res.status()}); seed ausente.`);
    }
    // 500 indica Stripe não configurada (chave de teste ausente) — skip, não falha.
    if (res.status() >= 500) {
      test.skip(true, `Stripe indisponível no ambiente (status ${res.status()}).`);
    }

    expect(res.status()).toBe(200);
    const body = (await res.json()) as { checkoutUrl?: string };
    expect(body.checkoutUrl, "endpoint deve devolver checkoutUrl").toBeTruthy();
    // A URL deve apontar para o domínio de checkout da Stripe.
    expect(body.checkoutUrl).toMatch(/^https:\/\/(checkout\.stripe\.com|.*\.stripe\.com)\//);
  });

  test("página de conta exibe seção de plano e pagamentos", async ({ page }) => {
    await login(page, ownerEmail, ownerPassword).catch(() => {
      test.skip(true, "Login do owner indisponível (E2E_OWNER_* não seedado).");
    });

    await page.goto("/conta");
    await expect(page.getByRole("heading", { name: /minha conta/i })).toBeVisible({ timeout: 8_000 });
    await expect(page.getByRole("heading", { name: /plano e pagamentos/i })).toBeVisible();
  });
});
