# Frontend — React + Vite + TypeScript

Interface da bancada para o inventário de microtubos de DNA. Consome a API Rails em `VITE_API_URL`.

## Stack

- React 19 + TypeScript
- Vite 8
- Tailwind CSS 4
- React Router
- Oxlint
- Tipografia: DM Sans (identidade NeoGenomica)

## Pré-requisitos

- Node.js 20+ e npm
- API backend rodando (veja o README da raiz ou `backend/README.md`)

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

## Scripts

| Comando | Uso |
|---|---|
| `npm run dev` | servidor de desenvolvimento |
| `npm run build` | build de produção (`tsc` + Vite) |
| `npm run preview` | preview do build |
| `npm run lint` | Oxlint |

## Identidade visual

Paleta definida em `src/index.css` (`@theme`):

- **Navy** (`navy-900` ≈ `#0c1d2e`) — sidebar e títulos
- **Teal / brand** (`brand-400` ≈ `#72b1b8`) — item ativo, botões, destaques
- Fundo claro (`slate-50` / `#f8fafc`), cards arredondados, labels em caps nas seções

Componentes de apoio: `Layout` (sidebar), `PageHeader` (eyebrow + título).

## Telas

| Rota | Página | Função |
|---|---|---|
| `/amostras/nova` | Cadastro de amostra | Formulário → modal **Aceitar posição automática?** (caminho + `BoxMap`) ou fluxo manual com escopo; confirma concentração vazia; alerta de código duplicado |
| `/estrutura` | Estrutura física | Árvore sala → freezer → gaveta → caixa → mapa; colunas filhas alinham verticalmente ao item selecionado (árvore genealógica); criar, renomear, mover, excluir; busca e destaque do caminho |
| `/tabela` | Tabela | Lista com filtros de localização e concentração; **Mostrar X resultados** (5 / 15 / 25 / 35 / 50) + paginação; ver ficha e excluir amostra |
| `/importar-csv` | Importar CSV | Preview: ok (verde), erro (vermelho), duplicata no arquivo / ID já no sistema (amarelo); ajuste e commit na API |

**Fora do MVP (implementação futura):** rota `/lixeira` e item de menu comentados. A página `TrashPage.tsx` permanece no código para reativar soft-delete + restore.

## Organização do código

```
src/
├── api/           client HTTP + funções da API (resources.ts)
├── components/    Layout, PageHeader, modais, BoxMap, LocationTrail, etc.
├── pages/         telas das rotas acima
├── types/         tipos TypeScript alinhados à API
├── App.tsx        rotas
└── index.css      tema Tailwind (brand / navy) + estilos base
```

## Fluxo típico na UI

1. Garanta que a API está em `http://localhost:3000` (idealmente após `db:seed`).
2. Em **Estrutura**, confira salas/freezers ou crie novos (botão `+`); ao clicar num item mais abaixo, o próximo nível abre na mesma altura.
3. Em **Amostras**, preencha os campos, OK, e aceite a sugestão (com mapa) ou edite a localização.
4. Use a busca na estrutura ou a **Tabela** (filtros + quantidade de resultados) para achar uma amostra.
5. Abra uma caixa no mapa para ver a grade (clique na célula para a ficha; exclua se precisar).
6. **Importar CSV** para carga histórica; códigos já presentes no banco aparecem como rejeitados (`exists`).

## Observações

- O frontend não escolhe a célula (A1, B2…): a API aloca. A UI só pode limitar o **escopo** da busca de vaga.
- Excluir na estrutura, neste MVP, é **definitivo** (com confirmação). Excluir **amostra** libera a posição.
- **Lixeira:** fora do MVP; código comentado/preparado para implementação futura.
- Sem autenticação nesta versão (API aberta em desenvolvimento local).
