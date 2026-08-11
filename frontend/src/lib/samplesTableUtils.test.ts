import { describe, expect, it } from "vitest"
import { makeSample } from "../test/fixtures"
import {
  applyFilterChange,
  clampPage,
  EMPTY_SAMPLE_FILTERS,
  filterSamples,
  isEmptyConcentration,
  PAGE_SIZE_OPTIONS,
  slicePage,
  totalPagesFor,
  uniqueSorted,
} from "./samplesTableUtils"

describe("isEmptyConcentration", () => {
  it("false quando tem valor", () => {
    expect(isEmptyConcentration(makeSample({ concentracao_ng_ul: "10" }))).toBe(false)
  })

  it("borda: null, undefined e string vazia/espacos", () => {
    expect(isEmptyConcentration(makeSample({ concentracao_ng_ul: null }))).toBe(true)
    expect(
      isEmptyConcentration(makeSample({ concentracao_ng_ul: undefined as unknown as null })),
    ).toBe(true)
    expect(isEmptyConcentration(makeSample({ concentracao_ng_ul: "" }))).toBe(true)
    expect(isEmptyConcentration(makeSample({ concentracao_ng_ul: "   " }))).toBe(true)
  })
})

describe("uniqueSorted", () => {
  it("remove duplicatas e ordena", () => {
    expect(uniqueSorted(["B", "A", "B", "C"])).toEqual(["A", "B", "C"])
  })

  it("borda: remove vazios e lista vazia", () => {
    expect(uniqueSorted(["", "A", ""])).toEqual(["A"])
    expect(uniqueSorted([])).toEqual([])
  })
})

describe("filterSamples", () => {
  const samples = [
    makeSample({
      id: 1,
      room: "Pré",
      freezer: "-20C",
      drawer: "G1",
      box: "CX1",
      concentracao_ng_ul: "10",
    }),
    makeSample({
      id: 2,
      room: "Pré",
      freezer: "-80C",
      drawer: "G1",
      box: "CX2",
      concentracao_ng_ul: null,
    }),
    makeSample({
      id: 3,
      room: "Pós",
      freezer: "-20C",
      drawer: "G2",
      box: "CX1",
      concentracao_ng_ul: "5",
    }),
  ]

  it("sem filtros devolve todos", () => {
    expect(filterSamples(samples, EMPTY_SAMPLE_FILTERS)).toHaveLength(3)
  })

  it("filtra por sala", () => {
    const result = filterSamples(samples, { ...EMPTY_SAMPLE_FILTERS, sala: "Pré" })
    expect(result.map((s) => s.id)).toEqual([1, 2])
  })

  it("borda: concentracao vazia / preenchida", () => {
    expect(
      filterSamples(samples, { ...EMPTY_SAMPLE_FILTERS, concentracao: "vazia" }).map((s) => s.id),
    ).toEqual([2])
    expect(
      filterSamples(samples, { ...EMPTY_SAMPLE_FILTERS, concentracao: "preenchida" }).map(
        (s) => s.id,
      ),
    ).toEqual([1, 3])
  })

  it("borda: filtro sem match", () => {
    expect(
      filterSamples(samples, { ...EMPTY_SAMPLE_FILTERS, sala: "Inexistente" }),
    ).toHaveLength(0)
  })
})

describe("applyFilterChange", () => {
  it("ao mudar sala limpa freezer/gaveta/caixa", () => {
    const current = {
      sala: "Pré",
      freezer: "-20C",
      gaveta: "G1",
      caixa: "CX1",
      concentracao: "vazia",
    }
    expect(applyFilterChange(current, "sala", "Pós")).toEqual({
      sala: "Pós",
      freezer: "",
      gaveta: "",
      caixa: "",
      concentracao: "vazia",
    })
  })

  it("borda: mudar concentracao nao limpa hierarquia", () => {
    const current = {
      sala: "Pré",
      freezer: "-20C",
      gaveta: "G1",
      caixa: "CX1",
      concentracao: "",
    }
    expect(applyFilterChange(current, "concentracao", "vazia")).toEqual({
      ...current,
      concentracao: "vazia",
    })
  })
})

describe("paginacao", () => {
  it("PAGE_SIZE_OPTIONS sao as do produto", () => {
    expect([...PAGE_SIZE_OPTIONS]).toEqual([5, 15, 25, 35, 50])
  })

  it("totalPagesFor e clampPage", () => {
    expect(totalPagesFor(46, 25)).toBe(2)
    expect(totalPagesFor(0, 25)).toBe(1) //borda: lista vazia ainda tem 1 pagina
    expect(totalPagesFor(5, 5)).toBe(1)
    expect(clampPage(99, 2)).toBe(2)
    expect(clampPage(0, 3)).toBe(1)
  })

  it("slicePage fatia e corrige pagina alta demais", () => {
    const items = [1, 2, 3, 4, 5, 6, 7]
    expect(slicePage(items, 1, 5)).toEqual([1, 2, 3, 4, 5])
    expect(slicePage(items, 2, 5)).toEqual([6, 7])
    expect(slicePage(items, 9, 5)).toEqual([6, 7]) //borda: page > total
    expect(slicePage([], 1, 5)).toEqual([])
  })
})
