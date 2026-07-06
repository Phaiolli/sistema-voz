# Runbook — Setup de env de produção (go-live)

> Comandos para ligar as integrações do lançamento na Vercel. Todas as features
> são *gated*: sem a env, o código é no-op. Projeto Vercel: `sistema-voz`
> (`phaiollis-projects`). DNS de `useavoz.app` gerenciado na Vercel.

## Já configurado (via CLI)

- `NEXT_PUBLIC_ANALYTICS_ENABLED=true` (Production)
- `EMAIL_FROM=voz. <no-reply@useavoz.app>` (Production)

## 1. Resend — e-mail transacional (#66)

### 1a. Chave de API
Segredo — cole você mesmo (o valor nunca passa pelo agente):
```bash
vercel env add RESEND_API_KEY production
# cole a chave re_... quando pedir
```

### 1b. Verificar o domínio remetente
1. Resend Dashboard → **Domains → Add Domain** → `useavoz.app` (ou `send.useavoz.app`).
2. A Resend gera registros específicos (MX + SPF + DKIM). Adicione-os na Vercel —
   substitua pelos valores que a Resend mostrar:
   ```bash
   # SPF (return-path/bounce) — normalmente no subdomínio "send"
   vercel dns add useavoz.app send MX feedback-smtp.<região>.amazonses.com 10
   vercel dns add useavoz.app send TXT "v=spf1 include:amazonses.com ~all"
   # DKIM — a Resend dá o nome (resend._domainkey) e o valor TXT completo
   vercel dns add useavoz.app resend._domainkey TXT "<valor-DKIM-da-Resend>"
   ```
3. (Recomendado) DMARC:
   ```bash
   vercel dns add useavoz.app _dmarc TXT "v=DMARC1; p=none; rua=mailto:dmarc@useavoz.app"
   ```
4. Clicar **Verify** na Resend e aguardar propagar.
5. Garantir que `EMAIL_FROM` usa um endereço desse domínio verificado.

## 2. Sentry — monitoramento de erros (#60)

1. sentry.io → **Create Project** → plataforma **Next.js**. Copiar o **DSN**.
2. Criar um **Auth Token** (Settings → Auth Tokens) com escopo de upload de source maps.
3. Setar as envs (DSN é público; token/org/project idem via CLI):
   ```bash
   vercel env add NEXT_PUBLIC_SENTRY_DSN production   # cole o DSN https://...ingest...
   vercel env add SENTRY_ORG production               # slug da org
   vercel env add SENTRY_PROJECT production            # slug do projeto
   vercel env add SENTRY_AUTH_TOKEN production          # token de upload
   ```
4. Para o upload de source maps no build, liberar o script do @sentry/cli:
   ```bash
   pnpm approve-builds   # aprovar @sentry/cli
   ```
   (Sem isso o app funciona e reporta erros; só os stack traces ficam sem símbolos.)

## 3. Upstash Redis — rate limit distribuído (#61)

**Opção A (recomendada):** Vercel Dashboard → **Integrations → Marketplace → Upstash**
→ criar um Redis e conectar ao projeto `sistema-voz`. A integração injeta
`UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN` automaticamente.

**Opção B (manual):** criar em upstash.com e setar:
```bash
vercel env add UPSTASH_REDIS_REST_URL production
vercel env add UPSTASH_REDIS_REST_TOKEN production
```

Validar após o deploy: `GET https://useavoz.app/api/health` deve mostrar
`rateLimitDistributed: true`.

## 4. Redeploy (obrigatório após mudar env)

`NEXT_PUBLIC_*` é inlinada no build — só passa a valer num novo deploy.
Redeploy do último deploy de produção (rebuilda com as envs novas, sem subir o
working tree local):
```bash
vercel redeploy $(vercel ls sistema-voz --prod 2>/dev/null | awk '/https/{print $2; exit}')
# ou, no dashboard: Deployments → o último de produção → Redeploy
```

## Checklist final

- [ ] `RESEND_API_KEY` setada + domínio verificado na Resend
- [ ] Sentry DSN/org/project/token setados
- [ ] Upstash conectado (`/api/health` → `rateLimitDistributed: true`)
- [ ] Redeploy de produção feito
- [ ] Smoke test `docs/runbook/go-live-smoke-test.md` (#68)
