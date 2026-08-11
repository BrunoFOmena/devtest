import type { SampleWithLocation } from "../types/api" //amostra + caminho

export interface SampleFilters { //filtros da barra da tabela
  sala: string
  freezer: string
  gaveta: string
  caixa: string
  /** "" = todas | "vazia" | "preenchida" */
  concentracao: string
}

export const EMPTY_SAMPLE_FILTERS: SampleFilters = {
  sala: "",
  freezer: "",
  gaveta: "",
  caixa: "",
  concentracao: "",
}

export const PAGE_SIZE_OPTIONS = [5, 15, 25, 35, 50] as const
export type PageSize = (typeof PAGE_SIZE_OPTIONS)[number]

/** Concentracao ausente, null ou so espacos. */
export function isEmptyConcentration(sample: SampleWithLocation): boolean {
  const value = sample.concentracao_ng_ul
  return value === null || value === undefined || String(value).trim() === ""
}

/** Opcoes unicas, sem vazios, ordenadas A-Z. */
export function uniqueSorted(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b))
}

/** Aplica filtros de localizacao e concentracao. */
export function filterSamples(
  samples: SampleWithLocation[],
  filters: SampleFilters,
): SampleWithLocation[] {
  return samples.filter((sample) => {
    if (filters.sala && sample.room !== filters.sala) return false
    if (filters.freezer && sample.freezer !== filters.freezer) return false
    if (filters.gaveta && sample.drawer !== filters.gaveta) return false
    if (filters.caixa && sample.box !== filters.caixa) return false
    if (filters.concentracao === "vazia" && !isEmptyConcentration(sample)) return false
    if (filters.concentracao === "preenchida" && isEmptyConcentration(sample)) return false
    return true
  })
}

/** Cascata: ao mudar um nivel pai, limpa os filhos. */
export function applyFilterChange(
  current: SampleFilters,
  key: keyof SampleFilters,
  value: string,
): SampleFilters {
  const next = { ...current, [key]: value }
  if (key === "sala") {
    next.freezer = ""
    next.gaveta = ""
    next.caixa = ""
  } else if (key === "freezer") {
    next.gaveta = ""
    next.caixa = ""
  } else if (key === "gaveta") {
    next.caixa = ""
  }
  return next
}

/** Total de paginas (sempre >= 1, mesmo com lista vazia). */
export function totalPagesFor(count: number, pageSize: number): number {
  return Math.max(1, Math.ceil(count / pageSize))
}

/** Pagina atual corrigida se filtros reduziram o total. */
export function clampPage(page: number, totalPages: number): number {
  return Math.min(Math.max(1, page), totalPages)
}

/** Fatia da lista para a pagina atual (1-based). */
export function slicePage<T>(items: T[], page: number, pageSize: number): T[] {
  const total = totalPagesFor(items.length, pageSize)
  const current = clampPage(page, total)
  const start = (current - 1) * pageSize
  return items.slice(start, start + pageSize)
}
