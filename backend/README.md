# Backend — Rails API

API JSON para controle de microtubos de DNA. Organiza onde cada amostra está guardada e sugere automaticamente a próxima posição livre (**first-fit**).

```
Sala → Freezer → Gaveta → Caixa → Posição → Amostra
```

O frontend React consome esta API; detalhes de UI em [`../frontend/README.md`](../frontend/README.md). Visão geral do monorepo em [`../README.md`](../README.md).

---

## Pré-requisitos

- Ruby **4.0.6** (ver `.ruby-version`)
- Bundler
- Docker e Docker Compose (PostgreSQL)

---

## Subir o projeto

### 1. Banco de dados (PostgreSQL)

Na **raiz do repositório** (pasta acima de `backend/`):

```bash
docker compose up -d
```

PostgreSQL na porta `5432` (usuário e senha: `postgres`).

### 2. Dependências, migrate e seed

```bash
bundle install
cp config/database.local.yml.example config/database.local.yml
bin/rails db:create
bin/rails db:migrate
bin/rails db:seed
```

O arquivo `config/database.local.yml` fica **fora do Git**. Use as mesmas credenciais do `docker-compose.yml`: host `127.0.0.1`, porta `5432`, usuário/senha `postgres`.

O seed lê `../amostras_exemplo.csv`, importa só as linhas válidas via `CsvSampleImporter` e é **idempotente**: se já existir alguma amostra, não reimporta.

### 3. Servidor

```bash
bin/rails server
```

- API: [http://localhost:3000](http://localhost:3000)
- Health: `GET /up`

### 4. CI local (opcional)

```bash
bin/ci
```

Roda o pipeline local definido em `config/ci.rb` (estilo, auditoria de gems, Brakeman, testes, seed em ambiente de test).

---

## Arquitetura

Camadas:

```
HTTP (routes)
    ↓
Controllers  → params, status HTTP, JSON
    ↓
Services     → regras de negócio (alocar, gerar grade, CSV)
    ↓
Models       → validações, associações, Active Record
    ↓
PostgreSQL
```

**Princípio:** controllers magros; first-fit, geração de posições e import ficam em `app/services/`.

### Models e relações

| Model | Papel |
|---|---|
| `Room` | Sala / local |
| `Freezer` | Freezer dentro da sala |
| `Drawer` | Gaveta / rack |
| `Box` | Caixa com `rows` × `columns`; ao criar, gera posições |
| `Position` | Célula (`row` letra + `column` número), ex.: A1 |
| `Sample` | Microtubo; `belongs_to :position`; `codigo_amostra` único |

Por que **Position é tabela própria** (e não só cálculo a partir do tamanho da caixa):

1. First-fit consulta vagas reais (`where.missing(:sample)`).
2. Import CSV aponta para uma célula explícita.
3. O mapa da API distingue livre / ocupada.
4. Unicidade `(box_id, row, column)` e amostra 1:1 com posição no banco.

Campos relevantes da amostra: `codigo_amostra`, `paciente_nome`, `material`, `concentracao_ng_ul` (pode ser `null`), `exame`, `observacao`, `position_id`.

### Services

| Service | Responsabilidade |
|---|---|
| `PositionGenerator` | Após criar `Box`, gera A1… conforme `rows` × `columns` (idempotente) |
| `SampleAllocator` | First-fit: caixas por `created_at` asc; posições `order(:row, :column)`; escopo opcional |
| `CsvSampleImporter` | Preview + import do CSV (posição explícita, **não** usa first-fit) |
| `HierarchyTrash` | Soft-delete em cascata — **fora do MVP** (código preparado) |

### First-fit (`SampleAllocator`)

1. Caixas ativas ordenadas por `created_at` (mais antigas primeiro).
2. Em cada caixa, primeira posição sem amostra na ordem A1, A2, … B1…
3. Sem vaga → `nil` → API responde **422** `"abrir nova caixa"`.

Escopo opcional (o mais específico ganha): `box_id` > `drawer_id` > `freezer_id` > `room_id`.

Usado em:

- `POST /samples/suggest` — só calcula (não grava).
- `POST /samples` — **recalcula** e grava (não confia cegamente no preview da UI).

### Payload de localização

Respostas de sugestão / amostra incluem, entre outros: nomes da hierarquia, `label` (ex.: `A5`), `path` legível, ids (`room_id`…), `linhas` / `colunas` da caixa. O frontend monta caminho e mapa sem várias idas extras à API.

---

## Rotas da API

Definidas em `config/routes.rb`.

| Recurso | Rotas principais |
|---|---|
| Salas | `GET/POST /rooms`, `GET/PATCH/DELETE /rooms/:id` |
| Freezers | sob `/rooms/:room_id/freezers` |
| Gavetas | sob `/freezers/:freezer_id/drawers` |
| Caixas | sob `/drawers/:drawer_id/boxes` |
| Posições | `GET /boxes/:box_id/positions` |
| Amostras | `GET /samples`, `POST /samples`, `DELETE /samples/:id`, `POST /samples/suggest`, `GET /samples/search?q=` |
| Import CSV | `POST /samples/import_preview`, `POST /samples/import` |

### Exclusão (MVP)

- **Hierarquia** (`DELETE` sala/freezer/gaveta/caixa): **definitivo** (`destroy!`), com cascata (`dependent: :destroy` — inclui posições e amostras filhas).
- **Amostra** (`DELETE /samples/:id`): remove só o microtubo e **libera a posição**.

### Mover / renomear

- Renomear: `PATCH` com `name`.
- Mover: `PATCH` com o FK do pai (`room_id`, `freezer_id` ou `drawer_id`).

### Escopo no first-fit (body JSON)

```json
{ "room_id": 1, "freezer_id": 2, "drawer_id": 3, "box_id": 4 }
```

### Importação CSV

1. **Preview** — `{ "csv": "..." }` ou `{ "rows": [...] }` → classifica:
   - `ok` — pode importar
   - `error` — problema estrutural
   - `duplicate` — mesmo código **no arquivo**
   - `exists` — código **já no banco** (`ID da amostra já está presente no sistema: …`)
2. **Import** — `{ "rows": [ ... linhas ok ... ] }` em **transação**: cria hierarquia faltante e amostras nas posições **explícitas** do CSV.

Aliases de cabeçalho PT/EN são aceitos (`sala`/`room`, `gaveta`/`drawer`, etc.).

### Lixeira — fora do MVP

Soft-delete + restore preparados, mas **desativados** na entrega:

- `SoftDeletable`, `HierarchyTrash`, `TrashController`
- Rotas comentadas: `GET /trash`, `POST /trash/:type/:id/restore`
- Controllers usam `destroy!`; linha de `discard!` comentada ao lado

O scope `kept` ainda existe (o allocator filtra por ele); sem discard ativo, equivale a todos os registros.

Contrato base (referência): [`../openapi.yaml`](../openapi.yaml).

---

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

Sugerir (não grava):

```bash
curl -X POST http://localhost:3000/samples/suggest
```

Com escopo:

```bash
curl -X POST http://localhost:3000/samples/suggest \
  -H "Content-Type: application/json" \
  -d '{"room_id":1}'
```

Cadastrar:

```bash
curl -X POST http://localhost:3000/samples \
  -H "Content-Type: application/json" \
  -d '{"sample":{"codigo_amostra":"AMO-001","paciente_nome":"Maria Silva","material":"Sangue"}}'
```

Excluir amostra / buscar / grade:

```bash
curl -X DELETE http://localhost:3000/samples/1
curl "http://localhost:3000/samples/search?q=maria"
curl http://localhost:3000/boxes/1/positions
```

---

## Regras importantes

- **First-fit:** caixas mais antigas primeiro; dentro da caixa, A1 → …; usuário **não** escolhe a célula.
- **Caixa cheia / sem vaga no escopo:** `422` com `"abrir nova caixa"`.
- **Código único:** índice unique em `codigo_amostra`.
- **CSV ≠ cadastro diário:** histórico usa posição do arquivo; cadastro usa o allocator.
- **N+1:** listagens usam `includes` da hierarquia (`position → box → drawer → freezer → room`).

## Respostas de erro

| Situação | HTTP | Exemplo |
|---|---|---|
| Não encontrado | 404 | `{ "error": "Not found" }` |
| Validação / caixa cheia | 422 | `{ "errors": ... }` ou `{ "error": "abrir nova caixa" }` |
| Parâmetro faltando | 422 | `{ "error": "..." }` |

---

## Testes

```bash
bin/rails test
bin/rails test test/integration/
bin/rails test test/services/
```

Cobertura principal:

- **Models** — validações e associações
- **Services** — `SampleAllocator`, `PositionGenerator`, `CsvSampleImporter`
- **Integração** — HTTP (CRUD, samples, CSV, fluxo e2e)

Helpers de domínio em `test/support` (ex.: `create_box`, `occupy`).

---

## Pastas principais

```
app/models/            Room, Freezer, Drawer, Box, Position, Sample
app/models/concerns/   soft_deletable.rb (futuro)
app/services/          PositionGenerator, SampleAllocator, CsvSampleImporter, HierarchyTrash
app/controllers/       endpoints JSON
config/routes.rb       mapa de URLs
config/ci.rb           passos do bin/ci
db/schema.rb           schema atual
db/seeds.rb            importa amostras_exemplo.csv
test/                  Minitest
bin/ci                 pipeline local
```

## Evolução possível (fora do MVP)

- Autenticação (writes protegidos)
- Limites de capacidade (máx. gavetas/freezer, caixas/gaveta)
- Reativar lixeira (soft-delete + restore)
- Lock de concorrência na alocação (`FOR UPDATE`)
- Paginação em `GET /samples` na API
