# Frontend — React + Vite + TypeScript

Interface da bancada para o inventário de microtubos de DNA. Consome a API Rails em `VITE_API_URL`.

A regra de alocação (**first-fit**) vive no backend; o frontend sugere, confirma, restringe escopo e visualiza — **não escolhe a célula A1/B2**. Detalhes da API em [`../backend/README.md`](../backend/README.md).

---

## Stack

| Peça | Uso |
|---|---|
| React 19 + TypeScript | UI tipada |
| Vite 8 | Dev server e build |
| Tailwind CSS 4 | Estilos / tema (`brand`, `navy`) |
| React Router 7 | Rotas SPA |
| Vitest + Testing Library | Testes unitários e de componente |
| Oxlint | Lint |
| DM Sans | Tipografia (identidade NeoGenomica) |

---

## Pré-requisitos

- Node.js **20+** e npm
- API backend rodando em `http://localhost:3000` (veja o README da raiz ou `backend/README.md`)

---

## Subir o projeto

```bash
npm install
cp .env.example .env
npm run dev
```

Abra [http://localhost:5173](http://localhost:5173).

Conteúdo típico do `.env`:

```
VITE_API_URL=http://localhost:3000
```

Só variáveis com prefixo `VITE_` são expostas ao código do browser.

---

## Scripts

| Comando | Uso |
|---|---|
| `npm run dev` | servidor de desenvolvimento |
| `npm run build` | TypeScript (`tsc -b`) + build Vite |
| `npm run test` | testes unitários (Vitest, uma vez) |
| `npm run test:watch` | testes em modo watch |
| `npm run preview` | preview do build |
| `npm run lint` | Oxlint |

---

## Identidade visual

Paleta em `src/index.css` (`@theme`):

| Token | Uso aproximado |
|---|---|
| `navy-900` (~`#0c1d2e`) | Sidebar, títulos |
| `brand-400` (~`#72b1b8`) | Item ativo, CTAs, destaques |
| Fundo `slate-50` | Área de conteúdo |

Componentes de marca: `Layout` (sidebar + `Outlet`), `PageHeader` (eyebrow + título + descrição opcional).

---

## Rotas e telas

Definidas em `src/App.tsx`. Home (`/`) redireciona para `/amostras/nova`.

| Rota | Página | Função |
|---|---|---|
| `/amostras/nova` | `NewSamplePage` | Cadastro + first-fit (modal com path e mapa) |
| `/estrutura` | `StructurePage` | Árvore hierárquica + busca + mapa da caixa |
| `/tabela` | `SamplesTablePage` | Lista, filtros, paginação, excluir amostra |
| `/importar-csv` | `ImportCsvPage` | Preview e import do CSV |

**Fora do MVP:** `/lixeira` e item de menu comentados (`TrashPage.tsx` permanece no código).

### Cadastro de amostra (`/amostras/nova`)

1. Preenche formulário (código, paciente, material; opcionais).
2. Concentração vazia → confirmação no browser.
3. **OK** → `POST /samples/suggest` → modal **Aceitar posição automática?**
4. Modal mostra `path` + `BoxMap` (`GET /boxes/:id/positions`, célula selecionada).
5. **Sim** → `POST /samples` (backend realoca).
6. **Não** → `LocationSuggestionModal` + `LocationTrail` para restringir escopo (sala→caixa), sem escolher célula.
7. Código duplicado (422) → `AlertModal`.

Helpers testáveis: `src/lib/newSampleUtils.ts` (`isDuplicateCodigo`, `scopeFromLocation`).

### Estrutura física (`/estrutura`)

- Colunas: Salas → Freezers → Gavetas → Caixas → Mapa.
- CRUD: `+`, renomear, mover, excluir (hierarquia = hard delete com confirmação).
- **Árvore genealógica:** a coluna filha desce até a altura do card selecionado (`useLayoutEffect` + `marginTop`), em vez de abrir sempre no topo.
- Busca: `GET /samples/search?q=` → destaca caminho e célula no mapa.
- Clique em posição ocupada → `SampleDetailModal` (ver / excluir amostra).

### Tabela (`/tabela`)

- `GET /samples` no mount.
- Filtros client-side: sala, freezer, gaveta, caixa, concentração vazia/preenchida (cascata limpa filhos).
- **Mostrar** 5 / 15 / 25 / 35 / 50 resultados + Anterior / Próxima.
- Ver ficha; excluir chama `DELETE /samples/:id`.

Helpers: `src/lib/samplesTableUtils.ts` (filtros, paginação, `isEmptyConcentration`).

### Importar CSV (`/importar-csv`)

1. Arquivo → `POST /samples/import_preview`.
2. Colunas OK / Rejeitados (cores: verde / vermelho / amarelo).
3. Status: `ok`, `error`, `duplicate` (no arquivo), `exists` (já no banco).
4. Commit → `POST /samples/import` só com linhas ok.

---

## Camada de API no frontend

| Arquivo | Papel |
|---|---|
| `src/api/client.ts` | `fetch` tipado, `ApiError`, `extractMessage`, trata 204 |
| `src/api/resources.ts` | Funções de negócio (`listRooms`, `suggestSample`, `createSample`, …) |
| `src/types/api.ts` | Tipos alinhados ao JSON da API (`Location`, `SampleWithLocation`, …) |

Páginas não montam URL na mão: chamam `resources.ts`. Erros 4xx/5xx viram `ApiError` com `status` + mensagem.

---

## Componentes principais

| Componente | Responsabilidade |
|---|---|
| `Layout` | Sidebar NeoGenomica + navegação |
| `PageHeader` | Título padrão das páginas |
| `BoxMap` | Grade livre / ocupada / selecionada / busca; sem concentração |
| `LocationTrail` | Trilha Sala→…→Caixa para escopo do first-fit |
| `AutoPositionChoiceModal` | Aceitar / rejeitar sugestão + mapa |
| `LocationSuggestionModal` | Fluxo manual de escopo |
| `SampleDetailModal` | Ficha da amostra + excluir |
| Modais Create / Rename / Move | CRUD da estrutura |
| `AlertModal` / `ConfirmModal` | Confirmações |

---

## Organização do código

```
src/
├── api/           client.ts, resources.ts (+ *.test.ts)
├── components/    Layout, PageHeader, BoxMap, modais…
├── lib/           helpers testáveis (tabela, cadastro)
├── pages/         NewSample, Structure, SamplesTable, ImportCsv
├── test/          setup Vitest + fixtures
├── types/         api.ts
├── App.tsx        rotas
└── index.css      tema Tailwind (brand / navy)
```

`vitest.config.ts` configura o runner (jsdom); `vite.config.ts` fica só para o app (evita conflito de tipos Vite 8 × Vitest).

---

## Testes

```bash
npm test
npm run test:watch
```

Stack: **Vitest** + **Testing Library** + **jsdom**.

Cobertura atual (unitário + bordas):

- Cliente HTTP — parse de `{ error }` / `{ errors }`, 204, 422, JSON inválido
- Cadastro — detecção de código duplicado vs `"abrir nova caixa"`
- Tabela — filtros, cascata, page sizes, lista vazia, `clampPage`
- Componentes — `PageHeader`, `AlertModal`

A regra first-fit continua coberta pelos testes **Rails** no backend.

---

## Fluxo típico na UI

1. API em `http://localhost:3000` (idealmente após `db:seed`).
2. **Estrutura:** confira ou crie sala→…→caixa; item de baixo abre o próximo nível alinhado.
3. **Amostras:** preencha → OK → aceite sugestão (mapa) ou edite escopo.
4. **Tabela** ou busca na estrutura para achar amostra.
5. Mapa da caixa: clique na célula ocupada para a ficha.
6. **Importar CSV** para carga histórica; reimportar o mesmo arquivo marca `exists`.

---

## Decisões de UX (resumo)

- Sistema aloca a célula; humano confirma caminho (e vê o mapa).
- Escopo (qual freezer/caixa) ≠ escolha de posição.
- Confirmar concentração vazia e exclusões destrutivas da hierarquia.
- Excluir **amostra** libera vaga; excluir **caixa/sala** apaga em cascata (MVP).
- Sem autenticação nesta versão (API aberta em local).

## Evolução possível

- Vitest em mais fluxos (ex.: página de cadastro com mocks da API)
- Auth na UI quando o backend exigir login
- Reativar menu da lixeira
- Filtros extras na tabela (exame, material, posições livres)
- E2E (Playwright) quando a UI estabilizar — ver também o plano de CI/CD do desafio
