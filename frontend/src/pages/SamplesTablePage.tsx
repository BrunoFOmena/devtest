import { useEffect, useMemo, useState } from "react" //hooks de estado, efeito e memo
import { listSamples } from "../api/resources" //lista todas as amostras
import type { SampleWithLocation } from "../types/api" //tipo da linha da tabela

const COLUMNS = [ //colunas iguais ao CSV de exemplo
  { key: "sala", label: "sala" },
  { key: "freezer", label: "freezer" },
  { key: "gaveta", label: "gaveta" },
  { key: "caixa", label: "caixa" },
  { key: "linhas", label: "linhas" },
  { key: "colunas", label: "colunas" },
  { key: "posicao", label: "posicao" },
  { key: "codigo_amostra", label: "codigo_amostra" },
  { key: "paciente_nome", label: "paciente_nome" },
  { key: "concentracao_ng_ul", label: "concentracao_ng_ul" },
  { key: "material", label: "material" },
  { key: "exame", label: "exame" },
  { key: "observacao", label: "observacao" },
] as const

type ColumnKey = (typeof COLUMNS)[number]["key"] //union das keys

interface Filters { //filtros da barra superior
  sala: string
  freezer: string
  gaveta: string
  caixa: string
  /** "" = todas | "vazia" | "preenchida" */
  concentracao: string //filtro especial de concentracao
}

const EMPTY_FILTERS: Filters = { //filtros zerados
  sala: "",
  freezer: "",
  gaveta: "",
  caixa: "",
  concentracao: "",
}

function isEmptyConcentration(sample: SampleWithLocation): boolean { //concentracao vazia?
  const value = sample.concentracao_ng_ul
  return value === null || value === undefined || String(value).trim() === "" //null/undefined/blank
}

function cellValue(sample: SampleWithLocation, key: ColumnKey): string { //valor textual da celula
  switch (key) {
    case "sala":
      return sample.room //nome da sala
    case "freezer":
      return sample.freezer //nome do freezer
    case "gaveta":
      return sample.drawer //nome da gaveta
    case "caixa":
      return sample.box //nome da caixa
    case "linhas":
      return String(sample.linhas) //rows da caixa
    case "colunas":
      return String(sample.colunas) //cols da caixa
    case "posicao":
      return sample.label //label da posicao (ex: A1)
    case "codigo_amostra":
      return sample.codigo_amostra //codigo
    case "paciente_nome":
      return sample.paciente_nome //paciente
    case "concentracao_ng_ul":
      return sample.concentracao_ng_ul ?? "" //conc ou vazio
    case "material":
      return sample.material //material
    case "exame":
      return sample.exame ?? "" //exame opcional
    case "observacao":
      return sample.observacao ?? "" //obs opcional
  }
}

function uniqueSorted(values: string[]): string[] { //opcoes unicas ordenadas
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b)) //sem vazios, A-Z
}

const selectClass = //estilo dos selects de filtro
  "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"

export default function SamplesTablePage() { //pagina tabela de amostras
  const [samples, setSamples] = useState<SampleWithLocation[]>([]) //todas as amostras
  const [loading, setLoading] = useState(true) //carregando
  const [error, setError] = useState<string | null>(null) //erro de carga
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS) //filtros ativos

  useEffect(() => {
    listSamples() //busca tudo
      .then(setSamples) //guarda
      .catch(() => setError("Não foi possível carregar a tabela de amostras.")) //falha
      .finally(() => setLoading(false)) //fim loading
  }, [])

  const salaOptions = useMemo( //opcoes de sala
    () => uniqueSorted(samples.map((s) => s.room)),
    [samples],
  )

  const freezerOptions = useMemo(() => { //freezers filtrados pela sala
    const scoped = filters.sala
      ? samples.filter((s) => s.room === filters.sala) //so da sala escolhida
      : samples
    return uniqueSorted(scoped.map((s) => s.freezer))
  }, [samples, filters.sala])

  const gavetaOptions = useMemo(() => { //gavetas filtradas por sala/freezer
    let scoped = samples
    if (filters.sala) scoped = scoped.filter((s) => s.room === filters.sala) //filtra sala
    if (filters.freezer) scoped = scoped.filter((s) => s.freezer === filters.freezer) //filtra freezer
    return uniqueSorted(scoped.map((s) => s.drawer))
  }, [samples, filters.sala, filters.freezer])

  const caixaOptions = useMemo(() => { //caixas filtradas ate gaveta
    let scoped = samples
    if (filters.sala) scoped = scoped.filter((s) => s.room === filters.sala)
    if (filters.freezer) scoped = scoped.filter((s) => s.freezer === filters.freezer)
    if (filters.gaveta) scoped = scoped.filter((s) => s.drawer === filters.gaveta)
    return uniqueSorted(scoped.map((s) => s.box))
  }, [samples, filters.sala, filters.freezer, filters.gaveta])

  const filtered = useMemo(() => { //aplica todos os filtros
    return samples.filter((sample) => {
      if (filters.sala && sample.room !== filters.sala) return false //sala
      if (filters.freezer && sample.freezer !== filters.freezer) return false //freezer
      if (filters.gaveta && sample.drawer !== filters.gaveta) return false //gaveta
      if (filters.caixa && sample.box !== filters.caixa) return false //caixa
      if (filters.concentracao === "vazia" && !isEmptyConcentration(sample)) return false //so vazias
      if (filters.concentracao === "preenchida" && isEmptyConcentration(sample)) return false //so preenchidas
      return true //passou
    })
  }, [samples, filters])

  const hasActiveFilters = Object.values(filters).some(Boolean) //algum filtro ligado?

  function updateFilter<K extends keyof Filters>(key: K, value: string) { //muda um filtro
    setFilters((current) => {
      const next = { ...current, [key]: value } //aplica o valor
      // Cascata: ao mudar um nivel pai, limpa os filhos.
      if (key === "sala") {
        next.freezer = "" //limpa filhos
        next.gaveta = ""
        next.caixa = ""
      } else if (key === "freezer") {
        next.gaveta = ""
        next.caixa = ""
      } else if (key === "gaveta") {
        next.caixa = ""
      }
      return next
    })
  }

  return (
    <div className="mx-auto max-w-[96rem]"> {/*largura larga pra tabela*/}
      <div> {/*cabecalho*/}
        <h1 className="text-2xl font-semibold text-slate-900">Tabela</h1>
        <p className="mt-1 text-sm text-slate-500">
          Visão completa das amostras, com as mesmas colunas do arquivo CSV de exemplo.
        </p>
      </div>

      {loading && <p className="mt-8 text-sm text-slate-400">Carregando...</p>} {/*loading*/}
      {error && <p className="mt-8 text-sm text-red-600">{error}</p>} {/*erro*/}

      {!loading && !error && ( //conteudo principal
        <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"> {/*card*/}
          <div className="space-y-3 border-b border-slate-100 px-4 py-3"> {/*barra de filtros*/}
            <div className="flex flex-wrap items-end gap-3"> {/*linha de selects*/}
              <label className="block min-w-[9rem] flex-1"> {/*filtro sala*/}
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Sala
                </span>
                <select
                  value={filters.sala}
                  onChange={(e) => updateFilter("sala", e.target.value)} //muda sala
                  className={`w-full ${selectClass}`}
                >
                  <option value="">Todas</option>
                  {salaOptions.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block min-w-[9rem] flex-1"> {/*filtro freezer*/}
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Freezer
                </span>
                <select
                  value={filters.freezer}
                  onChange={(e) => updateFilter("freezer", e.target.value)} //muda freezer
                  className={`w-full ${selectClass}`}
                >
                  <option value="">Todos</option>
                  {freezerOptions.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block min-w-[9rem] flex-1"> {/*filtro gaveta*/}
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Gaveta
                </span>
                <select
                  value={filters.gaveta}
                  onChange={(e) => updateFilter("gaveta", e.target.value)} //muda gaveta
                  className={`w-full ${selectClass}`}
                >
                  <option value="">Todas</option>
                  {gavetaOptions.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block min-w-[9rem] flex-1"> {/*filtro caixa*/}
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Caixa
                </span>
                <select
                  value={filters.caixa}
                  onChange={(e) => updateFilter("caixa", e.target.value)} //muda caixa
                  className={`w-full ${selectClass}`}
                >
                  <option value="">Todas</option>
                  {caixaOptions.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block min-w-[9rem] flex-1"> {/*filtro concentracao*/}
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Concentração
                </span>
                <select
                  value={filters.concentracao}
                  onChange={(e) => updateFilter("concentracao", e.target.value)} //muda conc
                  className={`w-full ${selectClass}`}
                >
                  <option value="">Todas</option>
                  <option value="vazia">Vazia (!)</option>
                  <option value="preenchida">Preenchida</option>
                </select>
              </label>

              {hasActiveFilters && ( //botao limpar so se tem filtro
                <button
                  type="button"
                  onClick={() => setFilters(EMPTY_FILTERS)} //zera tudo
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Limpar filtros
                </button>
              )}
            </div>

            <p className="text-sm text-slate-600"> {/*contador filtrado vs total*/}
              {filtered.length} de {samples.length}{" "}
              {samples.length === 1 ? "registro" : "registros"}
            </p>
          </div>

          {samples.length === 0 ? ( //sem dados
            <p className="px-4 py-8 text-sm text-slate-500">Nenhuma amostra cadastrada.</p>
          ) : filtered.length === 0 ? ( //filtros sem match
            <p className="px-4 py-8 text-sm text-slate-500">
              Nenhum registro com esses filtros.
            </p>
          ) : (
            <div className="overflow-x-auto"> {/*scroll horizontal*/}
              <table className="min-w-full border-collapse text-left text-sm"> {/*tabela*/}
                <thead>
                  <tr className="bg-slate-50"> {/*cabecalhos*/}
                    {COLUMNS.map((column) => (
                      <th
                        key={column.key}
                        className="whitespace-nowrap border-b border-slate-200 px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500"
                      >
                        {column.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((sample) => ( //uma linha por amostra
                    <tr
                      key={sample.id}
                      className="border-b border-slate-100 hover:bg-violet-50/40"
                    >
                      {COLUMNS.map((column) => {
                        const value = cellValue(sample, column.key) //texto da celula
                        const missingConc =
                          column.key === "concentracao_ng_ul" && value === "" //marca conc vazia
                        return (
                          <td
                            key={column.key}
                            className="whitespace-nowrap px-3 py-2 text-slate-700"
                          >
                            {missingConc ? ( //badge ! pra concentracao vazia
                              <span className="inline-flex items-center gap-1 text-amber-700">
                                <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-amber-400 text-[8px] font-bold text-amber-950">
                                  !
                                </span>
                                —
                              </span>
                            ) : (
                              value || "—" //traco se vazio
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
