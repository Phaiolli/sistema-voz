# Pipeline Completo de Agentes

Execute o pipeline completo de agentes para a seguinte demanda:

**Demanda:** $ARGUMENTS

---

## Classificação de demanda e roteamento

Identifique o tipo da demanda e selecione o pipeline correto:

### UI / Frontend
**Sinais:** "tela", "página", "componente", "layout", "form", "tabela", "card", "modal", "sidebar", "topbar", "responsivo", "design", "interface", "estilo"; arquivos em `src/components/`, `src/app/**/page.*`, `src/features/**/components/`

**Pipeline:** GitHub → Architect → **Designer** → Coder → Reviewer → QA → Security → Docs → Reporter


### Backend / Server
**Sinais:** "API", "endpoint", "service", "repository", "schema", "migration", "job", "queue"

**Pipeline:** GitHub → Architect → Coder → Reviewer → QA → Security → Docs → Reporter

### Refactor (sem mudança comportamental)

**Pipeline:** GitHub → Architect → Coder → Reviewer → QA → Docs → Reporter


### Prompt Update (projetos AI/ML)
**Sinais:** modificação em `profiles/**/prompts/**`, label `prompt-update`

**Pipeline:** Bypass — apenas review humano + commit. Sem agentes automatizados.

### Misto
**Pipeline:** composição das categorias acima conforme impacto

---

## Instruções de Execução

Execute TODOS os agentes aplicáveis na ordem especificada. Para cada agente, assuma o papel descrito, execute a análise/ação e produza o output no formato definido. Só passe ao próximo após concluir o atual.

**1. 🎯 MAESTRO** — Execute em ordem:

a) **Classifique** a demanda (tipo, severidade) conforme as regras acima.

b) **Converta em critérios de sucesso testáveis** — Reescreva a demanda como
   resultados verificáveis antes de passar ao próximo agente. Exemplos:
   - "corrija o bug de login" → "usuário com credenciais válidas recebe JWT;
     credenciais inválidas retornam 401; teste existente X passa"
   - "melhore a performance da listagem" → "GET /items responde em <100ms
     para 10k registros medido com k6"
   - "adicione campo CPF" → "campo persiste no banco, retorna na API, valida
     formato 000.000.000-00, teste unitário passa"

c) **Liste suposições** — Se houver ambiguidade de alto risco, pergunte antes
   de rotear.

d) **Selecione o pipeline** e passe os critérios de sucesso como contexto para
   todos os agentes subsequentes.

**2. 🐙 GITHUB (Fase 1)** — Crie a issue com template padrão, defina branch name e labels. Use `gh` CLI.

**3. 📐 ARCHITECT** — Analise impacto arquitetural, valide padrões, proponha estrutura de implementação. Decida: approved / needs_changes / rejected.

**4. 🎨 DESIGNER** *(somente em demandas de UI)* — Leia o design system em `./design-system/` e produza briefing técnico para o Coder. Inclui: layout, componentes shadcn, tokens, estados, responsividade e checklist para o Reviewer.

**5. 💻 CODER** — Implemente seguindo estritamente o plano do ARCHITECT e (quando aplicável) o briefing do DESIGNER. Código tipado, limpo, com error handling.

**6. 🔍 REVIEWER** — Code review completo. Classifique issues como 🔴 BLOCKER / 🟡 WARNING / 🔵 SUGGESTION. Em PRs de UI, aplique também a checklist do design system. Se houver blockers, corrija antes de prosseguir.

**7. 🧪 QA** — Crie testes usando vitest. Garanta cobertura de happy paths, error paths e edge cases. Target: 80%.

**8. 🛡️ SECURITY** — Audit de segurança: XSS, injection, CSRF, IDOR, dados sensíveis, validação de inputs. Classifique por severidade.

**10. 📚 DOCS** — Documente no formato tsdoc: exports públicos, README/CHANGELOG, ADRs se necessário.

**11. 🐙 GITHUB (Fase 2)** — Commits semânticos (Conventional Commits), PR com template completo incluindo relatório de todos os agentes. Use `gh` CLI.

**12. 📊 REPORTER** — Relatório final consolidado com métricas, status de cada agente, débitos técnicos e próximos passos.

---

## Tabela de Agentes

| # | Agente | Função |
|---|--------|--------|
| 1 | 🎯 Maestro | Orquestra, classifica e roteia |
| 2 | 🐙 GitHub | Issues, branches, commits, PRs |
| 3 | 📐 Architect | Impacto e planejamento técnico |
| 4 | 🎨 Designer | Guardião do design system — briefing técnico para UI |
| 5 | 💻 Coder | Implementação |
| 6 | 🔍 Reviewer | Code review + checklist de stack |
| 7 | 🧪 QA | Testes (vitest) |
| 8 | 🛡️ Security | OWASP Top 10 + vulnerabilidades |
| 10 | 📚 Docs | tsdoc, README, CHANGELOG, ADRs |
| 11 | 🐙 GitHub | Commits semânticos e PR final |
| 12 | 📊 Reporter | Relatório final com métricas |

---

## Regras

- ❌ Nenhum agente aplicável pode ser pulado
- 🔄 Se qualquer agente rejeitar, volte ao agente relevante e corrija
- 📝 Mostre o output formatado de CADA agente antes de prosseguir
- ✅ Só considere completo quando TODOS aprovarem
- 📋 Relatório final incluído no PR description
