# Neogenômica: Gestão de microtubos de DNA

Bruno Feliciano de Omena · Desafio técnico · branch `develop`

## O problema

Num laboratório genômico, milhares de microtubos de DNA ficam guardados em freezers, gavetas e caixas com posições como A1, B2, C3. Hoje isso vive em planilha: difícil de buscar, fácil de errar, impossível de escalar.

## A proposta

Esta aplicação web full stack substitui a planilha por um sistema que sabe onde cada amostra está e sugere automaticamente onde guardar a próxima.

A hierarquia física do laboratório vira software:

```
Sala → Freezer → Gaveta → Caixa → Posição → Amostra
```

Ao cadastrar uma caixa, o sistema gera a grade inteira (8×12, 10×10, 4×4 — o tamanho que for). Ao cadastrar uma amostra, o algoritmo first-fit percorre as caixas mais antigas, linha a linha, e aloca na primeira vaga livre. Se tudo estiver cheio, avisa: **abrir nova caixa**.

## O que a aplicação entrega

**Interface (React)**

- **Estrutura física:** criar, renomear, mover e enviar para a lixeira salas, freezers, gavetas e caixas; navegar em colunas; buscar amostra e destacar o caminho até a célula; mapa visual da grade (livres / ocupadas / sem concentração).
- **Nova amostra:** formulário com preview da posição; opção de aceitar a sugestão automática ou restringir o first-fit a uma sala/freezer/gaveta/caixa; confirmação se a concentração ficar vazia.
- **Tabela:** listagem com filtros por localização e concentração vazia.
- **Importar CSV:** preview (ok / erro / duplicata), ajuste e importação usando `amostras_exemplo.csv` como referência.
- **Lixeira:** listar e restaurar itens da hierarquia descartados (soft-delete).

**API (Rails)**

CRUD hierárquico, sugestão e criação de amostras (first-fit com escopo opcional), busca, grade da caixa, importação CSV, lixeira/restore e validações. Detalhes em [`backend/README.md`](backend/README.md). Contrato base em [`openapi.yaml`](openapi.yaml) (pode estar parcialmente atrás das rotas mais novas — trash/CSV).

## Stack

| Camada   | Tecnologia                               |
| -------- | ---------------------------------------- |
| Backend  | Ruby on Rails 8 (API-only)               |
| Banco    | PostgreSQL 16 (Docker)                   |
| Frontend | React + Vite + TypeScript + Tailwind CSS |
| Testes   | Minitest (backend)                       |

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

O `db:seed` importa as linhas válidas de [`amostras_exemplo.csv`](amostras_exemplo.csv) (idempotente: se já houver amostras, não reimporta). Linhas com código duplicado ou inválidas do CSV de exemplo são ignoradas no seed.

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

### 4. Testes do backend

```bash
cd backend
bin/rails test
```

Mais detalhes: [`backend/README.md`](backend/README.md) e [`frontend/README.md`](frontend/README.md).

## Fluxo de uso na bancada

1. (Opcional) Rode `db:seed` ou importe o CSV pela tela **Importar CSV**.
2. Em **Estrutura física**, cadastre ou ajuste sala → freezer → gaveta → caixa (linhas × colunas).
3. Em **Nova amostra**, preencha código, paciente e material.
4. Aceite a posição sugerida (first-fit) ou restrinja o escopo e escolha outra localização.
5. Confirme; a posição é alocada pelo sistema (o usuário não digita A1/B2).
6. Encontre amostras pela busca na estrutura, pela **Tabela**, ou abrindo o mapa da caixa.
7. Exclusões da hierarquia vão para a **Lixeira** e podem ser restauradas.

Se a concentração ficar em branco, a interface pede confirmação. Amostras sem concentração aparecem destacadas na tabela e no mapa.

## Regras de negócio

- **First-fit:** caixas mais antigas primeiro (`created_at`); dentro da caixa, A1, A2, …, B1.
- O usuário **não escolhe a célula**; o sistema aloca. Pode opcionalmente **restringir o escopo** (sala/freezer/gaveta/caixa) antes da alocação.
- Hierarquia descartada (lixeira) não entra na alocação.
- `codigo_amostra` é único no sistema.
- Concentração pode ficar vazia, com confirmação explícita na interface.
- Importação CSV usa posição **explícita** do arquivo (dado histórico da planilha), diferente do first-fit do cadastro manual.

## Estrutura do repositório

```
devtest/
├── backend/              Rails API + testes + seeds
├── frontend/             React + Vite + Tailwind
├── docker-compose.yml    PostgreSQL
├── openapi.yaml          contrato da API (base)
└── amostras_exemplo.csv  dados de exemplo (seed / import)
```

Desenvolvido por Bruno Feliciano de Omena como resposta ao desafio técnico NeoGenomica 2026.
