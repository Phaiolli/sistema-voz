# Aviso de Privacidade — voz. — [DRAFT]

**AVISO:** Este documento é um **rascunho técnico** preparado pelo time de desenvolvimento para revisão jurídica. Não constitui aconselhamento legal. Deve ser validado por especialista em LGPD antes de publicação.

---

## 1. Identidade do Controlador

**Controlador de Dados:** [Nome da Organização / Empresa]  
**Responsável:** [E-mail de contato de privacidade]  
**Endereço:** [Endereço físico]

---

## 2. Dados Coletados

### 2.1 Usuários (Owners/Organizadores)

Coletados ao registrar (`POST /api/auth/register`):
- **Nome completo** — para identificação e comunicação
- **E-mail** — para login, confirmações, comunicações
- **Senha** — para autenticação (hash bcrypt, nunca em texto plano)

Coletados ao criar evento:
- **Nome do evento, local, endereço, data/hora** — configuração do evento
- **Tema e configurações customizadas** — personalização visual/operacional

Coletados ao usar Stripe:
- **ID da sessão Stripe** — para identificar checkout e transação
- **Status do pagamento** — para rastrear acesso a eventos pagos

### 2.2 Participantes (Inscritos no Evento)

Coletados ao submeter pergunta (`POST /api/v1/events/[eventId]/questions`):
- **Nome completo** — para exibição pública (pode ser anônimo)
- **Contato (WhatsApp, telefone)** — para comunicação direto
- **E-mail** — opcional, para contato futuro
- **Texto da pergunta** — conteúdo enviado
- **Endereço IP** — logging de requisição (retenção: 30 dias)
- **Consentimento LGPD** — aceite de termos

Coletados ao inscrever-se no evento (`POST /api/v1/events/[id]/registrations`):
- **Nome completo** — para credenciamento/presença
- **E-mail** — para comunicações do evento
- **Telefone** — opcional, para contato/recados
- **CPF/Documento** — opcional, conforme configuração do evento
- **Consentimento LGPD** — aceite de termos

Coletados ao fazer check-in:
- **Data/hora do check-in** — para controle de presença
- **Status de kit delivery** — para logística de distribuição

### 2.3 Mediadores/Admin

- **Nome, e-mail, role (mediador/admin)** — para autenticação e autorização
- **Atribuições de eventos** — para rastrear quais eventos cada mediador modera

---

## 3. Finalidades do Tratamento

| Dado | Finalidade | Base Legal |
|------|-----------|-----------|
| Nome, e-mail (owner) | Login, comunicações de plataforma, faturas | Contrato (execução) |
| Senha | Autenticação | Contrato (execução) |
| Dados de evento | Gerenciamento do evento, exibição pública | Contrato (execução) |
| Nome, contato, IP (pergunta) | Exibição em Q&A ao vivo, moderação | Consentimento (LGPD) |
| Nome, e-mail (inscrição) | Credenciamento, comunicações | Consentimento (LGPD) |
| CPF (inscrição) | Quando requerido pelo evento (controle, sorteio) | Consentimento (LGPD) |
| Check-in, kit delivery | Controle de presença, logística | Consentimento (LGPD) |
| IP (login, requisição) | Segurança (detecção de anomalias, rate limiting) | Interesse legítimo |

---

## 4. Retenção de Dados

| Dado | Prazo | Observações |
|------|-------|-----------|
| Usuário (owner) | Indefinido (ou até cancelamento) | Mantido para histórico de conta |
| Evento (metadados) | Indefinido | Organizer pode deletar manualmente |
| Pergunta (texto + PII do autor) | Até 90 dias após encerramento do evento | Cleanup LGPD anonimiza automaticamente |
| Pergunta (IP do autor) | 30 dias | Anulado automaticamente via cleanup (antes do texto) |
| Inscrição (nome, email, telefone, CPF) | Até 90 dias após encerramento do evento | Cleanup LGPD anonimiza automaticamente |
| Inscrição (IP, se coletado) | 30 dias | Anulado automaticamente via cleanup |
| Pagamento (Stripe) | Conforme retenção Stripe (7 anos) | Obrigação fiscal/contábil |
| Log de erro | 7 dias | Automaticamente descartado |

---

## 5. Operadores de Dados (Terceiros)

Dados são compartilhados com:

### 5.1 Supabase (PostgreSQL + Realtime)
- **O quê:** Todos os dados de usuário, evento, pergunta, inscrição
- **Onde:** Data centers EUA (us-east-1)
- **Contrato:** [SLA Supabase; LGPD compliance via criptografia em repouso + TLS em transito]
- **Transferência internacional:** Supabase opera servidores nos EUA; implícito ao usar plataforma. Safeguard: criptografia em repouso, TLS, acesso restrito por RLS.

### 5.2 Stripe (Processamento de Pagamento)
- **O quê:** ID sessão checkout, status do pagamento, e-mail, país
- **Onde:** Data centers EUA/UE (conforme local de pagamento)
- **Contrato:** [Stripe GDPR/LGPD Data Processing Agreement]
- **Transferência internacional:** Transferência de dados de pagamento aos EUA. Safeguard: Stripe Privacy Shield certified (sucedido por Standard Contractual Clauses).

### 5.3 Vercel (Deploy/Hosting)
- **O quê:** Logs de deploy, requisições HTTP (IP, user-agent, timestamp)
- **Onde:** São Paulo (gru1)
- **Contrato:** [Vercel Terms of Service]

### 5.4 GitHub (Controle de Versão)
- **O quê:** Código-fonte, issues, PRs, logs de CI/CD
- **Onde:** Servidores GitHub/Microsoft (EUA)
- **Contrato:** [GitHub Terms; Microsoft GDPR/LGPD compliance]

---

## 6. Direitos do Titular

Conforme LGPD Art. 18, o titular tem direito a:

### 6.1 Acesso
- `GET /api/v1/me/data` — retorna JSON com todos os dados PII do usuário
- `GET /api/v1/me/data-export` — download em formato portável (JSON)

### 6.2 Correção
- `PATCH /api/v1/me/profile` — atualizar nome, e-mail (owner)

### 6.3 Eliminação (Direito ao Esquecimento)
- `DELETE /api/v1/me/data` — anonimiza todos os dados do owner
  - Nome → "Conta Removida", e-mail → "removed_<id>@voz.app"
  - Inscrições/participantes anonimizados
  - Perguntas anonimizadas
  - Pagamentos mantidos (obrigação fiscal)

### 6.4 Portabilidade
- `GET /api/v1/me/data-export` — JSON estruturado com todos os dados

### 6.5 Oposição
- A plataforma não realiza processamento de marketing ou automatizado com consequências; portanto, oposição a processamento específico deve ser solicitada por e-mail para análise manual.

---

## 7. Canal de Exercício de Direitos

Titular pode exercer direitos contactando:

**E-mail:** [privacidade@voz.app]  
**Formulário:** [URL do formulário de LGPD]  
**Prazo de resposta:** 15 dias (conforme LGPD Art. 18, § 1)

---

## 8. Segurança

Medidas implementadas:
- **Criptografia em repouso:** Supabase managed encryption (AWS KMS)
- **Criptografia em transito:** TLS 1.2+ em todas as conexões (HSTS header)
- **Autenticação:** NextAuth JWT com `AUTH_SECRET` (gerado com `openssl rand -base64 32`)
- **Autorização:** Row-Level Security (RLS) habilitado — usuários veem apenas seus próprios eventos
- **Hash de senha:** bcrypt com salt aleatório
- **Rate limiting:** Proteção contra força bruta (5 tentativas/email em 15 min)
- **Logs:** Sanitizados — nunca contêm PII ou payloads sensíveis

---

## 9. Cookies e Rastreamento

- **NextAuth Session:** JWT armazenado em cookie HttpOnly (seguro contra XSS)
- **Tema:** localStorage (preferência dark/light local, não rastreamento)
- **Analytics:** Não implementado nesta versão
- **Terceiros:** Stripe pode usar cookies próprios; consultar [Stripe Privacy Policy](https://stripe.com/privacy)

---

## 10. Contato do Controlador

**Para questões de privacidade:**  
[privacidade@voz.app]

**Para denúncias de violação (LGPD Art. 32):**  
[Autoridade Nacional de Proteção de Dados - ANPD](https://www.gov.br/cidadania/pt-br/acesso-a-informacao/lgpd)

---

## 11. Revisões e Atualizações

Este aviso de privacidade pode ser atualizado sem aviso prévio. A data da última atualização aparecerá no rodapé da página.

**Última atualização:** [DATA]  
**Próxima revisão programada:** [DATA + 6 MESES]

---

**AVISO FINAL:** Este é um rascunho técnico. Requer validação por especialista jurídico em LGPD antes de ser publicado como aviso oficial.
