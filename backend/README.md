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

### 2. Dependências, migrate e seed

```bash
bundle install
cp config/database.local.yml.example config/database.local.yml
bin/rails db:create
bin/rails db:migrate
bin/rails db:seed
```

O arquivo `config/database.local.yml` fica fora do Git. Use as mesmas credenciais do `docker-compose.yml`: usuário e senha `postgres`, host `127.0.0.1`, porta `5432`.

O seed lê `../amostras_exemplo.csv`, importa só as linhas válidas via `CsvSampleImporter` e é **idempotente** (se já existir amostra, não reimporta).

### 3. Servidor

```bash
bin/rails server
```

API em `http://localhost:3000`. Health check: `GET /up`.

## Testes

```bash
bin/rails test
```

Só integração:

```bash
bin/rails test test/integration/
```

## Estrutura da API

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
| Import CSV | `POST /samples/import_preview`, `POST /samples/import` |
| Lixeira | `GET /trash`, `POST /trash/:type/:id/restore` |

Ao criar uma caixa (`rows` × `columns`), o sistema gera as posições automaticamente (A1, A2, …).

### Soft-delete (lixeira)

`DELETE` em sala/freezer/gaveta/caixa **não apaga de vez**: marca `discarded_at` e cascateia na hierarquia abaixo. Listagens ativas usam registros `kept`. Restore via `POST /trash/:type/:id/restore` (`type`: `room`, `freezer`, `drawer`, `box`).

### Mover / renomear

- Renomear: `PATCH` com `name`.
- Mover: `PATCH` com o FK do pai (`room_id` no freezer, `freezer_id` na gaveta, `drawer_id` na caixa).

### Escopo no first-fit

`POST /samples/suggest` e `POST /samples` aceitam opcionalmente:

```json
{ "room_id": 1, "freezer_id": 2, "drawer_id": 3, "box_id": 4 }
```

Usa o filtro mais específico presente. Sem escopo, first-fit global (só hierarquia `kept`).

### Importação CSV

1. `POST /samples/import_preview` com `{ "csv": "<conteudo>" }` ou `{ "rows": [...] }` → classifica `ok` / `rejected` (erro ou duplicata de código).
2. `POST /samples/import` com `{ "rows": [ ... linhas ok ... ] }` → cria hierarquia faltante e amostras nas posições **explícitas** do arquivo.

## Fluxo rápido com curl

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

Com escopo (só dentro da sala 1):

```bash
curl -X POST http://localhost:3000/samples/suggest \
  -H "Content-Type: application/json" \
  -d '{"room_id":1}'
```

Cadastrar amostra:

```bash
curl -X POST http://localhost:3000/samples \
  -H "Content-Type: application/json" \
  -d '{"sample":{"codigo_amostra":"AMO-001","paciente_nome":"Maria Silva","material":"Sangue"}}'
```

Buscar:

```bash
curl "http://localhost:3000/samples/search?q=maria"
```

Grade da caixa:

```bash
curl http://localhost:3000/boxes/1/positions
```

Lixeira:

```bash
curl http://localhost:3000/trash
curl -X POST http://localhost:3000/trash/room/1/restore
```

## Regras importantes

- **First-fit:** caixas `kept` mais antigas primeiro (`created_at`); dentro da caixa, A1, A2, …; usuário não informa a célula.
- **Caixa cheia:** `422` com `"abrir nova caixa"`.
- **Código único:** `codigo_amostra` não se repete.
- **Payload de localização:** respostas de amostra/sugestão incluem caminho, ids e `linhas`/`colunas` da caixa.
- **CSV ≠ first-fit:** import histórico grava na posição do arquivo; cadastro manual usa o allocator.

## Respostas de erro

| Situação | HTTP | Exemplo |
|---|---|---|
| Recurso não encontrado | 404 | `{ "error": "Not found" }` |
| Validação / caixa cheia | 422 | `{ "errors": ... }` ou `{ "error": "abrir nova caixa" }` |
| Parâmetro faltando | 422 | `{ "error": "..." }` |

## Pastas principais

```
app/models/            entidades, SoftDeletable
app/models/concerns/   soft_deletable.rb
app/services/          PositionGenerator, SampleAllocator, CsvSampleImporter, HierarchyTrash
app/controllers/       endpoints JSON (incl. TrashController)
db/seeds.rb            importa amostras_exemplo.csv
test/                  Minitest (models, services, integração)
config/routes.rb       mapa de URLs
```
