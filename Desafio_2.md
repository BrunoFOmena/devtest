# Desafio 2: Estratégia de CI/CD

**Projeto:** Gestão de microtubos de DNA (NeoGenomica)  
**Autor:** Bruno Feliciano de Omena  
**Escopo:** não é implementação obrigatória de pipelines agora; é o plano que faria sentido para **este** monorepo e para um **time pequeno de laboratório**.

---

## O que o desafio pede

Descrever o fluxo de CI/CD abordando:

1. Estratégia de branches (e por quê)
2. Fluxo até produção e ambientes
3. Pull Requests (exige? quem revisa? aprovação?)
4. Testes automatizados (quais; gates ou não)
5. Pipeline (build / testes / deploy) e como o deploy é disparado

---

## 1. Contexto e princípios


| Realidade do projeto                                                               | Implicação                                                               |
| ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Monorepo (`backend/` Rails + `frontend/` React/Vite)                               | Um pipeline com **jobs separados por pasta**, não dois repositórios      |
| Domínio crítico: first-fit, CSV, unicidade de código/posição                       | Testes de **backend** são gate duro: regressão custa amostra mal alocada |
| Já existe `backend/bin/ci` (RuboCop, bundler-audit, Brakeman, `rails test`, seeds) | A CI remota deve **reutilizar** esse script                              |
| Já existe Kamal + `Dockerfile` no backend                                          | Deploy da API alinhado ao Rails 8, sem K8s                               |
| Frontend: lint, build (TypeScript) e Vitest (`npm test`)                           | Gate: lint + build + testes unitários FE                                 |
| Time pequeno (lab)                                                                 | Fluxo simples, poucas branches longas, staging barato                    |


**Princípios:**

1. **Proteger produção:** nada sobe sem CI verde e revisão mínima.
2. **Baixa cerimônia:** GitFlow completo é excesso para 1 a 3 pessoas.
3. **Fail fast:** lint/segurança antes dos testes mais lentos.
4. **Deploy consciente:** staging automático; produção com aprovação humana (estoque real).
5. **Segredos fora do git:** `RAILS_MASTER_KEY`, DB, tokens só em secrets do CI/Kamal.

---

## 2. Estratégia de branches

### Escolha: GitHub Flow leve (com `develop`)

```
feature/* ──PR──► develop ──PR──► main (produção)
                      │
                      └── deploy automático → staging
```


| Branch               | Papel                                                        |
| -------------------- | ------------------------------------------------------------ |
| `feature/*`, `fix/*` | Trabalho isolado (ex.: `feature/csv-import`)                 |
| `develop`            | Integração contínua; destino do dia a dia; pedido do desafio |
| `main`               | Sempre deployável; o que está (ou esteve) em produção        |


### Por que não GitFlow clássico?

Branches `release/*` permanentes aumentam processo sem ganho claro com time pequeno.

**Hotfix (incidente em prod):**  
`main` → `hotfix/*` → PR para `main` (CI + deploy aprovado) → merge/cherry-pick de volta em `develop`, para a correção não se perder na integração.

### Por que não trunk-based puro agora?

Trunk-based (só `main` + features curtas) é excelente, mas:

- o desafio entrega em `develop`;
- `develop` + `main` deixa claro **integração** vs **produção**.

**Evolução:** quando o time estabilizar, colapsar para trunk-based (`main` + feature flags).

### Branch protection

Em `develop` e `main`:

- PR obrigatório  
- CI verde obrigatória  
- ≥ 1 aprovação (solo no MVP: checklist + CI, documentado)  
- Sem push direto  
- Em `main`: preferir review de “dono de produção”

---

## 3. Ambientes e fluxo até produção


| Ambiente     | Para quê                                   | Como sobe                                   |
| ------------ | ------------------------------------------ | ------------------------------------------- |
| **Local**    | Dev diário                                 | Docker Compose (Postgres) + Rails + Vite    |
| **CI**       | Validar PR                                 | Efêmero (GitHub Actions + Postgres)         |
| **Staging**  | Homologar com dados fictícios/anonimizados | Deploy **automático** ao merge em `develop` |
| **Produção** | Bancada real                               | Deploy **aprovado** a partir de `main`      |


### Do commit à produção

```
1. Commit em feature/*
2. PR → develop  →  CI (backend + frontend)
3. Review + merge develop
4. CD automático → staging (Kamal)
5. Homologação no lab (mapa, first-fit, CSV…)
6. PR develop → main  →  CI de novo (tudo)
7. Aprovação humana + deploy produção
```

**Por que 2 PRs?**  
O primeiro promove código para **integração/staging**. O segundo promove o que já foi homologado para **produção**. São 2 CIs (revalidar o pacote) e 2 CDs com disparos diferentes (staging auto × prod com freio).

**Justificativa:** staging ≠ prod: o lab valida sem bagunçar estoque real. Produção com olho humano porque alocar microtubo errado tem custo físico. Mesma imagem/artefato (tag por SHA) em staging e prod: “o que testamos é o que sobe”.

---

## 4. Pull Requests


| Pergunta     | Decisão                               | Por quê                                 |
| ------------ | ------------------------------------- | --------------------------------------- |
| Exige PR?    | **Sim** (`develop` e `main`)          | Histórico, review, CI como status check |
| Quem revisa? | Outro dev; se solo, checklist + CI    | Review curto já pega bugs de domínio    |
| Aprovação?   | ≥ 1; em `main` preferir segundo olhar | Produção merece cuidado extra           |
| Squash?      | Preferir squash `feature → develop`   | Histórico limpo na integração           |
| Tamanho      | PRs pequenos (uma regra por vez)      | First-fit, CSV, mapa: fáceis de revisar |


---

## 5. Testes e o que é gate

### Backend (obrigatório para merge): reutilizar `bin/ci`


| Etapa            | Ferramenta                                       | Gate?   |
| ---------------- | ------------------------------------------------ | ------- |
| Setup            | `bin/setup --skip-server`                        | sim     |
| Estilo           | RuboCop                                          | sim     |
| Segurança gems   | bundler-audit                                    | sim     |
| Segurança código | Brakeman                                         | sim     |
| Testes           | `bin/rails test` (models, services, integration) | **sim** |
| Seeds            | `db:seed:replant` em test                        | sim     |


Tipos: unit/service (`SampleAllocator`, CSV…), integração HTTP + Postgres.  
**E2E browser:** não no MVP do pipeline (custo/flaky); evolução com Playwright.

### Frontend (obrigatório para merge)


| Etapa     | Comando                        | Gate?   |
| --------- | ------------------------------ | ------- |
| Lint      | `npm run lint`                 | sim     |
| Build     | `npm run build` (`tsc` + Vite) | **sim** |
| Unitários | `npm test` (Vitest)            | **sim** |


### O que **não** bloqueia no início

- % de cobertura mínima rígida (fácil virar teatro)  
- E2E visual completo  
- Deploy automático para produção

---

## 6. Pipeline CI (GitHub Actions)

Ferramenta: **GitHub Actions** (zero infra a manter, integra com PR/branch protection, Postgres como service).

### Jobs em paralelo

1. `backend-ci`: Ruby + Postgres 16 + cache Bundler + `cd backend && bin/ci`
2. `frontend-ci`: Node LTS + cache npm + `npm ci && npm run lint && npm run build && npm test`

**Paths filter:** em PR para `develop`, posso filtrar por pasta (`backend/` ou `frontend/`) para economizar CI; em PR para `main`, rodo **tudo**, pois produção não sobe pela metade.

---

## 7. Pipeline CD (deploy)


| Camada   | Escolha                                               | Por quê                                  |
| -------- | ----------------------------------------------------- | ---------------------------------------- |
| API      | **Kamal** + Docker (já no repo)                       | Rails 8; sem Kubernetes no dia 1         |
| Frontend | Build Vite (`dist/`) no **Nginx** do mesmo host Kamal | Simples para lab; CDN depois se precisar |
| Banco    | Postgres gerenciado (ou accessory Kamal) + backups    | Dados de amostras são o ativo crítico    |
| Segredos | GitHub Environments + secrets Kamal / OIDC            | Nada de chave no Git                     |



| Evento             | Ação                                                     |
| ------------------ | -------------------------------------------------------- |
| Merge em `develop` | CD **automático** → staging                              |
| Merge em `main`    | Deploy prod com `environment: production` **+ approval** |
| Rollback           | `kamal rollback` (imagem anterior, tag por SHA)          |


**Migrações:** no release do deploy; preferir migrations expansíveis; nunca `db:drop` em staging/prod compartilhado.

**Produção não é 100% automática no dia 1:** schema + estoque real; um clique após olhar staging é barato. Com smoke estável (healthcheck + “criar amostra”), dá para afrouxar depois.

---

## 8. Segurança e boas práticas

- Secrets só no CI/Kamal (`RAILS_MASTER_KEY`, DB, registry)  
- `bundler-audit` + Brakeman no gate  
- Imagens tagueadas por **SHA** do commit  
- Staging com dados **anonimizados**  
- `VITE_API_URL` (e CORS) por ambiente no build do front  
- Healthcheck HTTP (`/up`) após deploy

---

## 9. Roadmap


| Fase                 | O que adicionar                                                           |
| -------------------- | ------------------------------------------------------------------------- |
| **Agora (plano)**    | Actions + `bin/ci` + lint/build/test FE; branch protection; staging Kamal |
| **Curto prazo**      | Mais Vitest nos fluxos críticos; smoke pós-deploy                         |
| **Médio**            | Preview env por PR (opcional); monitors/alertas                           |
| **Com autenticação** | Secrets/OIDC e Environment `production` ainda mais críticos               |
| **Time maior**       | Avaliar trunk-based + feature flags; CD auto em prod com canário          |


---

*Alinhado ao monorepo atual (Rails 8 API, React/Vite, Postgres,* `bin/ci`*, Kamal, Vitest) e ao segundo desafio do processo seletivo NeoGenomica.*