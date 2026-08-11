# Neogenômica: Gestão de microtubos de DNA

## O problema

Num laboratório genômico, milhares de microtubos de DNA ficam guardados em freezers, gavetas e caixas com posições como A1, B2, C3. Hoje isso vive em planilha.

Esta aplicação web full stack substitui a planilha por um sistema que sabe onde cada amostra está e sugere automaticamente onde guardar a próxima.

A hierarquia física do laboratório vira software:

```
Sala → Freezer → Gaveta → Caixa → Posição → Amostra
```

Ao cadastrar uma caixa, o sistema gera a grade inteira (8×12, 10×10, 4×4 — o tamanho que for). Ao cadastrar uma amostra, o algoritmo first-fit percorre as caixas mais antigas, linha a linha, e aloca na primeira vaga livre. Se tudo estiver cheio, avisa: **abrir nova caixa**.

### O que a aplicação entrega

**Interface (React)**

- **Estrutura física:** criar, renomear, mover e excluir salas, freezers, gavetas e caixas; navegar em colunas com alinhamento de árvore genealógica; buscar amostra e destacar o caminho; mapa visual da grade.
- **Nova amostra:** formulário → modal de posição automática (caminho + mapa) ou edição de escopo; confirmação se a concentração ficar vazia; alerta se o código já existir.
- **Tabela:** filtros por localização e concentração; **Mostrar X resultados** (5, 15, 25, 35, 50) com paginação; ver ficha e excluir amostra.
- **Importar CSV:** preview (ok / erro / duplicata / ID já no sistema) e importação a partir de `amostras_exemplo.csv`.
- **Identidade visual:** sidebar navy, acento teal e tipografia DM Sans.

**API (Rails)**

CRUD hierárquico, sugestão e criação de amostras (first-fit), exclusão de amostra, busca, grade da caixa, importação CSV e validações.

---

## Documentação

Este README cobre visão geral e como subir o monorepo. O detalhe de cada camada está nos guias abaixo:

| Documento | Conteúdo |
|---|---|
| **[backend/README.md](backend/README.md)** | API Rails: arquitetura, models/services, first-fit, rotas, CSV, curl, erros, testes (Minitest), `bin/ci` |
| **[frontend/README.md](frontend/README.md)** | UI React: telas e fluxos, camada `api/`, componentes, identidade visual, Vitest, decisões de UX |
| **[Desafio_2.md](Desafio_2.md)** | Estratégia de CI/CD (branches, PRs, testes, ambientes, deploy com Kamal) |
| [openapi.yaml](openapi.yaml) | Contrato base da API (referência) |

Comece pelo README da pasta em que for trabalhar (`backend/` ou `frontend/`).

---

## Stack

| Camada   | Tecnologia                               |
| -------- | ---------------------------------------- |
| Backend  | Ruby on Rails 8 (API-only)               |
| Banco    | PostgreSQL 16 (Docker)                   |
| Frontend | React + Vite + TypeScript + Tailwind CSS |
| Testes   | Minitest (backend) · Vitest (frontend)   |

---

## Como rodar localmente

Pré-requisitos: Docker e Docker Compose, Ruby 4.0.6 com Bundler, Node.js 20+ com npm.

```bash
git clone https://github.com/BrunoFOmena/devtest.git
cd devtest
git checkout develop
```

### 1. Banco

```bash
docker compose up -d
```

PostgreSQL na porta `5432` (usuário e senha: `postgres`).

### 2. API

```bash
cd backend
bundle install
cp config/database.local.yml.example config/database.local.yml
bin/rails db:create
bin/rails db:migrate
bin/rails db:seed
bin/rails server
```

- API: [http://localhost:3000](http://localhost:3000)
- Health: [http://localhost:3000/up](http://localhost:3000/up)

O `db:seed` importa as linhas válidas de [`amostras_exemplo.csv`](amostras_exemplo.csv) (idempotente: se já houver amostras, não reimporta).

Passo a passo e opções avançadas: **[backend/README.md](backend/README.md)**.

### 3. Frontend

Em outro terminal:

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Abra [http://localhost:5173](http://localhost:5173).

```
VITE_API_URL=http://localhost:3000
```

Telas, scripts e testes da UI: **[frontend/README.md](frontend/README.md)**.

### 4. Testes

```bash
# Backend
cd backend && bin/rails test

# Frontend
cd frontend && npm test
```

---

## Fluxo de uso na bancada

1. (Opcional) Rode `db:seed` ou importe o CSV em **Importar CSV**.
2. Em **Estrutura física**, cadastre ou ajuste sala → freezer → gaveta → caixa. A árvore abre o próximo nível alinhado ao item clicado.
3. Em **Amostras**, preencha código, paciente e material e clique em OK.
4. Aceite a posição sugerida (first-fit, com mapa) ou escolha **Não** para restringir o escopo.
5. Confirme; a posição é alocada pelo sistema (o usuário não digita A1/B2).
6. Encontre amostras pela busca na estrutura, pela **Tabela**, ou pelo mapa da caixa.
7. Exclua uma amostra pela tabela ou pela ficha (libera a posição). Exclusões da hierarquia, neste MVP, são **definitivas**.

Concentração em branco pede confirmação. Importação CSV usa posição **explícita** do arquivo (histórico), diferente do first-fit do cadastro manual.

---

## Estrutura do repositório

```
devtest/
├── backend/              Rails API + testes + seeds  → ver backend/README.md
├── frontend/             React + Vite + Tailwind     → ver frontend/README.md
├── Desafio_2.md          estratégia de CI/CD (etapa 2)
├── docker-compose.yml    PostgreSQL
├── openapi.yaml          contrato da API (base)
└── amostras_exemplo.csv  dados de exemplo (seed / import)
```

Desenvolvido por Bruno Feliciano de Omena como resposta ao desafio técnico NeoGenomica 2026. Proposta de CI/CD: **[Desafio_2.md](Desafio_2.md)**.
