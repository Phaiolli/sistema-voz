# Runbook — Smoke test de produção (go-live)

> Executar **após cada deploy de produção** em `https://useavoz.app`. Tempo: ~10 min.
> Rastreado por #68.

## 0. Saúde da aplicação

- [ ] `GET https://useavoz.app/api/health` retorna `200` com `status: "ok"`.
- [ ] No JSON de resposta: `database: true`, `clerk: true`, `stripe: true`,
      `rateLimitDistributed: true` (ver #61 se `false`).
- [ ] `GET https://useavoz.app/robots.txt` e `/sitemap.xml` respondem `200`.

## 1. Fluxo do participante (sem login)

- [ ] Abrir `/e/<slug-de-um-evento-ativo>` — hero, programação e CTA carregam.
- [ ] `/e/<slug>/perguntar` — enviar uma pergunta válida → redireciona para `/obrigado`.
- [ ] Enviar acima do limite do plano free (16ª pergunta) → bloqueio com mensagem clara (#69).
- [ ] Console do navegador sem erros de CSP/nonce.

## 2. Fluxo do organizador

- [ ] `/cadastro` — criar conta; consentimento de Termos/Privacidade visível e exigido pelo Clerk.
- [ ] `/entrar` — login end-to-end (ver #55); cai em `/pos-login` e chega ao dashboard.
- [ ] Criar um evento → aparece em `/admin/eventos` (ou `/dashboard`).
- [ ] Free: tentar criar o 2º evento → bloqueio (#69).
- [ ] Checkout de assinatura Pro (cartão de teste `4242…` em test mode; cartão real em live)
      → após o webhook, limites liberados (#69).
- [ ] `/conta` → abrir o Customer Portal (ver #55) e voltar sem erro.
- [ ] `/mediador` — lista de perguntas em tempo real; `/mediador/apresentar` em tela cheia.

## 3. Integrações

- [ ] Stripe Dashboard → o webhook `/api/stripe/webhook` recebeu `200` no checkout de teste.
- [ ] Clerk Dashboard → sessão criada com claims `metadata.role`/`externalId`.
- [ ] Sentry → nenhum erro novo inesperado disparado durante o smoke test (#60).

## Rollback

Se algo crítico falhar, promover o deploy anterior na Vercel
(`vercel rollback` ou "Promote to Production" no deploy verde anterior) e abrir issue.
