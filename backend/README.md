# Backend — Rails API

API JSON para controle de microtubos de DNA. Organiza onde cada amostra está guardada (Sala → Freezer → Gaveta → Caixa → Posição) e sugere automaticamente a próxima posição livre (first-fit).

## Pré-requisitos

- Ruby 4.0.6 (ver `.ruby-version`)
- Bundler
- Docker e Docker Compose

## Subir o projeto

### 1. Banco de dados (PostgreSQL)

Na **raiz do repositório** (pasta acima de `backend/`):

```bash
docker compose up -d
```

### 2. Dependências e configuração

Entre na pasta `backend`:

```bash
bundle install
cp config/database.local.yml.example config/database.local.yml
bin/rails db:create
bin/rails db:migrate
```

O arquivo `config/database.local.yml` fica fora do Git (credenciais locais). Use as mesmas do `docker-compose.yml`: usuário e senha `postgres`, host `127.0.0.1`, porta `5432`.

### 3. Servidor

```bash
bin/rails server
```

A API fica em `http://localhost:3000`.

Health check: `GET /up`

## Testes

```bash
bin/rails test
```

Só integração:

```bash
bin/rails test test/integration/
```

## Estrutura da API

A hierarquia física vira URLs aninhadas:

```
Sala → Freezer → Gaveta → Caixa → Posição → Amostra
```

| Recurso | Rotas principais |
|---|---|
| Salas | `GET/POST /rooms`, `GET/PATCH/DELETE /rooms/:id` |
| Freezers | `GET/POST /rooms/:room_id/freezers`, `GET/PATCH/DELETE /rooms/:room_id/freezers/:id` |
| Gavetas | `GET/POST /freezers/:freezer_id/drawers`, `GET/PATCH/DELETE /freezers/:freezer_id/drawers/:id` |
| Caixas | `GET/POST /drawers/:drawer_id/boxes`, `GET/PATCH/DELETE /drawers/:drawer_id/boxes/:id` |
| Posições | `GET /boxes/:box_id/positions` (grade vazia/ocupada) |
| Amostras | `GET /samples`, `POST /samples`, `POST /samples/suggest`, `GET /samples/search?q=` |

Ao criar uma caixa (`rows` × `columns`), o sistema gera as posições automaticamente (A1, A2, …).

## Fluxo rápido com curl

Crie a hierarquia na ordem (sala → freezer → gaveta → caixa):

```bash
curl -X POST http://localhost:3000/rooms \
  -H "Content-Type: application/json" \
  -d '{"room":{"name":"Sala 1"}}'

curl -X POST http://localhost:3000/rooms/1/freezers \
  -H "Content-Type: application/json" \
  -d '{"freezer":{"name":"Freezer A"}}'

curl -X POST http://localhost:3000/freezers/1/drawers \
  -H "Content-Type: application/json" \
  -d '{"drawer":{"name":"Gaveta 1"}}'

curl -X POST http://localhost:3000/drawers/1/boxes \
  -H "Content-Type: application/json" \
  -d '{"box":{"name":"Caixa 1","rows":8,"columns":12}}'
```

Sugerir posição (não grava):

```bash
curl -X POST http://localhost:3000/samples/suggest
```

Cadastrar amostra (posição escolhida pelo sistema):

```bash
curl -X POST http://localhost:3000/samples \
  -H "Content-Type: application/json" \
  -d '{"sample":{"codigo_amostra":"AMO-001","paciente_nome":"Maria Silva","material":"Sangue"}}'
```

Buscar por código ou paciente:

```bash
curl "http://localhost:3000/samples/search?q=maria"
```

Ver grade da caixa:

```bash
curl http://localhost:3000/boxes/1/positions
```

## Regras importantes

- **First-fit:** ao cadastrar amostra, o sistema escolhe a posição — o usuário não informa caixa nem célula.
- **Ordem:** caixas mais antigas primeiro (`created_at`); dentro da caixa, linha a linha (A1, A2, …).
- **Caixa cheia:** se não houver vaga, a API responde `422` com `"abrir nova caixa"`.
- **Código único:** `codigo_amostra` não pode se repetir.

## Respostas de erro

| Situação | HTTP | Exemplo |
|---|---|---|
| Recurso não encontrado | 404 | `{ "error": "Not found" }` |
| Validação / caixa cheia | 422 | `{ "errors": ... }` ou `{ "error": "abrir nova caixa" }` |
| Parâmetro faltando | 422 | `{ "error": "..." }` |

## Pastas principais

```
app/models/       entidades e validações
app/services/     PositionGenerator, SampleAllocator
app/controllers/  endpoints JSON
test/             Minitest (models, services, integração)
config/routes.rb  mapa de URLs
```
