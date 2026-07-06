# Runbook — Backup & Restore do Postgres

> Objetivo: garantir recuperação do banco antes do go-live público. Rastreado por #65.

## Provedor e política de backup

O banco roda em **Supabase/Neon** (Postgres). Antes do lançamento:

- [ ] Confirmar no painel do provedor que o **Point-in-Time Recovery (PITR)** ou o
      backup diário automático está **ativo** no plano contratado (o free tier costuma
      ter retenção limitada — avaliar upgrade para produção).
- [ ] Registrar a **janela de retenção** dos backups (ex.: 7 dias) e o **RPO** resultante.

## Backup manual (antes de migrations sensíveis)

```bash
# Dump lógico completo (schema + dados). Requer pg_dump compatível com a versão do servidor.
pg_dump "$DATABASE_URL" --no-owner --format=custom --file=backup-$(date +%F).dump
```

> Guardar o dump fora do provedor (ex.: storage privado). O arquivo contém PII —
> tratar como dado sensível e eliminar após o uso.

## Teste de restore (obrigatório antes do go-live)

1. Criar um projeto/banco **descartável** no provedor.
2. Restaurar:
   ```bash
   pg_restore --no-owner --clean --if-exists --dbname "$RESTORE_TARGET_URL" backup-YYYY-MM-DD.dump
   ```
3. Validar: contagem de linhas em `users`, `events`, `questions`, `registrations`
   e uma consulta de sanidade (um evento com suas perguntas).
4. Medir e registrar o **RTO** (tempo total até o banco utilizável).
5. Destruir o banco de teste.

## Critérios de aceite (#65)

- [ ] PITR/backup confirmado e documentado (RPO).
- [ ] Um restore de teste executado com sucesso (RTO registrado).
- [ ] Procedimento de restore validado por uma segunda pessoa ou repetido.
