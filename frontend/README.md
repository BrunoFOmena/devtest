# Frontend — React + Vite + TypeScript

Interface da bancada para o inventário de microtubos de DNA. Consome a API Rails em `VITE_API_URL`.

## Stack

- React 19 + TypeScript
- Vite 8
- Tailwind CSS 4
- React Router
- Oxlint

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

## Telas

| Rota | Página | Função |
|---|---|---|
| `/amostras/nova` | Nova amostra | Cadastro com sugestão first-fit; aceitar automático ou restringir escopo; confirma concentração vazia |
| `/estrutura` | Estrutura física | Árvore sala → freezer → gaveta → caixa → mapa; criar, renomear, mover, lixeira; busca e destaque do caminho |
| `/tabela` | Tabela | Lista amostras com filtros de localização e concentração vazia |
| `/importar-csv` | Importar CSV | Preview (ok / erro / duplicata), ajuste e commit na API |
| `/lixeira` | Lixeira | Lista itens soft-deletados e restaura |

## Organização do código

```
src/
├── api/           client HTTP + funções da API (resources.ts)
├── components/    Layout, modais, BoxMap, LocationTrail, etc.
├── pages/         telas das rotas acima
├── types/         tipos TypeScript alinhados à API
├── App.tsx        rotas
└── index.css      estilos / Tailwind
```

## Fluxo típico na UI

1. Garanta que a API está em `http://localhost:3000` (idealmente após `db:seed`).
2. Em **Estrutura**, confira salas/freezers ou crie novos (botão `+`).
3. Em **Nova amostra**, preencha os campos e confirme a posição sugerida.
4. Use a busca na estrutura ou a **Tabela** para achar uma amostra.
5. Abra uma caixa no mapa para ver a grade (clique na célula para a ficha).
6. **Importar CSV** para carga histórica; **Lixeira** para desfazer exclusões da hierarquia.

## Observações

- O frontend não escolhe a célula (A1, B2…): a API aloca. A UI só pode limitar o **escopo** da busca de vaga.
- Excluir na estrutura envia para a lixeira (recuperável), não apaga amostras diretamente.
- Sem autenticação nesta versão (API aberta em desenvolvimento local).
