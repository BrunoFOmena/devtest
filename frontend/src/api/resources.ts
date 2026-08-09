import { request } from "./client" //cliente HTTP fino
import type {
  AllocationScope,
  Box,
  Drawer,
  Freezer,
  Location,
  PositionCell,
  Room,
  SampleInput,
  SampleWithLocation,
} from "../types/api"

function scopeQuery(scope: AllocationScope): string { //monta ?room_id=...&box_id=...
  const params = new URLSearchParams()
  if (scope.room_id) params.set("room_id", String(scope.room_id))
  if (scope.freezer_id) params.set("freezer_id", String(scope.freezer_id))
  if (scope.drawer_id) params.set("drawer_id", String(scope.drawer_id))
  if (scope.box_id) params.set("box_id", String(scope.box_id))
  const query = params.toString()
  return query ? `?${query}` : "" //vazio se nao houver filtro
}

export function listRooms(): Promise<Room[]> { //GET /rooms
  return request<Room[]>("/rooms")
}

export function createRoom(name: string): Promise<Room> { //POST /rooms
  return request<Room>("/rooms", {
    method: "POST",
    body: JSON.stringify({ room: { name } }),
  })
}

export function deleteRoom(roomId: number): Promise<void> { //DELETE /rooms/:id (lixeira)
  return request<void>(`/rooms/${roomId}`, { method: "DELETE" })
}

export function updateRoom(roomId: number, name: string): Promise<Room> { //PATCH /rooms/:id
  return request<Room>(`/rooms/${roomId}`, {
    method: "PATCH",
    body: JSON.stringify({ room: { name } }),
  })
}


export function listFreezers(roomId: number): Promise<Freezer[]> { //GET /rooms/:id/freezers
  return request<Freezer[]>(`/rooms/${roomId}/freezers`)
}

export function createFreezer(roomId: number, name: string): Promise<Freezer> { //POST freezer
  return request<Freezer>(`/rooms/${roomId}/freezers`, {
    method: "POST",
    body: JSON.stringify({ freezer: { name } }),
  })
}

export function deleteFreezer(roomId: number, freezerId: number): Promise<void> { //DELETE freezer
  return request<void>(`/rooms/${roomId}/freezers/${freezerId}`, { method: "DELETE" })
}

export function updateFreezer( //PATCH freezer (renomear ou mover de sala)
  roomId: number,
  freezerId: number,
  data: { name?: string; room_id?: number },
): Promise<Freezer> {
  return request<Freezer>(`/rooms/${roomId}/freezers/${freezerId}`, {
    method: "PATCH",
    body: JSON.stringify({ freezer: data }),
  })
}


export function listDrawers(freezerId: number): Promise<Drawer[]> { //GET drawers
  return request<Drawer[]>(`/freezers/${freezerId}/drawers`)
}

export function createDrawer(freezerId: number, name: string): Promise<Drawer> { //POST drawer
  return request<Drawer>(`/freezers/${freezerId}/drawers`, {
    method: "POST",
    body: JSON.stringify({ drawer: { name } }),
  })
}

export function deleteDrawer(freezerId: number, drawerId: number): Promise<void> { //DELETE drawer
  return request<void>(`/freezers/${freezerId}/drawers/${drawerId}`, { method: "DELETE" })
}

export function updateDrawer( //PATCH drawer (renomear ou mover)
  freezerId: number,
  drawerId: number,
  data: { name?: string; freezer_id?: number },
): Promise<Drawer> {
  return request<Drawer>(`/freezers/${freezerId}/drawers/${drawerId}`, {
    method: "PATCH",
    body: JSON.stringify({ drawer: data }),
  })
}


export function listBoxes(drawerId: number): Promise<Box[]> { //GET boxes
  return request<Box[]>(`/drawers/${drawerId}/boxes`)
}

export function createBox( //POST box (gera grade no backend)
  drawerId: number,
  data: { name: string; rows: number; columns: number },
): Promise<Box> {
  return request<Box>(`/drawers/${drawerId}/boxes`, {
    method: "POST",
    body: JSON.stringify({ box: data }),
  })
}

export function deleteBox(drawerId: number, boxId: number): Promise<void> { //DELETE box
  return request<void>(`/drawers/${drawerId}/boxes/${boxId}`, { method: "DELETE" })
}

export function updateBox( //PATCH box
  drawerId: number,
  boxId: number,
  data: { name?: string; drawer_id?: number; rows?: number; columns?: number },
): Promise<Box> {
  return request<Box>(`/drawers/${drawerId}/boxes/${boxId}`, {
    method: "PATCH",
    body: JSON.stringify({ box: data }),
  })
}


export type TrashItemType = "room" | "freezer" | "drawer" | "box" //tipos da lixeira

export interface TrashItem { //item listado em GET /trash
  type: TrashItemType
  id: number
  name: string
  path: string //caminho legivel
  discarded_at: string
}

export function listTrash(): Promise<TrashItem[]> { //GET /trash
  return request<TrashItem[]>("/trash")
}

export function restoreTrashItem(type: TrashItemType, id: number): Promise<TrashItem> { //POST restore
  return request<TrashItem>(`/trash/${type}/${id}/restore`, { method: "POST" })
}

export function listPositions(boxId: number): Promise<PositionCell[]> { //grade da caixa
  return request<PositionCell[]>(`/boxes/${boxId}/positions`)
}

export function listSamples(): Promise<SampleWithLocation[]> { //GET /samples
  return request<SampleWithLocation[]>("/samples")
}

export function searchSamples(query: string): Promise<SampleWithLocation[]> { //GET /samples/search?q=
  const params = new URLSearchParams({ q: query })
  return request<SampleWithLocation[]>(`/samples/search?${params}`)
}

export function suggestSample(scope: AllocationScope): Promise<Location> { //POST suggest (nao grava)
  return request<Location>(`/samples/suggest${scopeQuery(scope)}`, { method: "POST" })
}

export function createSample( //POST /samples (first-fit grava)
  data: SampleInput,
  scope: AllocationScope,
): Promise<SampleWithLocation> {
  return request<SampleWithLocation>(`/samples${scopeQuery(scope)}`, {
    method: "POST",
    body: JSON.stringify({ sample: data }),
  })
}

export interface CsvImportRowData { //uma linha do CSV normalizada
  line?: number
  sala: string
  freezer: string
  gaveta: string
  caixa: string
  linhas?: string
  colunas?: string
  posicao: string
  codigo_amostra: string
  paciente_nome: string
  concentracao_ng_ul?: string | null
  material: string
  exame?: string | null
  observacao?: string | null
}

export interface CsvImportItem { //item do preview (ok / error / duplicate)
  status: "ok" | "error" | "duplicate"
  reasons: string[]
  data: CsvImportRowData
}

export interface CsvImportPreview { //resposta do import_preview
  ok: CsvImportItem[]
  rejected: CsvImportItem[]
}

export interface CsvImportResult { //resposta do import
  imported: number
  created: {
    rooms: number
    freezers: number
    drawers: number
    boxes: number
    samples: number
  }
}

export function previewCsvImport(csv: string): Promise<CsvImportPreview> { //preview com texto CSV
  return request<CsvImportPreview>("/samples/import_preview", {
    method: "POST",
    body: JSON.stringify({ csv }),
  })
}

export function previewCsvRows(rows: CsvImportRowData[]): Promise<CsvImportPreview> { //preview com rows
  return request<CsvImportPreview>("/samples/import_preview", {
    method: "POST",
    body: JSON.stringify({ rows }),
  })
}

export function commitCsvImport(rows: CsvImportRowData[]): Promise<CsvImportResult> { //importa linhas ok
  return request<CsvImportResult>("/samples/import", {
    method: "POST",
    body: JSON.stringify({ rows }),
  })
}
