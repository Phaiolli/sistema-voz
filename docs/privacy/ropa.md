# ROPA — Registro de Operações de Tratamento — voz. — [DRAFT]

**AVISO:** Este documento é um **rascunho técnico** preparado pelo time de desenvolvimento para revisão jurídica. Não constitui aconselhamento legal. Deve ser validado por especialista em LGPD antes de uso oficial.

---

## Escopo

Este ROPA documenta operações de tratamento de dados pessoais pela plataforma voz. no papel de **Controlador**. Supabase, Stripe e Vercel atuam como **Operadores** (conforme contrato DPA/LGPD).

---

## Operações Mapeadas

### Operação 1: Registro de Owner

| Campo | Descrição |
|-------|-----------|
| **Operação** | Cadastro de novo usuário (owner) |
| **Endpoint** | `POST /api/auth/register` |
| **Dados Coletados** | Nome, e-mail, senha (hash bcrypt), data de criação |
| **Finalidade** | Autenticação, acesso à plataforma, comunicações |
| **Base Legal** | Contrato (execução do contrato) |
| **Categoria de Titular** | Owner/Organizador |
| **Retenção** | Indefinido (mantém acesso à conta) |
| **Operador** | Supabase (PostgreSQL) |
| **Segurança** | Hash bcrypt, TLS, RLS, criptografia em repouso |

---

### Operação 2: Criação/Gerenciamento de Evento

| Campo | Descrição |
|-------|-----------|
| **Operação** | Criar, atualizar, listar, deletar evento |
| **Endpoints** | `POST/GET/PATCH/DELETE /api/v1/events[/id]` |
| **Dados Coletados** | Nome, slug, datas, local, endereço, status, tema, config, owner_id |
| **Finalidade** | Gerenciamento de evento, exibição pública |
| **Base Legal** | Contrato (execução) |
| **Categoria de Titular** | Owner |
| **Retenção** | Enquanto owner deseja (pode deletar manualmente) |
| **Operador** | Supabase (PostgreSQL) |
| **Segurança** | RLS (owner vê apenas seus eventos), TLS |

---

### Operação 3: Submissão de Pergunta (Público)

| Campo | Descrição |
|-------|-----------|
| **Operação** | Participante submete pergunta no evento |
| **Endpoint** | `POST /api/v1/events/[eventId]/questions` |
| **Dados Coletados** | Nome, contato (WhatsApp), e-mail (opcional), texto, IP, flag anônimo, consentimento LGPD, timestamp |
| **Finalidade** | Exibição em Q&A ao vivo, moderação, comunicação com autor (se não-anônimo) |
| **Base Legal** | Consentimento (LGPD Art. 7, I) — flag `lgpdAccepted` obrigatório |
| **Categoria de Titular** | Participante/Público |
| **Retenção** | Texto + PII: até 90 dias após encerramento do evento; IP: 30 dias (ambos cleanup automático) |
| **Operador** | Supabase (PostgreSQL), Vercel (logs) |
| **Segurança** | Rate limit (10/hora/IP), validação Zod, RLS, anonimização automática |

---

### Operação 4: Inscrição em Evento

| Campo | Descrição |
|-------|-----------|
| **Operação** | Participante inscreve-se no evento |
| **Endpoint** | `POST /api/v1/events/[id]/registrations` |
| **Dados Coletados** | Nome, e-mail, telefone (opcional), CPF/documento (opcional), consentimento LGPD, timestamp |
| **Finalidade** | Credenciamento, controle de presença, comunicações do evento, sorteio |
| **Base Legal** | Consentimento (LGPD Art. 7, I) — flag `lgpdAccepted` obrigatório |
| **Categoria de Titular** | Participante/Inscrito |
| **Retenção** | Até fim do evento + 90 dias (cleanup anonimiza após 30 dias) |
| **Operador** | Supabase (PostgreSQL) |
| **Segurança** | Rate limit por IP, validação Zod, RLS (owner vê inscrições do evento), anonimização automática |

---

### Operação 5: Check-in e Logística

| Campo | Descrição |
|-------|-----------|
| **Operação** | Mediador/admin marca presença e entrega de kit |
| **Endpoint** | `PATCH /api/v1/events/[id]/registrations/[regId]` |
| **Dados Coletados** | Status checked_in, checked_in_at, kit_delivered, kit_delivered_at |
| **Finalidade** | Controle de presença, logística de kit |
| **Base Legal** | Contrato (execução) |
| **Categoria de Titular** | Participante/Inscrito |
| **Retenção** | Até fim do evento + 90 dias |
| **Operador** | Supabase (PostgreSQL) |
| **Segurança** | RLS (mediador/owner do evento), TLS |

---

### Operação 6: Sorteio de Participantes

| Campo | Descrição |
|-------|-----------|
| **Operação** | Owner/admin executa sorteio de inscritos |
| **Endpoint** | `POST /api/v1/events/[id]/draw` |
| **Dados Coletados** | IDs de registrations sorteadas, timestamp do sorteio, drawn_at |
| **Finalidade** | Seleção aleatória de ganhadores (conforme regras do evento) |
| **Base Legal** | Contrato (execução) |
| **Categoria de Titular** | Participante/Inscrito |
| **Retenção** | Indefinido (histórico de sorteios) |
| **Operador** | Supabase (PostgreSQL) |
| **Segurança** | RLS (owner do evento), CSPRNG (crypto.randomBytes), TLS |

---

### Operação 7: Pagamento (Stripe)

| Campo | Descrição |
|-------|-----------|
| **Operação** | Owner faz checkout de evento pago |
| **Endpoint** | `POST /api/v1/stripe/checkout`, Webhook `/api/webhooks/stripe` |
| **Dados Coletados** | ID sessão Stripe, ID intenção de pagamento, status, valor, moeda, timestamp |
| **Finalidade** | Processamento de pagamento, validação de acesso a evento pago |
| **Base Legal** | Contrato (execução de contrato) |
| **Categoria de Titular** | Owner |
| **Retenção** | Conforme legislação fiscal (7 anos) |
| **Operador** | Stripe (processor de pagamento) |
| **Segurança** | Stripe PCI-DSS certified, TLS, webhook signed com STRIPE_WEBHOOK_SECRET, timingSafeEqual |

---

### Operação 8: Autenticação Mediador/Admin

| Campo | Descrição |
|-------|-----------|
| **Operação** | Mediador/admin faz login |
| **Endpoint** | `POST /api/auth/[...nextauth]` (Credentials provider) |
| **Dados Coletados** | E-mail, senha (hash verificado, nunca armazenado em forma legível), IP, timestamp, user-agent |
| **Finalidade** | Autenticação, auditoria de acesso |
| **Base Legal** | Contrato (execução) |
| **Categoria de Titular** | Mediador/Admin |
| **Retenção** | IP: 30 dias (logs); credenciais: até mudança/cancelamento de conta |
| **Operador** | Supabase (PostgreSQL), Vercel (logs) |
| **Segurança** | Rate limit (5 tentativas/email/15min), bcrypt hash, TLS, timingSafeEqual, NextAuth JWT |

---

### Operação 9: Atribuição de Mediador

| Campo | Descrição |
|-------|-----------|
| **Operação** | Owner/admin atribui mediador a um evento |
| **Endpoint** | `POST /api/v1/events/[id]/mediators` |
| **Dados Coletados** | user_id, event_id, timestamp de atribuição |
| **Finalidade** | Autorização de acesso — mediar perguntas daquele evento |
| **Base Legal** | Contrato (execução) — relação de trabalho/mandato |
| **Categoria de Titular** | Mediador |
| **Retenção** | Enquanto atribuição ativa (pode ser removida) |
| **Operador** | Supabase (PostgreSQL) |
| **Segurança** | RLS (owner do evento), TLS |

---

### Operação 10: Moderação de Pergunta

| Campo | Descrição |
|-------|-----------|
| **Operação** | Mediador/admin modera pergunta (marca como "próxima", "respondida", "oculta") |
| **Endpoint** | `PATCH /api/v1/questions/[id]` |
| **Dados Coletados** | question_id, ação, moderador_id, timestamp |
| **Finalidade** | Gestão de fila de perguntas, moderação de conteúdo |
| **Base Legal** | Contrato (execução) — moderação conforme termo LGPD do evento |
| **Categoria de Titular** | Participante (indireto) |
| **Retenção** | Indefinido (histórico de moderação) |
| **Operador** | Supabase (PostgreSQL) |
| **Segurança** | RLS (mediador atribuído ao evento), TLS, broadcast Realtime validado com Zod |

---

### Operação 11: Exportação de Dados (LGPD Art. 18)

| Campo | Descrição |
|-------|-----------|
| **Operação** | Owner exporta todos seus dados PII |
| **Endpoint** | `GET /api/v1/me/data-export` |
| **Dados Coletados** | Todos (usuário, eventos, participantes, inscrições, perguntas, pagamentos) |
| **Finalidade** | Direito de acesso e portabilidade (LGPD Art. 18) |
| **Base Legal** | Lei (LGPD Art. 18) |
| **Categoria de Titular** | Owner |
| **Retenção** | Download temporário; dados originais conforme retenção normal |
| **Operador** | Supabase (PostgreSQL) |
| **Segurança** | Autenticação NextAuth, RLS (acesso apenas aos próprios dados), TLS |

---

### Operação 12: Anonimização (Direito ao Esquecimento — LGPD Art. 18)

| Campo | Descrição |
|-------|-----------|
| **Operação** | Owner solicita exclusão de conta e anonimização de dados |
| **Endpoint** | `DELETE /api/v1/me/data` |
| **Dados Anonimizados** | Nome → "Conta Removida", e-mail → "removed_<id>@voz.app", dados de inscrição/participante → "Anônimo", IP → null |
| **Finalidade** | Direito ao esquecimento (LGPD Art. 18, VIII) |
| **Base Legal** | Lei (LGPD Art. 18) |
| **Categoria de Titular** | Owner |
| **Retenção** | Pós-anonimização | Registros anonimizados preservados; pagamentos mantidos (obrigação fiscal) |
| **Operador** | Supabase (PostgreSQL) |
| **Segurança** | Autenticação NextAuth, RLS, anonimização irreversível |

---

### Operação 13: Cleanup Automático LGPD (Cron)

| Campo | Descrição |
|-------|-----------|
| **Operação** | Limpeza automática diária de dados com retenção expirada |
| **Endpoint** | `GET /api/v1/internal/cleanup` (Vercel Cron) |
| **Dados Processados** | Perguntas/inscrições com >30 dias — anula IP e anonimiza se configurado |
| **Finalidade** | Conformidade LGPD, minimização de dados, keep-alive do banco |
| **Base Legal** | Lei (LGPD Art. 8, VI — limpeza automática) |
| **Categoria de Titular** | Participante/Inscrito |
| **Retenção** | Pós-limpeza | IP mantido <30 dias; anonimização mantém integridade referencial |
| **Operador** | Supabase (PostgreSQL) |
| **Segurança** | Protegido por Bearer token CRON_SECRET (timingSafeEqual), TLS, logs sanitizados |

---

### Operação 14: Gerenciamento de Plataforma (Admin/Superadmin)

| Campo | Descrição |
|-------|-----------|
| **Operação** | Admin/superadmin acessam stats, listas de usuários, histórico de pagamentos |
| **Endpoints** | `/api/v1/plataforma/*` |
| **Dados Coletados** | IDs de usuários, IDs de eventos, valores de pagamento, datas |
| **Finalidade** | Administração de plataforma, auditoria, relatórios |
| **Base Legal** | Contrato (execução) — relação de trabalho |
| **Categoria de Titular** | Owner/Admin |
| **Retenção** | Conforme retenção dos dados originais |
| **Operador** | Supabase (PostgreSQL) |
| **Segurança** | RLS (superadmin bypassa, admin vê dados globais), autenticação NextAuth |

---

## Resumo de Retenção

| Dado | Retenção Padrão | Limpeza/Anonimização |
|-----|-----------------|----------------------|
| Usuário (owner) | Indefinido | Ao deletar conta (anonimiza) |
| Evento | Indefinido | Owner pode deletar |
| Pergunta (texto) | Indefinido | Criador pode deletar |
| Pergunta (IP) | 30 dias | Cleanup automático anula |
| Inscrição (dados pessoais) | 90 dias pós-evento | Cleanup automático anonimiza após 30 dias |
| Check-in / Kit Delivery | 90 dias pós-evento | Cleanup automático anonimiza após 30 dias |
| Pagamento (Stripe) | 7 anos | Obrigação fiscal |
| Logs (Vercel) | 7 dias | Vercel descarta automaticamente |

---

## Transferência Internacional

| Operador | Localização | Safeguard |
|----------|-------------|-----------|
| Supabase | EUA (us-east-1) | Criptografia em repouso, TLS, RLS |
| Stripe | EUA/UE | SCC (Standard Contractual Clauses), PCI-DSS |
| Vercel | São Paulo (gru1) | TLS, logs sanitizados |
| GitHub | EUA | Microsoft GDPR/LGPD compliance |

---

## Revisões Planejadas

- **Próxima revisão:** [DATA + 6 MESES]
- **Responsável:** [Team de Privacy]

---

**AVISO FINAL:** Este é um rascunho técnico. Requer validação por especialista jurídico em LGPD.
