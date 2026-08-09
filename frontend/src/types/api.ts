export interface Room { //sala
  id: number
  name: string
}

export interface Freezer { //freezer (pertence a uma sala)
  id: number
  name: string
  room_id: number //id da sala pai
}

export interface Drawer { //gaveta (pertence a um freezer)
  id: number
  name: string
  freezer_id: number //id do freezer pai
}

export interface Box { //caixa com grade
  id: number
  name: string
  rows: number //linhas da grade
  columns: number //colunas da grade
  drawer_id: number //id da gaveta pai
}

export interface PositionCell { //celula da grade (GET /boxes/:id/positions)
  id: number
  row: string //letra (A, B...)
  column: number //numero (1, 2...)
  label: string //ex.: A1
  occupied: boolean //true se tem amostra
  sample: { //resumo da amostra, ou null se livre
    id: number
    codigo_amostra: string
    paciente_nome: string
    concentracao_ng_ul: string | null
    material: string
    exame: string | null
    observacao: string | null
  } | null
}

export interface Location { //endereco completo (suggest / location_payload)
  position_id: number
  label: string //ex.: A1
  row: string
  column: number
  room: string //nome da sala
  freezer: string
  drawer: string
  box: string
  linhas: number //rows da caixa
  colunas: number //columns da caixa
  room_id: number
  freezer_id: number
  drawer_id: number
  box_id: number
  path: string //ex.: Sala / Freezer / Gaveta / Caixa / A1
}

export interface SampleWithLocation extends Location { //amostra + localizacao
  id: number
  codigo_amostra: string
  paciente_nome: string
  material: string
  concentracao_ng_ul: string | null
  exame: string | null
  observacao: string | null
  created_at: string
  updated_at: string
}

export interface SampleInput { //body do POST /samples
  codigo_amostra: string
  paciente_nome: string
  material: string
  concentracao_ng_ul?: string | null //opcional
  exame?: string | null //opcional
  observacao?: string | null //opcional
}

export interface AllocationScope { //filtro opcional do first-fit
  room_id?: number
  freezer_id?: number
  drawer_id?: number
  box_id?: number
}
