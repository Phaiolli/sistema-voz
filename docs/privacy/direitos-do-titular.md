# Direitos do Titular — voz. — [DRAFT]

**AVISO:** Este documento é um **rascunho técnico** preparado pelo time de desenvolvimento para revisão jurídica. Não constitui aconselhamento legal. Deve ser validado por especialista em LGPD antes de divulgação pública.

---

## 1. Introdução

Conforme a **Lei Geral de Proteção de Dados (LGPD) — Art. 18**, toda pessoa natural tem direito a:

1. **Acesso** — aos dados pessoais processados
2. **Correção** — de dados incompletos ou inexatos
3. **Eliminação** — dos dados (direito ao esquecimento) sob certas condições
4. **Portabilidade** — dos dados em formato estruturado
5. **Oposição** — ao processamento sob circunstâncias específicas
6. **Anonimização** — dos dados pessoais

A plataforma **voz.** implementa os mecanismos abaixo para operacionalizar estes direitos.

---

## 2. Direito de Acesso (LGPD Art. 18, I)

### 2.1 O que você pode acessar

Todos os dados pessoais que você forneceu e que foram coletados pela plataforma, inclusive:
- Seu nome, e-mail, telefone
- Perguntas que você enviou
- Inscrições em eventos
- Histórico de check-in
- Dados de pagamento (se houver)
- Logs de acesso à sua conta

### 2.2 Como Exercer (Owner/Organizador)

**Na plataforma:**
1. Acesse `/dashboard/conta`
2. Clique em "Exportar meus dados"
3. Um arquivo JSON será baixado com todos os seus dados

**Via API (programaticamente):**
```bash
curl -X GET https://voz.app/api/v1/me/data-export \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

Resposta (JSON):
```json
{
  "exportedAt": "2026-06-26T10:30:00.000Z",
  "user": {
    "id": "uuid...",
    "name": "João Silva",
    "email": "joao@example.com",
    "role": "owner",
    "plan": "paid",
    "createdAt": "2026-01-15T08:00:00.000Z"
  },
  "events": [
    {
      "id": "uuid...",
      "name": "Conferência 2026",
      "slug": "conf-2026",
      "organizerId": "uuid...",
      ...
    }
  ],
  "participants": [
    {
      "id": "uuid...",
      "eventId": "uuid...",
      "name": "Maria Costa",
      "contact": "(11) 98765-4321",
      ...
    }
  ],
  "registrations": [
    {
      "id": "uuid...",
      "eventId": "uuid...",
      "name": "Pedro Oliveira",
      "email": "pedro@example.com",
      "phone": "(11) 91234-5678",
      "checkedIn": true,
      "checkedInAt": "2026-06-20T09:00:00.000Z",
      ...
    }
  ]
}
```

### 2.3 Prazo de Resposta

Conforme LGPD Art. 18, § 1: **até 15 dias corridos** (contados do recebimento do pedido).

A plataforma exporta os dados **imediatamente** (< 1 segundo). Se houver atraso técnico, notificação será enviada.

---

## 2.4 Como Exercer (Participante/Inscrito)

**Caso 1: Você quer dados da sua pergunta**
- Atualmente, a plataforma não expõe um endpoint direto para participante exportar. 
- **Solução:** Contacte o organizador do evento (admin/owner) para solicitar seus dados. O organizador pode exportar todos os participantes/perguntas e compartilhar sua cópia.
- **Escalação:** Se o organizador não responder em 5 dias úteis, contacte [privacidade@voz.app].

**Caso 2: Você quer dados da sua inscrição**
- Mesma estratégia acima (organizador pode exportar lista de inscritos).

**Via canal privacidade (e-mail):**
```
Para: privacidade@voz.app
Assunto: [LGPD] Solicito acesso aos meus dados pessoais
Corpo:
  Evento: [nome do evento / slug]
  Seu nome na inscrição: [nome]
  Seu e-mail: [email]
  
  Solicito acesso a todos os dados pessoais que enviei
  (pergunta, inscrição, check-in, etc.).
```

Resposta garantida em **até 15 dias**.

---

## 3. Direito de Correção (LGPD Art. 18, II)

### 3.1 O que você pode corrigir

- **Nome** na sua conta (owner)
- **E-mail** na sua conta (owner)
- Observação: perguntas e inscrições já enviadas **não podem ser alteradas** (imutabilidade de registro). Para corrigir, cancele (delete) e envie novamente.

### 3.2 Como Exercer (Owner)

**Na plataforma:**
1. Vá para `/dashboard/conta` → "Meu perfil"
2. Clique em "Editar"
3. Atualize nome e/ou e-mail
4. Clique em "Salvar"

A alteração é imediata.

### 3.3 Como Exercer (Participante/Inscrito)

Atualmente, a plataforma não permite que participantes corrijam inscrições diretamente.

**Solução:** 
1. Solicite ao organizador (mediador/admin do evento) para deletar e re-inscrever você
2. Ou contacte [privacidade@voz.app] com a inscrição incorreta — será re-processada manualmente

---

## 4. Direito de Eliminação — Direito ao Esquecimento (LGPD Art. 18, III)

### 4.1 O que você pode deletar

Todo os seus dados pessoais e:
- Para owners: nome, e-mail, dados de eventos, pagamentos
- Para participantes: nome, telefone, e-mail, dados de inscrição, check-in, perguntas

### 4.2 Importante: Anonimização vs. Exclusão Física

A plataforma utiliza **anonimização** (não exclusão física). Isso significa:
- Seus dados não são apagados do banco de dados
- São **substituídos por valores genéricos** (ex: nome → "Anônimo", e-mail → "removed_<id>@voz.app")
- Isso preserva integridade referencial (histórico de eventos, check-ins, etc.)
- Seus dados **não são recuperáveis** (anonimização é irreversível)

**Exceção:** Dados de pagamento (Stripe) são mantidos conforme obrigação fiscal (7 anos).

### 4.3 Como Exercer (Owner)

**Na plataforma:**
1. Vá para `/dashboard/conta` → "Privacidade"
2. Clique em "Deletar minha conta e anonimizar meus dados"
3. **Confirme na tela de aviso** (ação irreversível)
4. Todos seus dados serão anonimizados imediatamente

**Via API:**
```bash
curl -X DELETE https://voz.app/api/v1/me/data \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

Resposta: 204 No Content (sucesso)

### 4.4 Como Exercer (Participante/Inscrito)

**Você quer deletar sua inscrição:**
1. Acesse o link de cancelamento (enviado por e-mail ao inscrever-se)
2. Ou contacte o organizador do evento
3. Ou envie e-mail para [privacidade@voz.app]

**Você quer deletar sua pergunta:**
1. Contacte o mediador/admin do evento
2. Ou envie e-mail para [privacidade@voz.app]

Depois de deletado, você receberá confirmação.

---

## 5. Direito de Portabilidade (LGPD Art. 18, IV)

### 5.1 O que você pode portar

Todos seus dados pessoais em **formato estruturado, aberto e legível por máquina** (JSON).

### 5.2 Como Exercer (Owner)

Mesmo processo que "Direito de Acesso" (seção 2.2):

```bash
curl -X GET https://voz.app/api/v1/me/data-export \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

O arquivo JSON pode ser:
- Importado em outra plataforma (se suportado)
- Processado programaticamente
- Armazenado para backup pessoal

### 5.3 Como Exercer (Participante)

Contacte o organizador ou envie e-mail para [privacidade@voz.app].

---

## 6. Direito de Oposição (LGPD Art. 18, V)

### 6.1 O que você pode se opor

Você pode se opor ao processamento de seus dados quando:
- **Não há consentimento explícito** — já coberto (checkbox LGPD obrigatório)
- **Processamento não é proporcional** — ex: coleta de CPF quando não necessário para o evento
- **Interesse legítimo questionável** — ex: usar seus dados para marketing

### 6.2 Como Exercer

Envie e-mail para [privacidade@voz.app] com:
- Descrição da oposição
- Evento/situação específica
- Sua fundamentação

A plataforma analisará e responderá em **até 15 dias**.

---

## 7. Direito de Anonimização (LGPD Art. 18, VI)

### 7.1 O Que É Anonimização

Anonimização é a **alteração irreversível** de dados para que você não possa ser identificado. Exemplo:
- Nome: "João Silva" → "Anônimo"
- E-mail: "joao@example.com" → "removed_abc123@voz.app"
- Telefone: "(11) 98765-4321" → NULL
- IP: "203.0.113.45" → NULL

### 7.2 Quando Acontece Automaticamente

A plataforma anonimiza automaticamente:
1. **Endereços IP** — 30 dias após coleta (cleanup diário)
2. **Dados de inscrição** — 30 dias após fim do evento (cleanup diário)
3. **Dados de pergunta** — 30 dias após submissão (cleanup diário)

### 7.3 Como Solicitar Manualmente

Enviando `DELETE /api/v1/me/data` (owner) ou contactando [privacidade@voz.app] (participante).

---

## 8. Canal de Exercício de Direitos

### 8.1 Self-Service (Plataforma)

| Direito | Endpoint | URL |
|--------|----------|-----|
| Acesso | `GET /api/v1/me/data-export` | `/dashboard/conta` → "Exportar dados" |
| Correção | `PATCH /api/v1/me/profile` | `/dashboard/conta` → "Editar perfil" |
| Eliminação | `DELETE /api/v1/me/data` | `/dashboard/conta` → "Deletar conta" |
| Anonimização | (automático diário) | — |

### 8.2 Mediado pelo Organizador

Para participantes/inscritos, a plataforma oferece fluxo **mediado pelo organizador**:

```
Participante
    ↓
Contacta organizador do evento
    ↓
Organizador processa (deleta inscrição / pergunta)
    ↓
Participante recebe confirmação
```

**Exemplo:**
- Participante: "Quero deletar minha inscrição"
- Organizador: Clica em "Deletar" na lista de inscritos
- Sistema: Anonimiza dados do participante
- Participante: Recebe e-mail confirmando deleção

### 8.3 Via E-mail/Formulário

**E-mail:**
```
Para: privacidade@voz.app
Assunto: [LGPD] [Acesso | Correção | Eliminação | Portabilidade | Oposição]
Corpo: Descrição do pedido + dados de identificação
```

**Prazo:** Resposta em até **15 dias corridos** (conforme LGPD Art. 18, § 1)

### 8.4 Dados para Identificação

Ao contactar por e-mail, forneça:
- **Nome completo**
- **E-mail** usado na plataforma
- **CPF** (se inscrição exigiu)
- **Evento** (nome ou slug)
- **Data aproximada** de atividade na plataforma

---

## 9. Fluxo Passo-a-Passo: Exemplos

### Exemplo 1: Owner quer Acessar Seus Dados

```
1. Acesse https://voz.app/dashboard/conta
2. Clique em "Exportar meus dados"
3. Navegador abre dialog "Exportar"
4. Clique em "Download JSON"
5. Arquivo "voz-export-<data>.json" salva no computador
6. Abre arquivo em editor de texto ou importa em ferramenta
```

### Exemplo 2: Owner quer Deletar Sua Conta

```
1. Acesse https://voz.app/dashboard/conta
2. Rolar para "Privacidade"
3. Clique em "Deletar minha conta"
4. Dialog de confirmação: "Esta ação é irreversível. Seus dados serão anonimizados."
5. Clique em "Confirmar exclusão"
6. Conta deletada; redirecionado para homepage
7. E-mail confirmando anonimização enviado
```

### Exemplo 3: Participante quer Cancelar Inscrição

```
Opção A (Self-service — se disponível):
  1. Acesso ao link "Cancelar" enviado por e-mail de inscrição
  2. Confirmação de cancelamento
  3. E-mail de confirmação

Opção B (Organizador):
  1. Organizador acessa admin/eventos/[id]/registrations
  2. Encontra participante na lista
  3. Clica em "Deletar"
  4. Confirmação
  5. Participante anonimizado

Opção C (Privacidade):
  1. Enviar e-mail para privacidade@voz.app
  2. Incluir: evento, seu nome, e-mail
  3. Resposta em até 15 dias com confirmação
```

### Exemplo 4: Participante quer Acessar Suas Perguntas/Inscrições

```
1. Enviar e-mail para privacidade@voz.app
   Assunto: Solicito acesso aos meus dados
   Corpo: Nome, e-mail, evento, período (ex: "Enviei pergunta em 20/06/2026")

2. Equipe de privacidade busca seus dados

3. Resposta em até 15 dias com:
   - JSON com suas perguntas
   - JSON com sua inscrição
   - Qualquer outro dado associado
```

---

## 10. Garantias

A plataforma garante:

- ✓ **Sigilo** — Dados acessados apenas para processar seu pedido
- ✓ **Gratuidade** — Nenhum custo para exercer direitos
- ✓ **Não-discriminação** — Você não será discriminado por solicitar direitos
- ✓ **Celeridade** — Resposta em até 15 dias (conforme lei)
- ✓ **Rastreabilidade** — Cada pedido registrado com data/hora
- ✓ **Segurança** — Dados transmitidos em TLS, armazenados criptografado

---

## 11. Privacidade das Comunicações

Todos os e-mails para [privacidade@voz.app] são:
- **Criptografados em repouso** (PGP, chave pública disponível em [URL])
- **Transportados em TLS**
- **Arquivados por 1 ano** (conforme exigência LGPD para contestações)
- **Não compartilhados** com terceiros sem consentimento

---

## 12. Denúncias

Se a plataforma **violar seus direitos LGPD**, você pode denunciar à:

**Autoridade Nacional de Proteção de Dados (ANPD)**
- Site: https://www.gov.br/cidadania/pt-br/acesso-a-informacao/lgpd
- E-mail: [contato ANPD]
- Telefone: [telefone ANPD]

A plataforma é obrigada por lei a cooperar com a ANPD em investigações.

---

## 13. Revisão Deste Documento

Este documento pode ser atualizado sem aviso prévio. Última versão sempre em:
[https://voz.app/privacy/direitos-do-titular.md]

**Próxima revisão:** [DATA + 6 MESES]

---

**AVISO FINAL:** Este é um rascunho técnico. Requer validação por especialista jurídico em LGPD antes de publicação pública. Até então, serve como **documento de intenção e operacionalização de direitos**.
