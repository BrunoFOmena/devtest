# Teste Dev 2026 🧬🧊

Por que trabalhar na NeoGenomica ?
===============================

A NeoGenomica entra no mercado como um dos principais laboratórios do Brasil a oferecer tecnologia de sequenciamento genético de nova geração, focada na identificação, análise e diagnóstico de doenças raras. Além disso, disponibilizamos uma ampla gama de exames genéticos voltados para análises clínicas.

Nossa equipe é composta por especialistas renomados — biomédicos, médicos e bioinformatas — que utilizam tecnologias de ponta para realizar testes genéticos. No dia a dia da bancada, manipulamos **milhares de microtubos de DNA** guardados em freezers, e hoje esse controle é feito em planilha. Queremos evoluir isso para uma ferramenta de verdade.

Exemplos de armazenamento de amostras microtubos em freezer

<table>
  <tr>
    <td width="50%"><img alt="Amostras em microtubos no freezer" src="https://github.com/user-attachments/assets/238380c8-8cfb-4c7d-8b6b-903973ea27b7" /></td>
    <td width="50%"><img alt="Caixa/rack de microtubos" src="https://github.com/user-attachments/assets/5be62804-6403-42e8-bc47-b51b5f815159" /></td>
  </tr>
</table>


---

## Teste técnico para processo seletivo NeoGenomica

## 🎯 Objetivo

Criar uma aplicação web **Full Stack** (front-end + back-end) para o **gerenciamento de estoque de microtubos de DNA** do nosso laboratório. Hoje fazemos isso em planilha (veja `amostras_exemplo.csv`); o objetivo é substituir a planilha por um sistema que organize onde cada amostra está guardada e ajude a bancada a **encontrar rapidamente uma amostra** e a **decidir onde guardar uma amostra nova**.

> ℹ️ **Sobre o nível:** este é um teste para uma vaga de **desenvolvedor(a) júnior**. Não esperamos que você entregue 100% dos itens. Foque em fazer bem os **Requisitos Obrigatórios**; os **Bônus** são para quem quiser se destacar. Avaliamos muito mais a **clareza do raciocínio e a organização do código** do que a quantidade de features.

> 🤖 **Uso de IA:** você **pode usar ferramentas de IA** (ChatGPT, Copilot, Claude etc.) — elas fazem parte do dia a dia. O que realmente importa é que **você entenda tudo o que foi construído** e saiba **explicar suas escolhas** na conversa técnica. Vamos conversar sobre o código e as decisões, então esteja preparado(a) para justificar como e por que fez cada parte.

---

## 🧊 Contexto e modelo de dados

As amostras são guardadas seguindo uma **hierarquia física**:

```
Sala/Local  (ex.: "Pré-PCR", "Pós-PCR")
  └── Freezer            (ex.: "-20°C Amostras", "-80°C")   → tem um limite máximo de gavetas
        └── Gaveta/Rack                                     → tem um limite máximo de caixas
              └── Caixa   (uma grade de posições)           → o tamanho é definido ao criar (linhas × colunas)
                    └── Posição  (ex.: A1, B2 ...)          → guarda 1 microtubo (1 amostra) ou está livre
```

Cada **Caixa** é uma grade. O tamanho é **definido pelo usuário ao criar** — no nosso lab usamos caixas de vários tamanhos (ex.: `9×9`, `10×10`, e também caixas menores como `4×4` ou `8×8`). As posições são identificadas por **linha (letra) + coluna (número)**: `A1`, `A2`, ... `B1` ...

Cada **Amostra / microtubo** tem, no mínimo:

| Campo | Exemplo | Observações |
|---|---|---|
| `codigo_amostra` | `A0100100049801` | identificador da amostra (**único**) |
| `paciente_nome` | `CONTROLE NEO 136` | nome/identificação |
| `concentracao_ng_ul` | `52.8` | concentração em ng/µL |
| `material` | `DNA` / `Swab bucal` | tipo de material |
| `exame` | `CONTROLE INTERNO` | exame associado (opcional) |
| `observacao` | texto livre | opcional |

### Sugestão de modelagem (opcional)

Como referência, as **entidades** e suas **relações** seguem a hierarquia física:

```
Sala 1─N Freezer 1─N Gaveta 1─N Caixa 1─N Posição 0..1─ Amostra
```

- **Sala** possui vários **Freezers**
- **Freezer** possui várias **Gavetas**
- **Gaveta** possui várias **Caixas**
- **Caixa** possui várias **Posições** (definidas pelo tamanho linhas × colunas)
- Cada **Posição** guarda **no máximo uma Amostra** (ou está livre)

> 🧩 A modelagem de campos, tipos e como você representa a **Posição** (tabela própria x calculada a partir do tamanho da caixa) é **livre** — construa a sua. Essa é uma das coisas que vamos conversar na entrevista.

---

## 🛠️ Requisitos Obrigatórios

1. **Cadastro da estrutura física (CRUD)**
   - Criar/editar/remover **Salas**, **Freezers**, **Gavetas** e **Caixas**.
   - Ao criar uma **Caixa**, o usuário **define o tamanho** (nº de linhas e nº de colunas).

2. **Cadastro de amostras**
   - Adicionar uma amostra ao sistema com os campos acima.

3. **Sugestão automática de posição** ⭐ *(o coração do teste)*
   - Ao adicionar uma amostra, o sistema deve **sugerir automaticamente uma posição livre** e informar o **caminho completo**: `Sala → Freezer → Gaveta → Caixa → Posição` (ex.: `Pré-PCR / -20°C / Gaveta 1 / CX-CONTROLE / C3`).
   - Se **não houver nenhuma posição livre** nas caixas existentes, o sistema deve **avisar que é preciso abrir uma nova caixa** para poder alocar a amostra.
   - **Regra de alocação (first-fit)** — implemente exatamente assim para não haver ambiguidade:
     1. Percorra as caixas existentes numa ordem **determinística** (ex.: por data de criação, ou ordem alfabética do nome).
     2. Dentro de uma caixa, percorra as posições em ordem **linha a linha** (`A1, A2, …, A{n}, B1, …`) e escolha a **primeira posição livre**.
     3. Se a caixa estiver cheia, passe para a próxima; se **todas** estiverem cheias, retorne "**abrir nova caixa**".

4. **Visualização para encontrar uma amostra**
   - Pelo menos **uma** forma de listar/buscar as amostras e ver **onde cada uma está** (Sala/Freezer/Gaveta/Caixa/Posição).
   - Pode ser **tabela** ou **lista** com busca por `codigo_amostra` ou `paciente_nome`.

5. **README de execução**
   - A aplicação roda localmente, com instruções claras de como subir back-end, front-end e banco.

---

## ⭐ Requisitos Bônus (diferenciais)

1. **Limites de capacidade**
   - Definir **máximo de caixas por gaveta** e **máximo de gavetas por freezer**, e **impedir/avisar** quando o limite for atingido.
   - Ao sugerir "abrir nova caixa", respeitar esses limites (sugerir em qual gaveta/freezer a nova caixa caberia).

2. **Visualização em MAPA** 🗺️ *(o bônus mais legal)*
   - Uma forma **visual** de enxergar a estrutura como a bancada veria de verdade: uma caixa desenhada como grade, posições ocupadas x livres, e ao clicar numa posição ver a amostra.
   - Use sua criatividade: mapa da caixa, "heatmap" de ocupação por freezer/gaveta, mini-mapa navegável. Surpreenda-nos.

3. **Importação via CSV**
   - Importar amostras a partir de um `.csv` (use o `amostras_exemplo.csv` como referência).

4. **Autenticação**
   - Login para acessar o sistema; ações de escrita exigem estar autenticado.

5. **Busca/filtro avançado**
   - Filtrar por freezer, gaveta, exame, material, ou posições livres.

---

## 🔧 Requisitos Técnicos

- Use o stack que preferir. Sugestões (não obrigatórias):
  - **Front-end:** React, Vue.js ou Angular
  - **Back-end:** Node/Express, Ruby on Rails, Python (FastAPI/Django) ou similar
  - **Banco de dados:** PostgreSQL ou outro relacional
- A aplicação deve rodar localmente com instruções claras no `README`.

---

## 📦 Entrega

1. Faça um **fork** deste repositório.
2. Desenvolva sua solução em um branch chamado `develop`.
3. Envie o **link do seu repositório** com instruções de execução no `README`.

---

## 🚀 Segundo Desafio — Estratégia de CI/CD (apresentação)

A segunda parte é uma **apresentação de até 15 minutos** (máximo **5 slides**), discutida numa chamada com os entrevistadores. **Não é para escrever código** — queremos entender **como você pensaria** o deploy dessa aplicação.

**Descreva o fluxo de CI/CD que você montaria**, abordando:

- **Estratégia de branches** (ex.: `main`/`develop`/`feature/*`, trunk-based, GitFlow — e por quê).
- **Fluxo até produção**: o que acontece de um commit até o deploy? Quais ambientes (dev/staging/prod)?
- **Pull Request: exige ou não?** Quem revisa? Precisa de aprovação?
- **Testes: rodaria testes automatizados? Quais** (unit, integração, e2e, lint)? São **obrigatórios** para mergear/deployar, ou não? Por quê?
- **O que o pipeline faria** em cada etapa (build, testes, deploy) e **como um deploy é disparado** (automático no merge? manual?).

Pode usar slides ou diagramas. Não existe resposta única certa — queremos ver seu **raciocínio e as escolhas** (e trade-offs) que você faria para um time pequeno de laboratório.

**Duração:** apresentação até 15 min + 5 min de perguntas.

---

## ✅ Critérios de Avaliação

- Clareza e organização do código
- Boas práticas de desenvolvimento
- Cobertura dos requisitos obrigatórios (e bônus, se houver)
- Correção da **regra de sugestão de posição**
- Facilidade de uso da interface (a bancada consegue achar uma amostra rápido?)
- Capacidade de argumentação técnica na apresentação de CI/CD

---

## 📄 Dados de exemplo

Incluímos `amostras_exemplo.csv` — um recorte **real** (anonimizável) do nosso controle atual em planilha, já limpo em UTF-8. Colunas:

```csv
sala,freezer,gaveta,caixa,linhas,colunas,posicao,codigo_amostra,paciente_nome,concentracao_ng_ul,material,exame,observacao
```

Use-o para popular o sistema (seed) e/ou para testar a importação via CSV (bônus).

---

Para finalizar, faça o commit de todo o seu projeto no seu repositório **forkeado (bifurcado)** e nos envie o link junto à sua resposta. Boa sorte! 🍀
