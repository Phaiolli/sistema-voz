# 🔎 Full Project Audit — Todos os Agentes

Execute uma auditoria completa do projeto inteiro, rodando todos os agentes e retornando um relatório consolidado.

Escopo: $ARGUMENTS

Se nenhum escopo foi especificado, audite o projeto inteiro.

---

## Instruções

Você deve executar TODOS os agentes abaixo na ordem especificada, analisando o projeto como um todo (não uma demanda específica). O objetivo é gerar um raio-x completo do estado atual do projeto.

### 1. 🎯 MAESTRO — Mapeamento Geral
- Identifique a estrutura geral do projeto (pastas, módulos, camadas)
- Liste as tecnologias e dependências em uso
- Mapeie os módulos/features principais
- Identifique o que está completo vs em andamento vs pendente
- Classifique a maturidade geral: [inicial | em desenvolvimento | estável | produção]

### 2. 📐 ARCHITECT — Audit de Arquitetura
- Avalie a estrutura de pastas e organização de módulos
- Verifique aderência a SOLID, DRY, separação de responsabilidades
- Identifique acoplamentos problemáticos entre módulos
- Avalie o modelo de dados e relacionamentos
- Liste dependências desnecessárias ou redundantes
- Identifique débitos técnicos arquiteturais
- **Score:** Arquitetura [1-10]

### 3. 🔍 REVIEWER — Audit de Qualidade de Código
- Revise os módulos principais do projeto
- Identifique padrões de código inconsistentes
- Busque: código morto, imports não usados, debug statements esquecidos, TODO/FIXME sem issue
- Avalie nomes de variáveis, funções e componentes
- Identifique funções muito longas ou complexas
- Verifique tratamento de erros (try/catch, error boundaries)
- Avalie tipagem da linguagem (typescript) — uso de tipos genéricos vs específicos
- **Score:** Qualidade de Código [1-10]

### 4. 🧪 QA — Audit de Testes
- Verifique se existem testes no projeto
- Avalie a cobertura atual (quais módulos têm testes, quais não)
- Identifique os módulos críticos que PRECISAM de testes e não têm
- Verifique a qualidade dos testes existentes (se houver)
- Avalie: testes unitários, integração e E2E
- Liste os testes mais urgentes a serem criados
- **Score:** Cobertura de Testes [1-10]

### 5. 🛡️ SECURITY — Audit de Segurança
- Execute checklist OWASP Top 10 no projeto inteiro
- Verifique: autenticação, autorização, validação de inputs
- Busque: secrets hardcoded, dados sensíveis expostos, SQL/NoSQL injection
- Avalie: CORS, CSP, headers de segurança, rate limiting
- Verifique dependências com vulnerabilidades conhecidas (`npm audit` ou equivalente)
- Classifique cada vulnerabilidade: 🔴 CRITICAL / 🟠 HIGH / 🟡 MEDIUM / 🔵 LOW
- **Score:** Segurança [1-10]

### 6. 📚 DOCS — Audit de Documentação
- Verifique existência e qualidade do README.md
- Verifique se .env.example existe e está completo
- Avalie documentação de código no formato tsdoc em exports/funções públicas
- Verifique existência de CHANGELOG.md
- Avalie documentação de API (se aplicável)
- Identifique áreas sem documentação que precisam
- **Score:** Documentação [1-10]

### 7. 🐙 GITHUB — Audit de Repositório
- Verifique se existe .gitignore adequado
- Avalie o histórico de commits (seguem Conventional Commits?)
- Verifique se há branch protection
- Avalie se issues e PRs estão sendo usados
- Verifique se há CI/CD configurado
- Verifique templates de issue e PR
- **Score:** Práticas Git/GitHub [1-10]

---

## 📊 REPORTER — Relatório Final Consolidado

Após todos os agentes executarem, gere o relatório abaixo:

```
═══════════════════════════════════════════════════════════════
                   📊 FULL PROJECT AUDIT REPORT
═══════════════════════════════════════════════════════════════

📋 RESUMO EXECUTIVO
[3-5 frases sobre o estado geral do projeto]

═══════════════════════════════════════════════════════════════

📈 SCORECARD GERAL

  Arquitetura ........... [█████░░░░░] X/10
  Qualidade de Código ... [█████░░░░░] X/10
  Cobertura de Testes ... [█████░░░░░] X/10
  Segurança ............. [█████░░░░░] X/10
  Documentação .......... [█████░░░░░] X/10
  Práticas GitHub ....... [█████░░░░░] X/10
  ─────────────────────────────────────
  SCORE GERAL ........... [█████░░░░░] X/10

═══════════════════════════════════════════════════════════════

🔴 ISSUES CRÍTICAS (resolver imediatamente)
1. [descrição + localização + remediação]
2. ...

🟠 ISSUES IMPORTANTES (resolver em breve)
1. [descrição + localização + remediação]
2. ...

🟡 MELHORIAS RECOMENDADAS (próximas sprints)
1. [descrição + localização + remediação]
2. ...

🔵 SUGESTÕES (nice to have)
1. [descrição]
2. ...

═══════════════════════════════════════════════════════════════

📐 DETALHAMENTO: ARQUITETURA
[Análise completa do Architect]

🔍 DETALHAMENTO: QUALIDADE DE CÓDIGO
[Análise completa do Reviewer]

🧪 DETALHAMENTO: TESTES
[Análise completa do QA]

🛡️ DETALHAMENTO: SEGURANÇA
[Análise completa do Security]

📚 DETALHAMENTO: DOCUMENTAÇÃO
[Análise completa do Docs]

🐙 DETALHAMENTO: GITHUB
[Análise completa do GitHub]

═══════════════════════════════════════════════════════════════

📋 PLANO DE AÇÃO SUGERIDO

Fase 1 — Urgente (esta semana):
- [ ] [ação 1]
- [ ] [ação 2]

Fase 2 — Importante (próximas 2 semanas):
- [ ] [ação 1]
- [ ] [ação 2]

Fase 3 — Melhorias (próximo mês):
- [ ] [ação 1]
- [ ] [ação 2]

═══════════════════════════════════════════════════════════════

🏷️ ISSUES A CRIAR
[Lista de issues sugeridas com título e labels para registrar
os débitos técnicos encontrados no GitHub]

═══════════════════════════════════════════════════════════════
```

## Regras

- ❌ Nenhum agente pode ser pulado
- 📝 Cada agente DEVE produzir seu score e análise detalhada
- 🔢 O scorecard geral é a média dos scores individuais
- 📋 Issues críticas devem ter localização exata (arquivo + linha quando possível)
- 🎯 O plano de ação deve ser prático e priorizado
- 🏷️ Ao final, sugira as issues a serem criadas no GitHub com título e labels
