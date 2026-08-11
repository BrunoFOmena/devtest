import type { Location, SampleWithLocation } from "../types/api"

/** Localizacao minima para testes de escopo. */
export function makeLocation(overrides: Partial<Location> = {}): Location {
  return {
    position_id: 1,
    label: "A1",
    row: "A",
    column: 1,
    room: "Pré",
    freezer: "-20C",
    drawer: "Gaveta 1",
    box: "Caixa 1",
    linhas: 8,
    colunas: 12,
    room_id: 10,
    freezer_id: 20,
    drawer_id: 30,
    box_id: 40,
    path: "Pré / -20C / Gaveta 1 / Caixa 1 / A1",
    ...overrides,
  }
}

/** Amostra + localizacao para testes de tabela/filtros. */
export function makeSample(overrides: Partial<SampleWithLocation> = {}): SampleWithLocation {
  return {
    ...makeLocation(),
    id: 1,
    codigo_amostra: "A0100100049801",
    paciente_nome: "CONTROLE NEO 136",
    material: "DNA",
    concentracao_ng_ul: "52.8",
    exame: "CONTROLE INTERNO",
    observacao: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  }
}
