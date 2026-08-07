# Neogenômica: Gestão de microtubos de DNA

Bruno Feliciano de Omena · Desafio técnico · branch `develop`

## O problema

Num laboratório genômico, milhares de microtubos de DNA ficam guardados em freezers, gavetas e caixas com posições como A1, B2, C3. Hoje isso vive em planilha: difícil de buscar, fácil de errar, impossível de escalar.

## A proposta

Esta aplicação web full stack substitui a planilha por um sistema que sabe onde cada amostra está e sugere automaticamente onde guardar a próxima, sem o técnico escolher caixa nem posição manualmente.

A hierarquia física do laboratório vira software:

```
Sala → Freezer → Gaveta → Caixa → Posição → Amostra
```

Ao cadastrar uma caixa, o sistema gera a grade inteira (8×12, 4×4, o tamanho que for). Ao cadastrar uma amostra, o algoritmo first-fit percorre as caixas mais antigas, linha a linha, e aloca na primeira vaga livre. Se tudo estiver cheio, avisa: abrir nova caixa.

## O que a aplicação entrega

Pela interface React, a bancada cadastra salas, freezers, gavetas e caixas; navega a estrutura física com breadcrumbs; cadastra amostras com preview da posição antes de confirmar; busca por código ou paciente e vê a localização completa; consulta o mapa visual da grade de cada caixa (células livres, ocupadas e amostras sem concentração destacadas).

Por baixo, a API Rails expõe CRUD hierárquico, sugestão de posição, busca, grade da caixa e regras de validação. O contrato está documentado em `[openapi.yaml](openapi.yaml)`. Detalhes da API em `[backend/README.md](backend/README.md)`.

## Stack


| Camada   | Tecnologia                               |
| -------- | ---------------------------------------- |
| Backend  | Ruby on Rails 8 (API-only)               |
| Banco    | PostgreSQL 16 (Docker)                   |
| Frontend | React + Vite + TypeScript + Tailwind CSS |
| Testes   | Minitest                                 |


## Como rodar localmente

Pré-requisitos: Docker e Docker Compose, Ruby 4.0.6 com Bundler, Node.js 20+ com npm.

Clone o repositório e use a branch de entrega:

```bash
git clone https://github.com/BrunoFOmena/devtest.git
cd devtest
git checkout develop
```

Suba o banco na raiz do projeto:

```bash
docker compose up -d
```

PostgreSQL fica na porta 5432 (usuário e senha: `postgres`).

Inicie a API:

```bash
cd backend
bundle install
cp config/database.local.yml.example config/database.local.yml
bin/rails db:create
bin/rails db:migrate
bin/rails server
```

A API responde em [http://localhost:3000](http://localhost:3000). Health check: [http://localhost:3000/up](http://localhost:3000/up)

Em outro terminal, inicie o frontend:

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Abra [http://localhost:5173](http://localhost:5173). O `.env` aponta para a API:

```
VITE_API_URL=http://localhost:3000
```

Para rodar os testes do backend:

```bash
cd backend
bin/rails test
```

## Fluxo de uso na bancada

1. Cadastre a estrutura: sala → freezer → gaveta → caixa (informando linhas × colunas).
2. Vá em Nova amostra, preencha código, paciente e material.
3. O sistema mostra onde a amostra será guardada.
4. Confirme o cadastro; a posição é alocada automaticamente.
5. Use a busca para encontrar amostras por código ou paciente, com caminho completo até a célula.
6. Abra o mapa da caixa para ver a grade ocupada e livre.

Se a concentração ficar em branco, a interface pede confirmação antes de gravar. Amostras sem concentração aparecem destacadas na listagem e no mapa.

## Regras de negócio

- First-fit global: caixas mais antigas primeiro; dentro da caixa, A1, A2, …, B1.
- O usuário não escolhe posição; o sistema aloca sozinho.
- `codigo_amostra` é único no sistema.
- Concentração pode ficar vazia, com confirmação explícita na interface.

## Estrutura do repositório

```
devtest/
├── backend/           Rails API + testes
├── frontend/          React + Vite + Tailwind
├── docker-compose.yml
├── openapi.yaml       contrato da API
└── amostras_exemplo.csv
```

Desenvolvido por Bruno Feliciano de Omena como resposta ao desafio técnico NeoGenomica 2026.