# Runbook — Domínio & DNS (useavoz.app)

> Configuração final de domínio para o lançamento público. Rastreado por #70.

## Domínio principal (Vercel)

- [ ] `useavoz.app` (apex) e `www.useavoz.app` adicionados ao projeto na Vercel.
- [ ] SSL emitido e válido em ambos.
- [ ] Redirect canônico definido: `www` → apex (ou o inverso), 308.
- [ ] `NEXT_PUBLIC_APP_URL=https://useavoz.app` em produção (usado em SEO e redirects Stripe).

## Clerk (subdomínios)

CNAMEs já adicionados via `vercel dns add` (ver memória de auth). Reconfirmar ativos:

- [ ] `clerk` → `frontend-api.clerk.services`
- [ ] `accounts` → `accounts.clerk.services`
- [ ] `clkmail` + `clk._domainkey` + `clk2._domainkey` → alvos `*.clerk.services`
- [ ] "Verify" concluído no Clerk e certificado SSL emitido.

## E-mail (se habilitar Resend — #66)

Para enviar e-mail transacional a partir de `@useavoz.app`, configurar no DNS:

- [ ] **SPF** — TXT `v=spf1 include:_spf.resend.com ~all` (ou equivalente do provedor).
- [ ] **DKIM** — registros CNAME/TXT fornecidos pela Resend ao adicionar o domínio.
- [ ] **DMARC** — TXT `_dmarc` `v=DMARC1; p=none; rua=mailto:dmarc@useavoz.app` (evoluir para `p=quarantine`).
- [ ] Domínio verificado no painel da Resend antes do primeiro envio.

## Critérios de aceite (#70)

- [ ] Apex + www servindo com SSL e redirect canônico.
- [ ] Subdomínios do Clerk verificados.
- [ ] SPF/DKIM/DMARC configurados **se** o e-mail transacional for ao ar.
