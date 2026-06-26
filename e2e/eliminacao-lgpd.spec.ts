import { test, expect } from "@playwright/test";

/**
 * E2E: Direito de eliminação do titular (LGPD art. 18, VI) — anonimização de
 * inscrição mediada pelo organizador.
 *
 * O DELETE /api/v1/events/:id/registrations/:regId NÃO faz hard-delete: anonimiza
 * a PII (name → "[removido]", email → "removed_<id>@voz.app", phone/document → null)
 * preservando id/event_id e contadores. Validamos que, após o DELETE autenticado:
 *   - a resposta é 200 { anonymized: true };
 *   - a inscrição passa a aparecer anonimizada (ou some) na listagem do organizador.
 *
 * Como ainda NÃO há um fluxo de UI dedicado para a eliminação na lista de
 * inscritos, este E2E exerce o fluxo via request context autenticado do
 * Playwright (a UI correspondente fica como follow-up — ver nota ao final).
 *
 * Pré-condições:
 * - Usuário owner/mediador com E2E_OWNER_EMAIL / E2E_OWNER_PASSWORD (ou
 *   E2E_MEDIADOR_EMAIL / E2E_MEDIADOR_PASSWORD).
 * - Evento de teste acessível por esse usuário, identificado por E2E_EVENT_ID.
 * Sem essas pré-condições, o teste faz `test.skip` com motivo, nunca falha.
 *
 * Dados de teste: 100% sintéticos (nenhuma PII real).
 */

const ownerEmail = process.env.E2E_OWNER_EMAIL ?? process.env.E2E_MEDIADOR_EMAIL ?? "owner@e2e.test";
const ownerPassword = process.env.E2E_OWNER_PASSWORD ?? process.env.E2E_MEDIADOR_PASSWORD ?? "senha-e2e";
const eventId = process.env.E2E_EVENT_ID;
const slug = process.env.E2E_EVENT_SLUG ?? "e2e-test";

async function login(page: import("@playwright/test").Page, email: string, password: string) {
  await page.goto("/entrar");
  await page.getByLabel(/e-?mail/i).fill(email);
  await page.getByLabel(/senha/i).fill(password);
  await page.getByRole("button", { name: /entrar/i }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/entrar"), { timeout: 8_000 });
}

interface Registration {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  document: string | null;
}

test.describe("Eliminação LGPD — anonimização de inscrição", () => {
  test("não autenticado não consegue anonimizar (401/403)", async ({ request }) => {
    test.skip(!eventId, "E2E_EVENT_ID ausente — sem evento de teste para mirar.");

    const res = await request.delete(
      `/api/v1/events/${eventId}/registrations/00000000-0000-0000-0000-000000000000`,
    );
    expect([401, 403]).toContain(res.status());
  });

  test("organizador anonimiza inscrição e PII vira sentinela", async ({ page }) => {
    test.skip(!eventId, "E2E_EVENT_ID ausente — sem evento de teste para mirar.");

    await login(page, ownerEmail, ownerPassword).catch(() => {
      test.skip(true, "Login do organizador indisponível (seed ausente).");
    });

    // 1) Cria uma inscrição SINTÉTICA via endpoint público (não requer auth).
    const uniqueEmail = `lgpd-e2e-${Date.now()}@e2e.test`;
    const createRes = await page.request.post(
      `/api/v1/events/${eventId}/registrations`,
      { data: { name: "Titular Sintético E2E", email: uniqueEmail, lgpdAccepted: true } },
    );

    // Inscrições podem estar fechadas / rate-limited / evento inválido: skip.
    if (createRes.status() !== 201) {
      test.skip(true, `Não foi possível criar inscrição sintética (status ${createRes.status()}).`);
    }
    const created = (await createRes.json()) as Registration;
    expect(created.id).toBeTruthy();

    // 2) Confirma que aparece na listagem do organizador (rota protegida).
    const listBefore = await page.request.get(`/api/v1/events/${eventId}/registrations`);
    if (listBefore.status() === 401 || listBefore.status() === 403) {
      test.skip(true, `Sessão sem acesso ao evento (status ${listBefore.status()}); seed ausente.`);
    }
    expect(listBefore.status()).toBe(200);
    const before = (await listBefore.json()) as { registrations: Registration[] };
    expect(before.registrations.some((r) => r.id === created.id)).toBe(true);

    // 3) Exerce a eliminação (DELETE → anonimização).
    const delRes = await page.request.delete(
      `/api/v1/events/${eventId}/registrations/${created.id}`,
    );
    expect(delRes.status()).toBe(200);
    expect((await delRes.json()) as { anonymized?: boolean }).toMatchObject({ anonymized: true });

    // 4) Verifica anonimização na listagem: PII removida, id preservado.
    const listAfter = await page.request.get(`/api/v1/events/${eventId}/registrations`);
    expect(listAfter.status()).toBe(200);
    const after = (await listAfter.json()) as { registrations: Registration[] };
    const row = after.registrations.find((r) => r.id === created.id);
    expect(row, "registro deve permanecer (anonimizado, não hard-delete)").toBeTruthy();
    expect(row?.name).toBe("[removido]");
    expect(row?.email).not.toBe(uniqueEmail);
    expect(row?.email).toMatch(/^removed_.*@voz\.app$/);
    expect(row?.phone).toBeNull();
    expect(row?.document).toBeNull();
  });

  test("DELETE em regId inexistente retorna 404 (autenticado)", async ({ page }) => {
    test.skip(!eventId, "E2E_EVENT_ID ausente — sem evento de teste para mirar.");

    await login(page, ownerEmail, ownerPassword).catch(() => {
      test.skip(true, "Login do organizador indisponível (seed ausente).");
    });

    const res = await page.request.delete(
      `/api/v1/events/${eventId}/registrations/11111111-1111-1111-1111-111111111111`,
    );
    if (res.status() === 401 || res.status() === 403) {
      test.skip(true, `Sessão sem acesso ao evento (status ${res.status()}); seed ausente.`);
    }
    expect(res.status()).toBe(404);
  });

  // FOLLOW-UP (UI): quando existir botão "Excluir/Anonimizar" na lista de
  // inscritos do organizador (ex.: /mediador/credenciamento ou painel admin do
  // evento `slug`), substituir o DELETE via request por interação de UI:
  //   await page.goto(`/admin/eventos/${slug}/inscritos`);
  //   await page.getByRole("row", { name: created.name }).getByRole("button", { name: /anonimizar|excluir/i }).click();
  //   await page.getByRole("button", { name: /confirmar/i }).click();
  //   await expect(page.getByText("[removido]")).toBeVisible();
});
