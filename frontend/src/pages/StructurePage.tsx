import { useEffect, useLayoutEffect, useRef, useState } from "react" //hooks de estado, layout e refs
// import { Link } from "react-router-dom" //FUTURO: link pra lixeira
import {
  deleteBox, //exclui caixa (MVP: hard delete)
  deleteDrawer, //exclui gaveta
  deleteFreezer, //exclui freezer
  deleteRoom, //exclui sala

  listBoxes,
  listDrawers,
  listFreezers,
  listPositions,
  listRooms,
  searchSamples, //busca por codigo/paciente
  updateBox,
  updateDrawer,
  updateFreezer,
  updateRoom,
} from "../api/resources"
import BoxMap from "../components/BoxMap" //mapa de posicoes da caixa
import CreateEntityModal from "../components/CreateEntityModal" //criar sala/freezer/gaveta/caixa
import MoveEntityModal, { type MoveOption } from "../components/MoveEntityModal" //mover entidade
import PageHeader from "../components/PageHeader" //titulo padrao da marca
import RenameEntityModal from "../components/RenameEntityModal" //renomear
import SampleDetailModal from "../components/SampleDetailModal" //ficha da amostra
import type {
  Box,
  Drawer,
  Freezer,
  PositionCell,
  Room,
  SampleWithLocation,
} from "../types/api"

type CreateTarget = //o que vamos criar e o pai
  | { level: "room" }
  | { level: "freezer"; room: Room }
  | { level: "drawer"; room: Room; freezer: Freezer }
  | { level: "box"; room: Room; freezer: Freezer; drawer: Drawer }

type RenameTarget = //entidade aberta no modal de rename
  | { kind: "room"; room: Room }
  | { kind: "freezer"; room: Room; freezer: Freezer }
  | { kind: "drawer"; freezer: Freezer; drawer: Drawer }
  | { kind: "box"; drawer: Drawer; box: Box }

type MoveTarget = //entidade + destinos do modal de mover
  | {
      kind: "freezer"
      room: Room
      freezer: Freezer
      options: MoveOption[] //salas destino
      loading: boolean
    }
  | {
      kind: "drawer"
      freezer: Freezer
      drawer: Drawer
      options: MoveOption[] //freezers destino
      loading: boolean
    }
  | {
      kind: "box"
      drawer: Drawer
      box: Box
      options: MoveOption[] //gavetas destino
      loading: boolean
    }

const actionBtnClass = //estilo dos botoes ✎ / ⇄
  "rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-xs text-slate-500 hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700"

type TreeLevel = //um nivel expandido da arvore (branch)
  | { kind: "freezers"; room: Room; items: Freezer[]; selectedId?: number }
  | {
      kind: "drawers"
      room: Room
      freezer: Freezer
      items: Drawer[]
      selectedId?: number
    }
  | {
      kind: "boxes"
      room: Room
      freezer: Freezer
      drawer: Drawer
      items: Box[]
      selectedId?: number
    }
  | {
      kind: "positions"
      room: Room
      freezer: Freezer
      drawer: Drawer
      box: Box
      positions: PositionCell[] //mapa da caixa
    }

interface PathHighlight { //ids do caminho localizado (busca)
  roomId: number
  freezerId: number
  drawerId: number
  boxId: number
  positionId: number
}

const LEVEL_LABEL: Record<TreeLevel["kind"], string> = { //titulo da coluna
  freezers: "Freezers",
  drawers: "Gavetas",
  boxes: "Caixas",
  positions: "Mapa",
}

function nodeClass(selected: boolean, highlighted: boolean): string { //classes do card do no
  if (highlighted) {
    return "border-teal-400 bg-teal-50 ring-2 ring-teal-200" //destaque da busca
  }
  if (selected) {
    return "border-brand-400 bg-brand-50 ring-2 ring-brand-200" //selecionado na navegacao
  }
  return "border-slate-200 bg-white hover:border-brand-200 hover:bg-brand-50/40" //idle
}

export default function StructurePage() { //pagina da estrutura fisica
  const [rooms, setRooms] = useState<Room[]>([]) //lista de salas
  const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null) //sala aberta
  const [branch, setBranch] = useState<TreeLevel[]>([]) //niveis a direita da sala
  const [loading, setLoading] = useState(true) //carregando salas
  const [branchLoading, setBranchLoading] = useState(false) //carregando um nivel
  const treeRef = useRef<HTMLDivElement>(null) //container da arvore (mede offsets)
  const nodeRefs = useRef(new Map<string, HTMLElement>()) //cards selecionaveis
  const [columnTops, setColumnTops] = useState<number[]>([]) //marginTop de cada coluna filha

  function setNodeRef(key: string, el: HTMLElement | null) { //registra no no mapa de refs
    if (el) nodeRefs.current.set(key, el)
    else nodeRefs.current.delete(key)
  }

  useLayoutEffect(() => { //alinha colunas filhas com o pai selecionado (arvore genealogica)
    // Altura do cabecalho da coluna (titulo + botao + mb-3) para alinhar card com card.
    const COLUMN_HEADER_PX = 36

    function offsetFor(el: HTMLElement | undefined, treeTop: number): number {
      if (!el) return 0
      // Desconta o header da coluna filha para o primeiro card ficar na altura do pai.
      return Math.max(
        0,
        Math.round(el.getBoundingClientRect().top - treeTop - COLUMN_HEADER_PX),
      )
    }

    function measure() {
      const tree = treeRef.current
      if (!tree || branch.length === 0) {
        setColumnTops([])
        return
      }

      const treeTop = tree.getBoundingClientRect().top
      const tops: number[] = []

      // Coluna 0 do branch (freezers): sobe/desce ate a sala selecionada.
      tops[0] =
        selectedRoomId != null
          ? offsetFor(nodeRefs.current.get(`room-${selectedRoomId}`), treeTop)
          : 0

      // Proximas colunas: alinham com o item selecionado da coluna anterior.
      for (let i = 0; i < branch.length - 1; i++) {
        const level = branch[i]
        if (level.kind === "positions" || !("selectedId" in level) || level.selectedId == null) {
          tops[i + 1] = tops[i] ?? 0
          continue
        }
        const el = nodeRefs.current.get(`${level.kind}-${level.selectedId}`)
        tops[i + 1] = el ? offsetFor(el, treeTop) : (tops[i] ?? 0)
      }

      setColumnTops((current) => {
        if (
          current.length === tops.length &&
          current.every((value, index) => value === tops[index])
        ) {
          return current //evita re-render inutil
        }
        return tops
      })
    }

    measure()
    window.addEventListener("resize", measure)
    return () => window.removeEventListener("resize", measure)
  }, [selectedRoomId, branch, rooms, branchLoading])
  const [error, setError] = useState<string | null>(null) //msg de erro

  const [query, setQuery] = useState("") //texto da busca
  const [searching, setSearching] = useState(false) //busca em andamento
  const [results, setResults] = useState<SampleWithLocation[] | null>(null) //resultado da busca
  const [pathHighlight, setPathHighlight] = useState<PathHighlight | null>(null) //caminho destacado
  const [activeSample, setActiveSample] = useState<SampleWithLocation | null>(null) //ficha aberta
  const [createTarget, setCreateTarget] = useState<CreateTarget | null>(null) //modal criar
  const [renameTarget, setRenameTarget] = useState<RenameTarget | null>(null) //modal rename
  const [moveTarget, setMoveTarget] = useState<MoveTarget | null>(null) //modal mover

  useEffect(() => {
    listRooms() //carrega salas no mount
      .then(setRooms)
      .catch(() => setError("Não foi possível carregar as salas."))
      .finally(() => setLoading(false))
  }, [])

  function clearLocate() { //limpa destaque/ficha da busca
    setPathHighlight(null)
    setActiveSample(null)
  }

  function closeSampleFicha() { //fecha modal da amostra
    clearLocate()
  }

  function removeItemFromBranch( //tira item do branch apos mover/excluir
    kind: "freezers" | "drawers" | "boxes",
    itemId: number,
  ) {
    setBranch((current) => {
      const level = current.find((entry) => entry.kind === kind) //nivel alvo
      if (!level || level.kind === "positions" || !("items" in level)) return current
      const items = level.items.filter((item) => item.id !== itemId) //remove o item
      const wasSelected = "selectedId" in level && level.selectedId === itemId //era o aberto?

      if (kind === "freezers" && wasSelected) {
        return [{ ...level, items, selectedId: undefined }] //recolhe tudo abaixo
      }
      if (kind === "drawers" && wasSelected) {
        return current
          .filter((entry) => entry.kind === "freezers" || entry.kind === "drawers") //corta boxes/mapa
          .map((entry) =>
            entry.kind === "drawers" ? { ...entry, items, selectedId: undefined } : entry,
          )
      }
      if (kind === "boxes" && wasSelected) {
        return current
          .filter((entry) => entry.kind !== "positions") //tira o mapa
          .map((entry) =>
            entry.kind === "boxes" ? { ...entry, items, selectedId: undefined } : entry,
          )
      }
      return current.map((entry) =>
        entry.kind === kind && "items" in entry ? { ...entry, items } : entry, //so atualiza lista
      )
    })
    clearLocate() //some highlight
  }

  async function openMoveFreezer(room: Room, freezer: Freezer, event: React.MouseEvent) { //abre mover freezer
    event.stopPropagation() //nao abre o no
    setMoveTarget({
      kind: "freezer",
      room,
      freezer,
      options: rooms.map((item) => ({ id: item.id, label: item.name })), //destinos = salas
      loading: false,
    })
  }

  async function openMoveDrawer(freezer: Freezer, drawer: Drawer, event: React.MouseEvent) { //abre mover gaveta
    event.stopPropagation()
    setMoveTarget({
      kind: "drawer",
      freezer,
      drawer,
      options: [],
      loading: true, //vai buscar freezers
    })
    try {
      const allRooms = rooms.length > 0 ? rooms : await listRooms() //salas disponiveis
      const nested = await Promise.all(
        allRooms.map(async (room) => {
          const freezers = await listFreezers(room.id) //freezers de cada sala
          return freezers.map((item) => ({
            id: item.id,
            label: `${room.name} / ${item.name}`, //rotulo composto
          }))
        }),
      )
      setMoveTarget((current) =>
        current?.kind === "drawer" && current.drawer.id === drawer.id
          ? { ...current, options: nested.flat(), loading: false } //preenche destinos
          : current,
      )
    } catch {
      setMoveTarget(null)
      setError("Não foi possível carregar destinos para mover a gaveta.")
    }
  }

  async function openMoveBox(drawer: Drawer, box: Box, event: React.MouseEvent) { //abre mover caixa
    event.stopPropagation()
    setMoveTarget({
      kind: "box",
      drawer,
      box,
      options: [],
      loading: true, //vai buscar gavetas
    })
    try {
      const allRooms = rooms.length > 0 ? rooms : await listRooms()
      const nested = await Promise.all(
        allRooms.map(async (room) => {
          const freezers = await listFreezers(room.id)
          const drawersNested = await Promise.all(
            freezers.map(async (freezer) => {
              const drawers = await listDrawers(freezer.id) //gavetas de cada freezer
              return drawers.map((item) => ({
                id: item.id,
                label: `${room.name} / ${freezer.name} / ${item.name}`,
              }))
            }),
          )
          return drawersNested.flat()
        }),
      )
      setMoveTarget((current) =>
        current?.kind === "box" && current.box.id === box.id
          ? { ...current, options: nested.flat(), loading: false }
          : current,
      )
    } catch {
      setMoveTarget(null)
      setError("Não foi possível carregar destinos para mover a caixa.")
    }
  }

  async function handleDeleteRoom(room: Room, event: React.MouseEvent) { //exclui sala (MVP: definitivo)
    event.stopPropagation()
    if (
      !window.confirm(
        `Excluir a sala "${room.name}"? Freezers, gavetas e caixas dentro também serão excluídos. Esta ação não pode ser desfeita.`,
      )
    ) {
      return //cancelou
    }
    try {
      await deleteRoom(room.id) //DELETE definitivo na API
      setRooms((current) => current.filter((item) => item.id !== room.id)) //tira da lista
      if (selectedRoomId === room.id) { //se era a aberta
        setBranch([])
        setSelectedRoomId(null)
        clearLocate()
      }
    } catch {
      setError("Não foi possível excluir a sala.")
    }
  }

  async function handleDeleteFreezer(room: Room, freezer: Freezer, event: React.MouseEvent) { //exclui freezer
    event.stopPropagation()
    if (
      !window.confirm(
        `Excluir o freezer "${freezer.name}"? Esta ação não pode ser desfeita.`,
      )
    ) {
      return
    }
    try {
      await deleteFreezer(room.id, freezer.id)
      setBranch((current) => {
        const freezersLevel = current.find((l) => l.kind === "freezers")
        if (!freezersLevel || freezersLevel.kind !== "freezers") return current
        const items = freezersLevel.items.filter((item) => item.id !== freezer.id)
        if (freezersLevel.selectedId === freezer.id) {
          return [{ ...freezersLevel, items, selectedId: undefined }] //recolhe filhos
        }
        return current.map((level) =>
          level.kind === "freezers" ? { ...level, items } : level,
        )
      })
      clearLocate()
    } catch {
      setError("Não foi possível excluir o freezer.")
    }
  }

  async function handleDeleteDrawer( //exclui gaveta
    freezer: Freezer,
    drawer: Drawer,
    event: React.MouseEvent,
  ) {
    event.stopPropagation()
    if (
      !window.confirm(
        `Excluir a gaveta "${drawer.name}"? Esta ação não pode ser desfeita.`,
      )
    ) {
      return
    }
    try {
      await deleteDrawer(freezer.id, drawer.id)
      setBranch((current) => {
        const drawersLevel = current.find((l) => l.kind === "drawers")
        if (!drawersLevel || drawersLevel.kind !== "drawers") return current
        const items = drawersLevel.items.filter((item) => item.id !== drawer.id)
        if (drawersLevel.selectedId === drawer.id) {
          return current
            .filter((level) => level.kind === "freezers" || level.kind === "drawers") //corta abaixo
            .map((level) =>
              level.kind === "drawers" ? { ...level, items, selectedId: undefined } : level,
            )
        }
        return current.map((level) =>
          level.kind === "drawers" ? { ...level, items } : level,
        )
      })
      clearLocate()
    } catch {
      setError("Não foi possível excluir a gaveta.")
    }
  }

  async function handleDeleteBox(drawer: Drawer, box: Box, event: React.MouseEvent) { //exclui caixa
    event.stopPropagation()
    if (
      !window.confirm(
        `Excluir a caixa "${box.name}"? Esta ação não pode ser desfeita.`,
      )
    ) {
      return
    }
    try {
      await deleteBox(drawer.id, box.id)
      setBranch((current) => {
        const boxesLevel = current.find((l) => l.kind === "boxes")
        if (!boxesLevel || boxesLevel.kind !== "boxes") return current
        const items = boxesLevel.items.filter((item) => item.id !== box.id)
        if (boxesLevel.selectedId === box.id) {
          return current
            .filter((level) => level.kind !== "positions") //fecha mapa
            .map((level) =>
              level.kind === "boxes" ? { ...level, items, selectedId: undefined } : level,
            )
        }
        return current.map((level) =>
          level.kind === "boxes" ? { ...level, items } : level,
        )
      })
      clearLocate()
    } catch {
      setError("Não foi possível excluir a caixa.")
    }
  }


  async function openRoom(room: Room) { //clique na sala (toggle)
    if (selectedRoomId === room.id && branch.length > 0) { //ja aberta: fecha
      setBranch([])
      setSelectedRoomId(null)
      clearLocate()
      return
    }

    setBranchLoading(true)
    setError(null)
    setSelectedRoomId(room.id)
    clearLocate()
    try {
      const freezers = await listFreezers(room.id) //carrega freezers
      setBranch([{ kind: "freezers", room, items: freezers }])
    } catch {
      setError("Não foi possível carregar os freezers.")
      setBranch([])
    } finally {
      setBranchLoading(false)
    }
  }

  async function openFreezer(room: Room, freezer: Freezer, freezers: Freezer[]) { //abre freezer
    const current = branch.find((l) => l.kind === "freezers")
    if (current?.kind === "freezers" && current.selectedId === freezer.id) { //toggle: fecha
      setBranch([{ kind: "freezers", room, items: freezers }])
      clearLocate()
      return
    }

    setBranchLoading(true)
    setError(null)
    clearLocate()
    try {
      const drawers = await listDrawers(freezer.id) //carrega gavetas
      setBranch([
        { kind: "freezers", room, items: freezers, selectedId: freezer.id },
        { kind: "drawers", room, freezer, items: drawers },
      ])
    } catch {
      setError("Não foi possível carregar as gavetas.")
    } finally {
      setBranchLoading(false)
    }
  }

  async function openDrawer( //abre gaveta
    room: Room,
    freezer: Freezer,
    drawer: Drawer,
    freezers: Freezer[],
    drawers: Drawer[],
  ) {
    const current = branch.find((l) => l.kind === "drawers")
    if (current?.kind === "drawers" && current.selectedId === drawer.id) { //toggle: fecha
      setBranch([
        { kind: "freezers", room, items: freezers, selectedId: freezer.id },
        { kind: "drawers", room, freezer, items: drawers },
      ])
      clearLocate()
      return
    }

    setBranchLoading(true)
    setError(null)
    clearLocate()
    try {
      const boxes = await listBoxes(drawer.id) //carrega caixas
      setBranch([
        { kind: "freezers", room, items: freezers, selectedId: freezer.id },
        { kind: "drawers", room, freezer, items: drawers, selectedId: drawer.id },
        { kind: "boxes", room, freezer, drawer, items: boxes },
      ])
    } catch {
      setError("Não foi possível carregar as caixas.")
    } finally {
      setBranchLoading(false)
    }
  }

  async function openBox( //abre caixa e mapa
    room: Room,
    freezer: Freezer,
    drawer: Drawer,
    box: Box,
    freezers: Freezer[],
    drawers: Drawer[],
    boxes: Box[],
  ) {
    const current = branch.find((l) => l.kind === "boxes")
    if (current?.kind === "boxes" && current.selectedId === box.id) { //toggle: fecha mapa
      setBranch([
        { kind: "freezers", room, items: freezers, selectedId: freezer.id },
        { kind: "drawers", room, freezer, items: drawers, selectedId: drawer.id },
        { kind: "boxes", room, freezer, drawer, items: boxes },
      ])
      clearLocate()
      return
    }

    setBranchLoading(true)
    setError(null)
    clearLocate()
    try {
      const positions = await listPositions(box.id) //celulas da caixa
      setBranch([
        { kind: "freezers", room, items: freezers, selectedId: freezer.id },
        { kind: "drawers", room, freezer, items: drawers, selectedId: drawer.id },
        { kind: "boxes", room, freezer, drawer, items: boxes, selectedId: box.id },
        { kind: "positions", room, freezer, drawer, box, positions },
      ])
    } catch {
      setError("Não foi possível carregar as posições.")
    } finally {
      setBranchLoading(false)
    }
  }

  async function locateSample(sample: SampleWithLocation) { //abre caminho ate a amostra
    setBranchLoading(true)
    setError(null)
    try {
      const room: Room = { id: sample.room_id, name: sample.room } //stubs do caminho
      const freezer: Freezer = {
        id: sample.freezer_id,
        name: sample.freezer,
        room_id: sample.room_id,
      }
      const drawer: Drawer = {
        id: sample.drawer_id,
        name: sample.drawer,
        freezer_id: sample.freezer_id,
      }
      const boxStub: Box = {
        id: sample.box_id,
        name: sample.box,
        rows: 0,
        columns: 0,
        drawer_id: sample.drawer_id,
      }

      const [freezers, drawers, boxes, positions] = await Promise.all([ //carrega tudo em paralelo
        listFreezers(sample.room_id),
        listDrawers(sample.freezer_id),
        listBoxes(sample.drawer_id),
        listPositions(sample.box_id),
      ])

      const box = boxes.find((b) => b.id === sample.box_id) ?? boxStub //prefira a caixa completa

      setSelectedRoomId(sample.room_id)
      setPathHighlight({ //marca o caminho na UI
        roomId: sample.room_id,
        freezerId: sample.freezer_id,
        drawerId: sample.drawer_id,
        boxId: sample.box_id,
        positionId: sample.position_id,
      })
      setActiveSample(sample) //abre ficha
      setBranch([
        { kind: "freezers", room, items: freezers, selectedId: freezer.id },
        { kind: "drawers", room, freezer, items: drawers, selectedId: drawer.id },
        { kind: "boxes", room, freezer, drawer, items: boxes, selectedId: box.id },
        { kind: "positions", room, freezer, drawer, box, positions },
      ])
    } catch {
      setError("Não foi possível abrir a localização da amostra.")
    } finally {
      setBranchLoading(false)
    }
  }

  async function handleSearch(event: React.FormEvent) { //submit da busca
    event.preventDefault()
    const q = query.trim()
    if (!q) {
      setResults([]) //vazio = lista vazia
      return
    }

    setSearching(true)
    setError(null)
    try {
      const found = await searchSamples(q)
      setResults(found)
      if (found.length === 1) {
        await locateSample(found[0]) //resultado unico: ja localiza
      }
    } catch {
      setError("Não foi possível buscar amostras.")
      setResults([])
    } finally {
      setSearching(false)
    }
  }

  function goBack() { //recolhe o ultimo nivel do branch
    if (branch.length === 0) return
    if (branch.length === 1) { //so freezers: fecha sala
      setBranch([])
      setSelectedRoomId(null)
      clearLocate()
      return
    }
    clearLocate()
    setBranch((current) => {
      const next = current.slice(0, -1) //corta o ultimo
      const last = next[next.length - 1]
      if (last && last.kind !== "positions" && "selectedId" in last) {
        return next.map((level, i) =>
          i === next.length - 1 && level.kind !== "positions"
            ? { ...level, selectedId: undefined } //desmarca o novo ultimo
            : level,
        )
      }
      return next
    })
  }

  const positionsLevel = branch.find((l) => l.kind === "positions") as //nivel do mapa, se aberto
    | Extract<TreeLevel, { kind: "positions" }>
    | undefined

  function handlePositionClick(cell: PositionCell) { //clique numa celula ocupada
    if (!cell.sample || !positionsLevel) return
    setActiveSample({ //monta SampleWithLocation pra ficha
      id: cell.sample.id,
      codigo_amostra: cell.sample.codigo_amostra,
      paciente_nome: cell.sample.paciente_nome,
      material: cell.sample.material,
      concentracao_ng_ul: cell.sample.concentracao_ng_ul,
      exame: cell.sample.exame,
      observacao: cell.sample.observacao,
      created_at: "",
      updated_at: "",
      position_id: cell.id,
      label: cell.label,
      row: cell.row,
      column: cell.column,
      room: positionsLevel.room.name,
      freezer: positionsLevel.freezer.name,
      drawer: positionsLevel.drawer.name,
      box: positionsLevel.box.name,
      room_id: positionsLevel.room.id,
      freezer_id: positionsLevel.freezer.id,
      drawer_id: positionsLevel.drawer.id,
      box_id: positionsLevel.box.id,
      linhas: positionsLevel.box.rows,
      colunas: positionsLevel.box.columns,
      path: `${positionsLevel.room.name} / ${positionsLevel.freezer.name} / ${positionsLevel.drawer.name} / ${positionsLevel.box.name} / ${cell.label}`,
    })
    setPathHighlight({ //destaca o caminho ate a celula
      roomId: positionsLevel.room.id,
      freezerId: positionsLevel.freezer.id,
      drawerId: positionsLevel.drawer.id,
      boxId: positionsLevel.box.id,
      positionId: cell.id,
    })
  }

  const freezersItems = //lista de freezers do branch (pra open*)
    branch.find((l) => l.kind === "freezers")?.kind === "freezers"
      ? (branch.find((l) => l.kind === "freezers") as Extract<TreeLevel, { kind: "freezers" }>)
          .items
      : []
  const drawersItems = //lista de gavetas do branch
    branch.find((l) => l.kind === "drawers")?.kind === "drawers"
      ? (branch.find((l) => l.kind === "drawers") as Extract<TreeLevel, { kind: "drawers" }>).items
      : []
  const boxesItems = //lista de caixas do branch
    branch.find((l) => l.kind === "boxes")?.kind === "boxes"
      ? (branch.find((l) => l.kind === "boxes") as Extract<TreeLevel, { kind: "boxes" }>).items
      : []

  return (
    <div className="mx-auto max-w-6xl"> {/*pagina da estrutura*/}
      <div className="flex items-start justify-between gap-4"> {/*cabecalho + acoes*/}
        <PageHeader
          eyebrow="Estrutura"
          title="Estrutura Física"
          description="Busque uma amostra ou navegue na árvore. Excluir remove a estrutura (definitivo neste MVP)."
        />
        <div className="flex items-center gap-2"> {/*atalhos a direita*/}
          {/* FUTURO: atalho da lixeira
          <Link
            to="/lixeira"
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
          >
            Lixeira
          </Link>
          */}
          {branch.length > 0 && ( //voltar so se tem branch

            <button
              type="button"
              onClick={goBack} //recolhe nivel
              className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
              title="Recolher etapa"
            >
              <span aria-hidden className="text-lg leading-none">
                ←
              </span>
              Voltar
            </button>
          )}
        </div>
      </div>

      <form onSubmit={handleSearch} className="mt-6 flex flex-wrap gap-3"> {/*barra de busca*/}
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)} //texto da busca
          placeholder="Buscar por código da amostra ou paciente..."
          className="min-w-[16rem] flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
        />
        <button
          type="submit"
          disabled={searching}
          className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:bg-slate-300"
        >
          {searching ? "Buscando..." : "Buscar"}
        </button>
      </form>

      {results && ( //painel de resultados
        <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Resultados ({results.length})
          </p>
          {results.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">Nenhuma amostra encontrada.</p>
          ) : (
            <ul className="mt-3 max-h-48 space-y-2 overflow-y-auto"> {/*lista scrollavel*/}
              {results.map((sample) => {
                const active = activeSample?.id === sample.id //destaque do ativo
                return (
                  <li key={sample.id}>
                    <button
                      type="button"
                      onClick={() => locateSample(sample)} //localiza na arvore
                      className={[
                        "w-full rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                        active
                          ? "border-teal-400 bg-teal-50"
                          : "border-slate-200 hover:border-teal-200 hover:bg-teal-50/40",
                      ].join(" ")}
                    >
                      <span className="font-semibold text-slate-900">
                        {sample.codigo_amostra}
                      </span>
                      <span className="text-slate-500"> — {sample.paciente_nome}</span>
                      <p className="mt-0.5 text-xs text-slate-500">{sample.path}</p>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}

      {activeSample && ( //modal ficha da amostra
        <SampleDetailModal
          sample={activeSample}
          onClose={closeSampleFicha}
          onDeleted={async () => {
            // Amostra apagada: limpa destaque e atualiza o mapa se estiver aberto.
            const boxId = activeSample.box_id
            clearLocate()
            setResults(null)
            const positionsLevel = branch.find((l) => l.kind === "positions")
            if (positionsLevel?.kind === "positions" && positionsLevel.box.id === boxId) {
              try {
                const positions = await listPositions(boxId) //recarrega grade livre/ocupada
                setBranch((current) =>
                  current.map((level) =>
                    level.kind === "positions" ? { ...level, positions } : level,
                  ),
                )
              } catch {
                setError("Amostra excluída, mas não foi possível atualizar o mapa.")
              }
            }
          }}
        />
      )}



      {createTarget && ( //modal criar entidade
        <CreateEntityModal
          level={createTarget.level}
          parentLabel={
            createTarget.level === "freezer"
              ? createTarget.room.name
              : createTarget.level === "drawer"
                ? createTarget.freezer.name
                : createTarget.level === "box"
                  ? createTarget.drawer.name
                  : undefined
          }
          roomId={
            createTarget.level === "freezer"
              ? createTarget.room.id
              : createTarget.level === "drawer"
                ? createTarget.room.id
                : createTarget.level === "box"
                  ? createTarget.room.id
                  : undefined
          }
          freezerId={
            createTarget.level === "drawer" || createTarget.level === "box"
              ? createTarget.freezer.id
              : undefined
          }
          drawerId={createTarget.level === "box" ? createTarget.drawer.id : undefined}
          onClose={() => setCreateTarget(null)} //fecha sem criar
          onCreated={(result) => { //atualiza UI apos criar
            const target = createTarget
            setCreateTarget(null)

            if (result.level === "room") { //nova sala na lista
              setRooms((current) =>
                [...current, { id: result.id, name: result.name }].sort((a, b) =>
                  a.name.localeCompare(b.name),
                ),
              )
              return
            }

            if (result.level === "freezer" && target.level === "freezer") { //insere freezer
              const freezer: Freezer = {
                id: result.id,
                name: result.name,
                room_id: target.room.id,
              }
              setBranch((current) =>
                current.map((level) =>
                  level.kind === "freezers"
                    ? {
                        ...level,
                        items: [...level.items, freezer].sort((a, b) =>
                          a.name.localeCompare(b.name),
                        ),
                      }
                    : level,
                ),
              )
              return
            }

            if (result.level === "drawer" && target.level === "drawer") { //insere gaveta
              const drawer: Drawer = {
                id: result.id,
                name: result.name,
                freezer_id: target.freezer.id,
              }
              setBranch((current) =>
                current.map((level) =>
                  level.kind === "drawers"
                    ? {
                        ...level,
                        items: [...level.items, drawer].sort((a, b) =>
                          a.name.localeCompare(b.name),
                        ),
                      }
                    : level,
                ),
              )
              return
            }

            if (result.level === "box" && target.level === "box") {
              // Recarrega a lista pra pegar rows/columns gerados pelo backend.
              listBoxes(target.drawer.id).then((boxes) => {
                setBranch((current) =>
                  current.map((level) =>
                    level.kind === "boxes" ? { ...level, items: boxes } : level,
                  ),
                )
              })
            }
          }}
        />
      )}

      {renameTarget && ( //modal renomear
        <RenameEntityModal
          title={
            renameTarget.kind === "room"
              ? "Renomear sala"
              : renameTarget.kind === "freezer"
                ? "Renomear freezer"
                : renameTarget.kind === "drawer"
                  ? "Renomear gaveta"
                  : "Renomear caixa"
          }
          currentName={
            renameTarget.kind === "room"
              ? renameTarget.room.name
              : renameTarget.kind === "freezer"
                ? renameTarget.freezer.name
                : renameTarget.kind === "drawer"
                  ? renameTarget.drawer.name
                  : renameTarget.box.name
          }
          onClose={() => setRenameTarget(null)}
          onSave={async (name) => { //PATCH + atualiza estado
            if (renameTarget.kind === "room") {
              const updated = await updateRoom(renameTarget.room.id, name)
              setRooms((current) =>
                current
                  .map((room) => (room.id === updated.id ? updated : room))
                  .sort((a, b) => a.name.localeCompare(b.name)),
              )
              setBranch((current) =>
                current.map((level) =>
                  "room" in level && level.room.id === updated.id
                    ? { ...level, room: updated } //propaga nome nos niveis
                    : level,
                ),
              )
              return
            }

            if (renameTarget.kind === "freezer") {
              const updated = await updateFreezer(
                renameTarget.room.id,
                renameTarget.freezer.id,
                { name },
              )
              setBranch((current) =>
                current.map((level) => {
                  if (level.kind === "freezers") {
                    return {
                      ...level,
                      items: level.items
                        .map((item) => (item.id === updated.id ? updated : item))
                        .sort((a, b) => a.name.localeCompare(b.name)),
                    }
                  }
                  if ("freezer" in level && level.freezer.id === updated.id) {
                    return { ...level, freezer: updated } //atualiza ref nos filhos
                  }
                  return level
                }),
              )
              return
            }

            if (renameTarget.kind === "drawer") {
              const updated = await updateDrawer(
                renameTarget.freezer.id,
                renameTarget.drawer.id,
                { name },
              )
              setBranch((current) =>
                current.map((level) => {
                  if (level.kind === "drawers") {
                    return {
                      ...level,
                      items: level.items
                        .map((item) => (item.id === updated.id ? updated : item))
                        .sort((a, b) => a.name.localeCompare(b.name)),
                    }
                  }
                  if ("drawer" in level && level.drawer.id === updated.id) {
                    return { ...level, drawer: updated }
                  }
                  return level
                }),
              )
              return
            }

            const updated = await updateBox(renameTarget.drawer.id, renameTarget.box.id, {
              name,
            })
            setBranch((current) =>
              current.map((level) => {
                if (level.kind === "boxes") {
                  return {
                    ...level,
                    items: level.items
                      .map((item) => (item.id === updated.id ? updated : item))
                      .sort((a, b) => a.name.localeCompare(b.name)),
                  }
                }
                if (level.kind === "positions" && level.box.id === updated.id) {
                  return { ...level, box: updated } //atualiza mapa
                }
                return level
              }),
            )
          }}
        />
      )}

      {moveTarget && ( //modal mover
        <MoveEntityModal
          title={
            moveTarget.kind === "freezer"
              ? "Mover freezer"
              : moveTarget.kind === "drawer"
                ? "Mover gaveta"
                : "Mover caixa"
          }
          itemName={
            moveTarget.kind === "freezer"
              ? moveTarget.freezer.name
              : moveTarget.kind === "drawer"
                ? moveTarget.drawer.name
                : moveTarget.box.name
          }
          parentLabel={
            moveTarget.kind === "freezer"
              ? "Sala"
              : moveTarget.kind === "drawer"
                ? "Freezer"
                : "Gaveta"
          }
          currentParentId={
            moveTarget.kind === "freezer"
              ? moveTarget.room.id
              : moveTarget.kind === "drawer"
                ? moveTarget.freezer.id
                : moveTarget.drawer.id
          }
          options={moveTarget.options}
          loadingOptions={moveTarget.loading}
          onClose={() => setMoveTarget(null)}
          onMove={async (parentId) => { //PATCH parent + tira do branch
            if (moveTarget.kind === "freezer") {
              await updateFreezer(moveTarget.room.id, moveTarget.freezer.id, {
                room_id: parentId,
              })
              removeItemFromBranch("freezers", moveTarget.freezer.id)
              return
            }
            if (moveTarget.kind === "drawer") {
              await updateDrawer(moveTarget.freezer.id, moveTarget.drawer.id, {
                freezer_id: parentId,
              })
              removeItemFromBranch("drawers", moveTarget.drawer.id)
              return
            }
            await updateBox(moveTarget.drawer.id, moveTarget.box.id, {
              drawer_id: parentId,
            })
            removeItemFromBranch("boxes", moveTarget.box.id)
          }}
        />
      )}

      {loading && <p className="mt-8 text-sm text-slate-400">Carregando salas...</p>}
      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      {!loading && ( //arvore horizontal (deslocamento vertical = genealogica)
        <div className="mt-8 overflow-x-auto pb-8"> {/*scroll se estreitar*/}
          <div ref={treeRef} className="flex min-w-min items-start"> {/*colunas lado a lado*/}
            <div className="w-52 shrink-0"> {/*coluna salas*/}
              <div className="mb-3 flex items-center justify-between gap-2">
                <p className="text-xs font-bold uppercase tracking-wider text-brand-600">
                  Salas
                </p>
                <button
                  type="button"
                  title="Nova sala"
                  onClick={() => setCreateTarget({ level: "room" })} //abre criar sala
                  className="flex h-6 w-6 items-center justify-center rounded-md border border-slate-200 bg-white text-sm font-bold text-brand-600 hover:bg-brand-50"
                >
                  +
                </button>
              </div>
              <ul className="flex flex-col gap-2">
                {rooms.length === 0 && (
                  <li className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-400">
                    Nenhuma sala. Use o + para criar.
                  </li>
                )}
                {rooms.map((room) => {
                  const selected = selectedRoomId === room.id
                  const highlighted = pathHighlight?.roomId === room.id
                  return (
                    <li
                      key={room.id}
                      ref={(el) => setNodeRef(`room-${room.id}`, el)}
                      className="relative"
                    > {/*card da sala*/}
                      <button
                        type="button"
                        onClick={() => openRoom(room)} //abre/fecha freezers
                        className={[
                          "w-full rounded-xl border px-4 py-3 pb-9 pr-10 text-left shadow-sm transition-colors",
                          nodeClass(selected, highlighted),
                        ].join(" ")}
                      >
                        <span
                          className={[
                            "rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase",
                            highlighted
                              ? "bg-teal-100 text-teal-800"
                              : "bg-brand-100 text-brand-700",
                          ].join(" ")}
                        >
                          Sala
                        </span>
                        <p className="mt-2 text-sm font-semibold text-slate-900">{room.name}</p>
                      </button>
                      <button
                        type="button"
                        title="Excluir"
                        onClick={(event) => handleDeleteRoom(room, event)} //hard delete (MVP)

                        className="absolute right-2 top-2 rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-xs text-slate-500 hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                      >
                        ×
                      </button>
                      <div className="absolute bottom-2 right-2 flex gap-1"> {/*acoes*/}
                        <button
                          type="button"
                          title="Renomear"
                          onClick={(event) => {
                            event.stopPropagation()
                            setRenameTarget({ kind: "room", room }) //abre rename
                          }}
                          className={actionBtnClass}
                        >
                          ✎
                        </button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>

            {branch.map((level, index) => ( //colunas do branch (offset = pai selecionado)
              <div
                key={`${level.kind}-${index}`}
                className="flex items-start transition-[margin-top] duration-300 ease-out"
                style={{ marginTop: columnTops[index] ?? 0 }} //desce ate o pai
              >
                <div
                  className="relative mx-2 hidden h-14 w-10 shrink-0 sm:block"
                  aria-hidden
                >
                  {/* conector horizontal na altura do card pai */}
                  <div className="absolute left-0 right-0 top-1/2 border-t-2 border-slate-300" />
                  <div className="absolute right-0 top-1/2 h-2 w-2 -translate-y-1/2 translate-x-1/2 rounded-full bg-slate-300" />
                </div>
                <div className={level.kind === "positions" ? "w-[28rem] shrink-0" : "w-52 shrink-0"}> {/*mapa mais largo*/}
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      {LEVEL_LABEL[level.kind]}
                    </p>
                    <div className="flex items-center gap-1"> {/*+ e voltar*/}
                      {level.kind === "freezers" && (
                        <button
                          type="button"
                          title="Novo freezer"
                          onClick={() =>
                            setCreateTarget({ level: "freezer", room: level.room })
                          }
                          className="flex h-6 w-6 items-center justify-center rounded-md border border-slate-200 bg-white text-sm font-bold text-brand-600 hover:bg-brand-50"
                        >
                          +
                        </button>
                      )}
                      {level.kind === "drawers" && (
                        <button
                          type="button"
                          title="Nova gaveta"
                          onClick={() =>
                            setCreateTarget({
                              level: "drawer",
                              room: level.room,
                              freezer: level.freezer,
                            })
                          }
                          className="flex h-6 w-6 items-center justify-center rounded-md border border-slate-200 bg-white text-sm font-bold text-brand-600 hover:bg-brand-50"
                        >
                          +
                        </button>
                      )}
                      {level.kind === "boxes" && (
                        <button
                          type="button"
                          title="Nova caixa"
                          onClick={() =>
                            setCreateTarget({
                              level: "box",
                              room: level.room,
                              freezer: level.freezer,
                              drawer: level.drawer,
                            })
                          }
                          className="flex h-6 w-6 items-center justify-center rounded-md border border-slate-200 bg-white text-sm font-bold text-brand-600 hover:bg-brand-50"
                        >
                          +
                        </button>
                      )}
                      {index === branch.length - 1 && ( //voltar so na ultima coluna
                        <button
                          type="button"
                          onClick={goBack}
                          className="rounded-md border border-slate-200 bg-white px-2 py-0.5 text-sm text-slate-600 hover:bg-slate-50"
                          title="Recolher esta etapa"
                        >
                          ←
                        </button>
                      )}
                    </div>
                  </div>

                  {level.kind === "positions" ? ( //mapa de posicoes
                    <BoxMap
                      boxName={level.box.name}
                      positions={level.positions}
                      highlightPositionId={pathHighlight?.positionId}
                      onPositionClick={handlePositionClick}
                    />
                  ) : (
                    <ul className="flex flex-col gap-2"> {/*lista de itens do nivel*/}
                      {level.items.length === 0 && (
                        <li className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-400">
                          Vazio
                        </li>
                      )}
                      {level.items.map((item) => {
                        const selected =
                          "selectedId" in level && level.selectedId === item.id
                        const highlighted =
                          (level.kind === "freezers" &&
                            pathHighlight?.freezerId === item.id) ||
                          (level.kind === "drawers" && pathHighlight?.drawerId === item.id) ||
                          (level.kind === "boxes" && pathHighlight?.boxId === item.id)

                        return (
                          <li
                            key={item.id}
                            ref={(el) => setNodeRef(`${level.kind}-${item.id}`, el)}
                            className="relative"
                          > {/*card do no*/}
                            <button
                              type="button"
                              disabled={branchLoading}
                              onClick={() => { //abre o proximo nivel
                                if (level.kind === "freezers") {
                                  openFreezer(level.room, item as Freezer, freezersItems)
                                } else if (level.kind === "drawers") {
                                  openDrawer(
                                    level.room,
                                    level.freezer,
                                    item as Drawer,
                                    freezersItems,
                                    drawersItems,
                                  )
                                } else if (level.kind === "boxes") {
                                  openBox(
                                    level.room,
                                    level.freezer,
                                    level.drawer,
                                    item as Box,
                                    freezersItems,
                                    drawersItems,
                                    boxesItems,
                                  )
                                }
                              }}
                              className={[
                                "w-full rounded-xl border px-4 py-3 pb-9 pr-10 text-left shadow-sm transition-colors",
                                nodeClass(selected, Boolean(highlighted)),
                              ].join(" ")}
                            >
                              <span
                                className={[
                                  "rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase",
                                  highlighted
                                    ? "bg-teal-100 text-teal-800"
                                    : "bg-slate-100 text-slate-600",
                                ].join(" ")}
                              >
                                {level.kind === "freezers"
                                  ? "Freezer"
                                  : level.kind === "drawers"
                                    ? "Gaveta"
                                    : "Caixa"}
                              </span>
                              <p className="mt-2 text-sm font-semibold text-slate-900">
                                {item.name}
                              </p>
                              {level.kind === "boxes" && ( //dimensoes da caixa
                                <p className="mt-1 text-xs text-slate-500">
                                  {(item as Box).rows}×{(item as Box).columns}
                                </p>
                              )}
                            </button>
                            <button
                              type="button"
                              title="Excluir"
                              onClick={(event) => { //soft-delete conforme o nivel
                                if (level.kind === "freezers") {
                                  handleDeleteFreezer(level.room, item as Freezer, event)
                                } else if (level.kind === "drawers") {
                                  handleDeleteDrawer(level.freezer, item as Drawer, event)
                                } else if (level.kind === "boxes") {
                                  handleDeleteBox(level.drawer, item as Box, event)
                                }
                              }}
                              className="absolute right-2 top-2 rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-xs text-slate-500 hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                            >
                              ×
                            </button>
                            <div className="absolute bottom-2 right-2 flex gap-1"> {/*renomear / mover*/}
                              <button
                                type="button"
                                title="Renomear"
                                onClick={(event) => {
                                  event.stopPropagation()
                                  if (level.kind === "freezers") {
                                    setRenameTarget({
                                      kind: "freezer",
                                      room: level.room,
                                      freezer: item as Freezer,
                                    })
                                  } else if (level.kind === "drawers") {
                                    setRenameTarget({
                                      kind: "drawer",
                                      freezer: level.freezer,
                                      drawer: item as Drawer,
                                    })
                                  } else if (level.kind === "boxes") {
                                    setRenameTarget({
                                      kind: "box",
                                      drawer: level.drawer,
                                      box: item as Box,
                                    })
                                  }
                                }}
                                className={actionBtnClass}
                              >
                                ✎
                              </button>
                              <button
                                type="button"
                                title="Mover"
                                onClick={(event) => { //abre modal de mover
                                  if (level.kind === "freezers") {
                                    openMoveFreezer(level.room, item as Freezer, event)
                                  } else if (level.kind === "drawers") {
                                    openMoveDrawer(level.freezer, item as Drawer, event)
                                  } else if (level.kind === "boxes") {
                                    openMoveBox(level.drawer, item as Box, event)
                                  }
                                }}
                                className={actionBtnClass}
                              >
                                ⇄
                              </button>
                            </div>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </div>
              </div>
            ))}

            {branchLoading && ( //loading ao lado do branch
              <p
                className="ml-4 text-sm text-slate-400 transition-[margin-top] duration-300 ease-out"
                style={{ marginTop: (columnTops[branch.length - 1] ?? 0) + 56 }}
              >
                Carregando...
              </p>
            )}
          </div>
        </div>
      )}

      {positionsLevel && ( //breadcrumb do mapa aberto
        <p className="mt-6 text-xs text-slate-500">
          Caminho: {positionsLevel.room.name} / {positionsLevel.freezer.name} /{" "}
          {positionsLevel.drawer.name} / {positionsLevel.box.name}
        </p>
      )}
    </div>
  )
}
