import { useEffect, useMemo, useState } from "react" //hooks de estado, efeito e memo
import { ApiError } from "../api/client" //erro tipado da API
import { deleteSample, listSamples } from "../api/resources" //lista e apaga amostras
import PageHeader from "../components/PageHeader" //titulo padrao da marca
import SampleDetailModal from "../components/SampleDetailModal" //ficha com botao excluir
import {
  applyFilterChange,
  clampPage,
  EMPTY_SAMPLE_FILTERS,
  filterSamples,
  PAGE_SIZE_OPTIONS,
  slicePage,
  totalPagesFor,
  uniqueSorted,
  type PageSize,
  type SampleFilters,
} from "../lib/samplesTableUtils" //filtros e paginacao testaveis
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

const selectClass = //estilo dos selects de filtro
  "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"

export default function SamplesTablePage() { //pagina tabela de amostras
  const [samples, setSamples] = useState<SampleWithLocation[]>([]) //todas as amostras
  const [loading, setLoading] = useState(true) //carregando
  const [error, setError] = useState<string | null>(null) //erro de carga
  const [filters, setFilters] = useState<SampleFilters>(EMPTY_SAMPLE_FILTERS) //filtros ativos
  const [pageSize, setPageSize] = useState<PageSize>(25) //linhas por pagina
  const [page, setPage] = useState(1) //pagina atual (1-based)
  const [activeSample, setActiveSample] = useState<SampleWithLocation | null>(null) //ficha aberta
  const [deletingId, setDeletingId] = useState<number | null>(null) //id em exclusao na linha

  useEffect(() => {
    listSamples() //busca tudo
      .then(setSamples) //guarda
      .catch(() => setError("Não foi possível carregar a tabela de amostras.")) //falha
      .finally(() => setLoading(false)) //fim loading
  }, [])

  function removeSampleFromList(sampleId: number) { //tira amostra da tabela apos delete
    setSamples((current) => current.filter((item) => item.id !== sampleId))
    setActiveSample((current) => (current?.id === sampleId ? null : current))
  }

  async function handleDeleteRow(sample: SampleWithLocation) { //exclui direto na linha
    if (
      !window.confirm(
        `Excluir a amostra "${sample.codigo_amostra}"? A posição ficará livre. Esta ação não pode ser desfeita.`,
      )
    ) {
      return
    }

    setDeletingId(sample.id) //marca linha
    setError(null)
    try {
      await deleteSample(sample.id) //DELETE API
      removeSampleFromList(sample.id) //atualiza UI
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível excluir a amostra.")
    } finally {
      setDeletingId(null)
    }
  }


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

  const filtered = useMemo(() => filterSamples(samples, filters), [samples, filters])

  const totalPages = totalPagesFor(filtered.length, pageSize) //paginas com o pageSize atual
  const currentPage = clampPage(page, totalPages) //corrige se filtros reduziram o total

  const pageRows = useMemo(
    () => slicePage(filtered, currentPage, pageSize), //fatia visivel da tabela
    [filtered, currentPage, pageSize],
  )

  const hasActiveFilters = Object.values(filters).some(Boolean) //algum filtro ligado?

  function updateFilter<K extends keyof SampleFilters>(key: K, value: string) { //muda um filtro
    setPage(1) //volta pra primeira pagina ao filtrar
    setFilters((current) => applyFilterChange(current, key, value)) //cascata nos filhos
  }

  function changePageSize(value: PageSize) { //troca "mostrar X"
    setPageSize(value)
    setPage(1) //reinicia paginacao
  }

  return (
    <div className="mx-auto max-w-[96rem]"> {/*largura larga pra tabela*/}
      <PageHeader
        eyebrow="Amostras"
        title="Tabela"
        description="Visão completa das amostras, com as mesmas colunas do arquivo CSV de exemplo."
      />

      {loading && <p className="mt-8 text-sm text-slate-400">Carregando...</p>} {/*loading*/}
      {error && <p className="mt-8 text-sm text-red-600">{error}</p>} {/*erro*/}

      {!loading && !error && ( //conteudo principal
        <div className="mt-8 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm"> {/*card*/}
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
                  onClick={() => {
                    setFilters(EMPTY_SAMPLE_FILTERS) //zera tudo
                    setPage(1) //volta ao inicio
                  }}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Limpar filtros
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3"> {/*contador + page size*/}
              <p className="text-sm text-slate-600">
                {filtered.length === 0
                  ? `0 de ${samples.length} registros`
                  : `Mostrando ${(currentPage - 1) * pageSize + 1}–${Math.min(currentPage * pageSize, filtered.length)} de ${filtered.length} filtrados (${samples.length} no total)`}
              </p>

              <label className="flex items-center gap-2 text-sm text-slate-600">
                <span className="font-medium text-slate-700">Mostrar</span>
                <select
                  value={pageSize}
                  onChange={(e) => changePageSize(Number(e.target.value) as PageSize)}
                  className={selectClass}
                  aria-label="Mostrar quantos resultados"
                >
                  {PAGE_SIZE_OPTIONS.map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
                <span>resultados</span>
              </label>
            </div>
          </div>

          {samples.length === 0 ? ( //sem dados
            <p className="px-4 py-8 text-sm text-slate-500">Nenhuma amostra cadastrada.</p>
          ) : filtered.length === 0 ? ( //filtros sem match
            <p className="px-4 py-8 text-sm text-slate-500">
              Nenhum registro com esses filtros.
            </p>
          ) : (
            <>
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
                      <th className="whitespace-nowrap border-b border-slate-200 px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        ações
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.map((sample) => ( //linhas da pagina atual
                      <tr
                        key={sample.id}
                        className="border-b border-slate-100 hover:bg-brand-50/40"
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
                        <td className="whitespace-nowrap px-3 py-2"> {/*ficha + excluir*/}
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setActiveSample(sample)} //abre ficha
                              className="rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
                            >
                              Ver
                            </button>
                            <button
                              type="button"
                              disabled={deletingId === sample.id}
                              onClick={() => handleDeleteRow(sample)} //apaga amostra
                              className="rounded border border-red-200 bg-red-50 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
                            >
                              {deletingId === sample.id ? "..." : "Excluir"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && ( //navegacao entre paginas
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3">
                  <p className="text-sm text-slate-500">
                    Página {currentPage} de {totalPages}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={currentPage <= 1}
                      onClick={() => setPage(currentPage - 1)}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Anterior
                    </button>
                    <button
                      type="button"
                      disabled={currentPage >= totalPages}
                      onClick={() => setPage(currentPage + 1)}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Próxima
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {activeSample && ( //modal ficha com excluir
        <SampleDetailModal
          sample={activeSample}
          onClose={() => setActiveSample(null)}
          onDeleted={removeSampleFromList}
        />
      )}
    </div>
  )
}

