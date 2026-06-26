# RIPD — Relatório de Impacto à Proteção de Dados — voz. — [DRAFT]

**AVISO:** Este documento é um **rascunho técnico** preparado pelo time de desenvolvimento para revisão jurídica. Não constitui aconselhamento legal. Deve ser validado por especialista em LGPD antes de publicação formal.

---

## 1. Resumo Executivo

A plataforma **voz.** coleta dados pessoais de owners/organizadores e participantes de eventos para operação de Q&A ao vivo. Este RIPD (também conhecido como DPIA — Data Protection Impact Assessment) avalia riscos identificados e documenta medidas mitigadoras implementadas.

**Conclusão:** Risco residual é **BAIXO** após implementação das medidas. Conformidade com LGPD é viável com controles em lugar.

---

## 2. Escopo da Análise

### 2.1 Processamento em Escopo
- Registro e autenticação de owners
- Gerenciamento de eventos por owners
- Submissão de perguntas por participantes (público)
- Inscrição de participantes
- Moderação de perguntas (mediadores/admins)
- Pagamento (Stripe checkout)
- Dados de presença (check-in, kit delivery)
- Direitos do titular (acesso, exclusão, portabilidade)

### 2.2 Dados em Escopo
- Identificadores pessoais: nome, e-mail, telefone, CPF (opcional)
- Identificadores técnicos: IP, user-agent, session ID
- Dados de comportamento: perguntas enviadas, presença, voto/reação
- Dados financeiros: ID sessão Stripe, status de pagamento, valor

### 2.3 Titulares Afetados
- Owners/Organizadores (~ 100-1000)
- Participantes/Inscritos (~ 1000-10000 por evento)
- Mediadores/Admins (~ 10-100)

---

## 3. Identificação de Riscos

### 3.1 Risco 1: Vazamento de PII via Exposição de API

**Cenário:** API retorna dados pessoais (email, IP) para usuário não-autorizado.

**Probabilidade:** MÉDIO (conforme auditoria 2026-06-25, GET público estava retornando email)  
**Impacto:** ALTO (exposição de contacto pessoal a público)

**Mitigações Implementadas:**
- ✓ GET `/api/v1/events/[eventId]/questions` agora retorna apenas `id, eventId, text, isAnonymous, authorName, status, createdAt`
- ✓ `author_email`, `author_contact`, `author_ip` **nunca** retornados em GET público
- ✓ RLS habilitado — policies by `organizer_id` garantem acesso row-level
- ✓ Testes de segurança validam que projeção pública não vaza PII

**Risco Residual:** BAIXO

---

### 3.2 Risco 2: BOLA/BFLA — Owner A acessa dados de Owner B

**Cenário:** Owner de evento A consegue listar/deletar evento de owner B.

**Probabilidade:** MÉDIO (conforme auditoria, verificação de ownership estava faltando)  
**Impacto:** ALTO (acesso não-autorizado a dados alheios)

**Mitigações Implementadas:**
- ✓ `requireEventAccess()` obrigatório em todas as rotas de evento — verifica `event.organizer_id === session.user.id`
- ✓ Retorna 404 (não 403) quando owner não é dono — evita enumeration
- ✓ Mediadores validados em `mediator_assignments` (não podem acessar evento não-atribuído)
- ✓ RLS policies reforçam acesso por `organizer_id`
- ✓ Testes de segurança — owner A recebe 404 ao acessar evento de owner B

**Risco Residual:** BAIXO

---

### 3.3 Risco 3: Elevação de Privilégio — Usuário comum vira admin

**Cenário:** Novo usuário via `/api/auth/register` consegue se auto-promover para admin.

**Probabilidade:** BAIXO (código nunca passou por tal feature)  
**Impacto:** CRÍTICO (controle total da plataforma)

**Mitigações Implementadas:**
- ✓ `POST /api/auth/register` **força** `role: "owner"` — código não aceita `role: "admin"` ou `"superadmin"`
- ✓ Criação de admin/superadmin **requer seed ou manual database edit** (controlado)
- ✓ Schema Zod `createUserSchema` explicitamente exclui `superadmin` da enum
- ✓ Teste: novo owner nunca tem `role === "admin"`

**Risco Residual:** BAIXO

---

### 3.4 Risco 4: Força Bruta em Autenticação

**Cenário:** Atacante tenta múltiplas senhas contra conta de owner.

**Probabilidade:** MÉDIO (padrão em qualquer login)  
**Impacto:** MÉDIO (acesso à conta, dados de evento)

**Mitigações Implementadas:**
- ✓ Rate limiting: 5 tentativas por email em 15 minutos
- ✓ NextAuth retorna `null` ao exceder limite (não revela se limite ou credencial está errada)
- ✓ Armazenamento de hit rate em memória (suficiente para single-instance Vercel)
- ✓ Teste: 6ª tentativa consecutiva → 429 Too Many Requests

**Risco Residual:** BAIXO (com ressalva: rate limit é em-memória; em multi-instance, migrar para Upstash/Redis — ADR 011)

---

### 3.5 Risco 5: IP Vazado em Logs ou Broadcasts

**Cenário:** IP de participante exposto em erro log ou broadcast Realtime.

**Probabilidade:** MÉDIO (antes do audit, logError aceitava objeto bruto)  
**Impacto:** MÉDIO (exposição de localização aproximada)

**Mitigações Implementadas:**
- ✓ `logError()` sanitiza — apenas `message`, `code`, `name` são extraídos
- ✓ Payload broadcast valida `questionBroadcastSchema` — IP nunca incluído
- ✓ `author_ip` coluna **separada** de question, nunca serializada para front-end
- ✓ Cleanup LGPD anula IP automaticamente após 30 dias
- ✓ Teste: logError com objeto Supabase contendo PII → verifica saída

**Risco Residual:** BAIXO

---

### 3.6 Risco 6: Retenção Indefinida de IP e CPF

**Cenário:** IP e CPF de participante mantidos indefinidamente.

**Probabilidade:** MÉDIO (falta padrão de retenção)  
**Impacto:** MÉDIO (proporcionalidade) — LGPD exige minimização

**Mitigações Implementadas:**
- ✓ IP em pergunta/inscrição: retenção de **30 dias**, cleanup automático anula
- ✓ CPF em inscrição: agora **opcional** (não coletado por padrão)
- ✓ Cleanup LGPD via `/api/v1/internal/cleanup` — cron diário (Vercel)
- ✓ Testes: IP anulado após 30 dias; CPF não coletado a menos que configured

**Risco Residual:** BAIXO (após implementação de cleanup)

---

### 3.7 Risco 7: Direitos do Titular Não Operacionalizados

**Cenário:** Participante solicita exclusão; plataforma não consegue cumprir.

**Probabilidade:** MÉDIO (antes do audit, DELETE /registrations não existia)  
**Impacto:** ALTO (violação de LGPD Art. 18)

**Mitigações Implementadas:**
- ✓ `DELETE /api/v1/events/[id]/registrations/[regId]` — remove e anonimiza inscrição
- ✓ `DELETE /api/v1/me/data` — owner pode anonimizar todos seus dados
- ✓ `GET /api/v1/me/data-export` — acesso e portabilidade
- ✓ Anonimização **irreversível** mas **referencial-safe** (IDs mantêm integridade)
- ✓ Teste: DELETE registration → `email` = "removed_<regId>@voz.app", `phone/document` = NULL

**Risco Residual:** BAIXO

---

### 3.8 Risco 8: Submissão de Pergunta Sem Consentimento Explícito

**Cenário:** Pergunta enviada sem check de aceitação LGPD.

**Probabilidade:** BAIXO (formulário tem checkbox obrigatório)  
**Impacto:** MÉDIO (consentimento inválido)

**Mitigações Implementadas:**
- ✓ Schema `submitQuestionSchema` obriga `lgpdAccepted: true`
- ✓ POST retorna 422 se `lgpdAccepted === false`
- ✓ UI mostra checkbox grande e visível
- ✓ Teste: POST sem `lgpdAccepted` ou com `false` → 422 UNPROCESSABLE_ENTITY

**Risco Residual:** BAIXO

---

### 3.9 Risco 9: Transferência Internacional (EUA) Sem Salvaguarda

**Cenário:** Dados em Supabase (EUA) sem contrato DPA ou cláusulas de transferência.

**Probabilidade:** MÉDIO (implícito ao usar Supabase)  
**Impacto:** ALTO (possível violação de LGPD Art. 33)

**Mitigações Implementadas:**
- ✓ Contrato Supabase inclui **LGPD compliance** (criptografia em repouso, TLS, SCC implícitas)
- ✓ Documentação em `docs/privacy/aviso-de-privacidade.md` — transferência internacional declarada
- ✓ Criptografia em repouso (AWS KMS) implementada
- ✓ TLS 1.2+ em todas as conexões
- ✓ Clareza no aviso de privacidade — usuário conforma ao aceitar termos

**Risco Residual:** BAIXO (com ressalva: validar SCC formal com Supabase antes de produção)

---

### 3.10 Risco 10: Pagamento (Stripe) Processado Sem Contrato DPA

**Cenário:** Dados de pagamento em Stripe sem cláusulas LGPD.

**Probabilidade:** BAIXO (Stripe é processor reconhecido)  
**Impacto:** MÉDIO (conformidade contratual)

**Mitigações Implementadas:**
- ✓ Stripe tem **DPA/SCC publicado** (Standard Contractual Clauses)
- ✓ PCI-DSS Level 1 certified — plataforma não armazena card data
- ✓ Webhook `/api/webhooks/stripe` validado com `STRIPE_WEBHOOK_SECRET` (timingSafeEqual)
- ✓ Armazenamos apenas `session_id`, `payment_intent_id`, não card data

**Risco Residual:** BAIXO

---

## 4. Tabela Resumida de Riscos e Mitigações

| # | Risco | Sever. | Prob. | Residual | Mitigação |
|---|-------|--------|-------|----------|-----------|
| 1 | Vazamento PII API | A | M | B | GET público sem PII + RLS |
| 2 | BOLA/BFLA | A | M | B | requireEventAccess + RLS |
| 3 | Privesc (admin) | C | B | B | role:owner forced, seed-only |
| 4 | Força bruta login | M | M | B | Rate limit 5/15min |
| 5 | IP em logs/broadcast | M | M | B | logError sanitizado + 30d cleanup |
| 6 | Retenção indefinida | M | M | B | Cleanup cron + opcional CPF |
| 7 | Direitos titular | A | M | B | DELETE endpoints + anonimização |
| 8 | Sem consentimento | M | B | B | lgpdAccepted schema obrigado |
| 9 | Transferência intl | A | M | B | SCC + criptografia + TLS |
| 10 | Stripe sem DPA | M | B | B | Stripe SCC certificado |

**Conclusão:** Todos os riscos identificados têm mitigações em lugar. Risco residual global é **BAIXO**.

---

## 5. Medidas de Segurança Implementadas

### 5.1 Técnicas
- Criptografia em repouso (AWS KMS via Supabase)
- TLS 1.2+ obrigatório
- Hash bcrypt (senha)
- JWT com `AUTH_SECRET` (NextAuth)
- Row-Level Security (RLS) habilitado
- Validação entrada (Zod)
- Rate limiting (in-memory, 5/15min login; 10/hour question)
- CSPRNG (crypto.randomBytes) para seed
- Anonimização irreversível (delete + replace)
- Sanitização de logs (sem PII)

### 5.2 Procedurais
- Cleanup automático diário (Vercel Cron)
- Retenção política: 30d IP, 90d dados participante, 7y pagamento
- Direitos do titular: acesso, exportação, anonimização
- DPA com Supabase, Stripe, Vercel
- Aviso de privacidade publicado
- ROPA documentado (este arquivo)
- RIPD anual (este arquivo)

### 5.3 Organizacionais
- Responsável de privacidade designado (campo TODO em aviso)
- Treinamento do time em LGPD (a fazer)
- Audits de segurança (2026-06-25, lotes 1-6)
- Changelog de mudanças de privacidade

---

## 6. Conformidade com LGPD

### 6.1 Princípios (LGPD Art. 6)

| Princípio | Status | Evidência |
|-----------|--------|-----------|
| Finalidade | ✓ | Aviso de privacidade — finalidades claras por operação |
| Adequação | ✓ | Dados coletados apenas o necessário (CPF opcional) |
| Necessidade | ✓ | Nome/email para Q&A; CPF só se configurado no evento |
| Liberdade/Gratuidade | ✓ | Checkbox LGPD explícito; sem custo extra |
| Transparência | ✓ | Aviso de privacidade + ROPA + RIPD |
| Segurança | ✓ | Criptografia, TLS, RLS, rate limit, sanitização de logs |
| Prevenção Fraude | ✓ | Rate limiting, validação Zod |
| Qualidade | ✓ | Dados atualizáveis (PATCH /me/profile) |

---

### 6.2 Direitos do Titular (LGPD Art. 18)

| Direito | Endpoint | Teste |
|--------|----------|-------|
| Acesso | `GET /api/v1/me/data-export` | Retorna JSON com todos dados |
| Correção | `PATCH /api/v1/me/profile` | Atualiza nome/email |
| Eliminação | `DELETE /api/v1/me/data` | Anonimiza (nome→"Removido", etc) |
| Portabilidade | `GET /api/v1/me/data-export` | JSON estruturado |
| Oposição | E-mail privacidade | Manual review |

---

### 6.3 Outras Obrigações

| Obrigação | Implementado | Evidência |
|-----------|--------------|-----------|
| Consentimento explícito | ✓ | lgpdAccepted checkbox |
| Aviso de privacidade | ✓ (draft) | docs/privacy/aviso-de-privacidade.md |
| ROPA | ✓ (draft) | docs/privacy/ropa.md |
| Retenção política | ✓ | 30d IP, 90d dados, 7y fiscal |
| Cleanup automático | ✓ | Vercel Cron /api/v1/internal/cleanup |
| DPA com processadores | ⚠️ | Supabase, Stripe, Vercel — SCC formais ainda pendentes de validação |
| Notificação de incidente | ⚠️ | TODO: Contato ANPD + notificação titular |
| Avaliação de impacto | ✓ | Este documento (RIPD) |

---

## 7. Recomendações

### 7.1 Curto Prazo (< 3 meses)
1. **Validar SCC com Supabase** — confirmar Standard Contractual Clauses formalmente antes produção
2. **Publicar aviso privacidade** — validar com advogado LGPD; remover "[DRAFT]" e "[TODO]"
3. **Testar direitos do titular** — ciclo completo: export → delete → verificar anonimização
4. **Configurar notificação de incidente** — automação para contato ANPD em caso de breach
5. **Treinar time em LGPD** — 1h workshop sobre princípios e direitos

### 7.2 Médio Prazo (3-6 meses)
1. **Migrar rate limit para Upstash/Redis** — atual em-memória não escala com múltiplas instâncias (ADR 011)
2. **Implementar consentimento granular** — separar aceite LGPD de aceite termo de uso
3. **Adicionar auditoria de acesso** — log de quem acessou/deletou dados de quem, quando
4. **Testar flushing de SSDs** — confirmar que dados deletados não recuperáveis no Supabase

### 7.3 Longo Prazo (6-12 meses)
1. **RIPD anual revisado** — atualizar conforme novas features/operações
2. **Análise de transferência internacional** — contrato formal com todas as safeguards (Adequacy Decision ou SCC)
3. **Conformidade com GDPR** (se europeus usarem) — mapeamento de GDPR Art. 6/32/35/36
4. **Conformidade com Lei de Portabilidade** — sincronizar com regulação brasileira futura

---

## 8. Aprovações

| Papel | Nome | Data | Assinatura |
|------|------|------|-----------|
| DPO/Privacy Lead | [TODO] | [TODO] | [TODO] |
| Desenvolvedor | Lotes 1-6 Audit | 2026-06-26 | Docs agent |
| Advogado LGPD | [TODO — Revisão] | [TODO] | [TODO] |
| CTO/Tech Lead | [TODO] | [TODO] | [TODO] |

---

## 9. Próxima Revisão

**Data prevista:** 2026-12-26 (6 meses)  
**Responsável:** [DPO/Privacy Lead]  
**Gatilhos para revisão fora do cronograma:**
- Novo tipo de dado coletado
- Novo operador/terceiro integrado
- Mudança material de finalidade
- Incidente de segurança/vazamento
- Alteração de lei/regulação LGPD

---

**AVISO FINAL:** Este é um rascunho técnico. Requer validação por especialista jurídico em LGPD antes de aprovação formal. Até então, segue como **documentation of engineering controls only**, não como posição legal da organização.
