import { useEffect, useState } from "react" //hooks
import { listBoxes, listDrawers, listFreezers, listRooms } from "../api/resources" //listagens por nivel
import type { AllocationScope, Location } from "../types/api" //tipos
import CreateEntityModal, { type CreateLevel } from "./CreateEntityModal" //modal de criar

type Level = CreateLevel //alias local

interface Option { //item do dropdown modificar
  id: number
  name: string
}

interface PathState { //caminho escolhido na trilha
  room_id?: number
  room?: string
  freezer_id?: number
  freezer?: string
  drawer_id?: number
  drawer?: string
  box_id?: number
  box?: string
}

interface LocationTrailProps { //props da trilha
  suggestion: Location | null //sugestao atual (preenche path)
  onScopeChange: (scope: AllocationScope) => void //avisa parent do filtro
  openCreateLevel?: CreateLevel | null //pedido externo pra abrir criar
  onOpenCreateHandled?: () => void //confirma que ja abriu
}

const LEVELS: { //config visual de cada card
  level: Level
  title: string
  modifyLabel: string
  accent: string //badge liberado
  accentLocked: string //badge bloqueado
}[] = [
  {
    level: "room",
    title: "Sala",
    modifyLabel: "Modificar sala",
    accent: "bg-brand-100 text-brand-700",
    accentLocked: "bg-slate-100 text-slate-400",
  },
  {
    level: "freezer",
    title: "Freezer",
    modifyLabel: "Modificar freezer",
    accent: "bg-sky-100 text-sky-700",
    accentLocked: "bg-slate-100 text-slate-400",
  },
  {
    level: "drawer",
    title: "Gaveta",
    modifyLabel: "Modificar gaveta",
    accent: "bg-emerald-100 text-emerald-700",
    accentLocked: "bg-slate-100 text-slate-400",
  },
  {
    level: "box",
    title: "Caixa",
    modifyLabel: "Modificar caixa",
    accent: "bg-orange-100 text-orange-700",
    accentLocked: "bg-slate-100 text-slate-400",
  },
]

function pathFromSuggestion(suggestion: Location | null): PathState { //Location → PathState
  if (!suggestion) return {}
  return {
    room_id: suggestion.room_id,
    room: suggestion.room,
    freezer_id: suggestion.freezer_id,
    freezer: suggestion.freezer,
    drawer_id: suggestion.drawer_id,
    drawer: suggestion.drawer,
    box_id: suggestion.box_id,
    box: suggestion.box,
  }
}

function scopeFromPath(path: PathState): AllocationScope { //PathState → filtro da API
  if (path.box_id) { //mais especifico ganha
    return {
      room_id: path.room_id,
      freezer_id: path.freezer_id,
      drawer_id: path.drawer_id,
      box_id: path.box_id,
    }
  }
  if (path.drawer_id) {
    return { room_id: path.room_id, freezer_id: path.freezer_id, drawer_id: path.drawer_id }
  }
  if (path.freezer_id) {
    return { room_id: path.room_id, freezer_id: path.freezer_id }
  }
  if (path.room_id) {
    return { room_id: path.room_id }
  }
  return {} //sem filtro
}

export default function LocationTrail({
  suggestion,
  onScopeChange,
  openCreateLevel = null,
  onOpenCreateHandled,
}: LocationTrailProps) {
  const [path, setPath] = useState<PathState>(() => pathFromSuggestion(suggestion)) //caminho local
  const [openLevel, setOpenLevel] = useState<Level | null>(null) //dropdown aberto
  const [createLevel, setCreateLevel] = useState<CreateLevel | null>(null) //modal criar
  const [options, setOptions] = useState<Option[]>([]) //itens do dropdown
  const [loading, setLoading] = useState(false) //fetch do dropdown
  const [loadError, setLoadError] = useState<string | null>(null) //erro do dropdown

  useEffect(() => { //sugestao nova → sincroniza cards
    if (suggestion) setPath(pathFromSuggestion(suggestion))
  }, [suggestion])

  useEffect(() => { //pedido externo pra abrir criar (ex: sem salas)
    if (!openCreateLevel) return

    let level: CreateLevel = openCreateLevel
    if (level === "box" && !path.drawer_id) level = "drawer" //cai pro pai que falta
    if (level === "drawer" && !path.freezer_id) level = "freezer"
    if (level === "freezer" && !path.room_id) level = "room"

    setCreateLevel(level) //abre o modal
    onOpenCreateHandled?.() //avisa que ja tratou
  }, [openCreateLevel, onOpenCreateHandled, path.room_id, path.freezer_id, path.drawer_id])

  useEffect(() => { //carrega opcoes do nivel aberto
    if (!openLevel) return

    let cancelled = false //evita setState apos unmount / troca
    setLoading(true)
    setLoadError(null)
    setOptions([])

    const fetchers: Record<Level, () => Promise<Option[]>> = { //API por nivel
      room: () => listRooms(),
      freezer: () =>
        path.room_id ? listFreezers(path.room_id) : Promise.resolve([]),
      drawer: () =>
        path.freezer_id ? listDrawers(path.freezer_id) : Promise.resolve([]),
      box: () => (path.drawer_id ? listBoxes(path.drawer_id) : Promise.resolve([])),
    }

    fetchers[openLevel]()
      .then((items) => {
        if (!cancelled) setOptions(items)
      })
      .catch(() => {
        if (!cancelled) setLoadError("Não foi possível carregar as opções.")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true //cleanup
    }
  }, [openLevel, path.room_id, path.freezer_id, path.drawer_id])

  /** Nível liberado: o pai imediato já existe (sala sempre liberada). */
  function isUnlocked(level: Level): boolean { //pode interagir?
    if (level === "room") return true //sala sempre livre
    if (level === "freezer") return path.room_id !== undefined
    if (level === "drawer") return path.freezer_id !== undefined
    return path.drawer_id !== undefined //caixa precisa de gaveta
  }

  function selectOption(level: Level, option: Option) { //escolhe item e corta filhos
    setOpenLevel(null) //fecha dropdown
    let next: PathState = { ...path }

    if (level === "room") { //troca sala zera o resto
      next = { room_id: option.id, room: option.name }
    } else if (level === "freezer") { //mantem sala, zera abaixo
      next = {
        room_id: path.room_id,
        room: path.room,
        freezer_id: option.id,
        freezer: option.name,
      }
    } else if (level === "drawer") { //mantem ate freezer
      next = {
        room_id: path.room_id,
        room: path.room,
        freezer_id: path.freezer_id,
        freezer: path.freezer,
        drawer_id: option.id,
        drawer: option.name,
      }
    } else { //so atualiza caixa
      next = {
        ...path,
        box_id: option.id,
        box: option.name,
      }
    }

    setPath(next)
    onScopeChange(scopeFromPath(next)) //parent recalcula sugestao
  }

  function handleCreated(result: { id: number; name: string; level: CreateLevel }) { //apos criar
    setCreateLevel(null) //fecha modal
    selectOption(result.level, { id: result.id, name: result.name }) //ja seleciona o novo
  }

  const display: Record<Level, string> = { //texto nos cards
    room: path.room ?? "—",
    freezer: path.freezer ?? "—",
    drawer: path.drawer ?? "—",
    box: path.box ?? "—",
  }

  const parentLabel = //nome do pai pro modal criar
    createLevel === "freezer"
      ? path.room
      : createLevel === "drawer"
        ? path.freezer
        : createLevel === "box"
          ? path.drawer
          : undefined

  const positionReady = Boolean(suggestion?.label) //tem posicao automatica?

  return (
    <>
      {createLevel && ( //modal de criar nivel
        <CreateEntityModal
          level={createLevel}
          parentLabel={parentLabel}
          roomId={path.room_id}
          freezerId={path.freezer_id}
          drawerId={path.drawer_id}
          onClose={() => setCreateLevel(null)}
          onCreated={handleCreated}
        />
      )}

      <div className="flex flex-wrap items-start gap-3"> {/*cards em fila*/}
        {LEVELS.map(({ level, title, modifyLabel, accent, accentLocked }, index) => {
          const unlocked = isUnlocked(level) //liberado?

          return (
            <div key={level} className="flex items-start gap-3">
              {index > 0 && ( //seta entre cards
                <span
                  className={`mt-8 hidden sm:inline ${unlocked ? "text-brand-300" : "text-slate-200"}`}
                  aria-hidden
                >
                  →
                </span>
              )}

              <div className="relative w-36"> {/*card do nivel*/}
                <div
                  className={[
                    "rounded-xl border px-3 py-3 shadow-sm",
                    unlocked
                      ? "border-slate-200 bg-white"
                      : "border-slate-100 bg-slate-50 opacity-70", //apagado se bloqueado
                  ].join(" ")}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span
                      className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                        unlocked ? accent : accentLocked
                      }`}
                    >
                      {title} {/*badge do nivel*/}
                    </span>
                    <button
                      type="button"
                      title={
                        unlocked
                          ? `Adicionar ${title.toLowerCase()}`
                          : `Crie o nível anterior primeiro`
                      }
                      disabled={!unlocked}
                      onClick={() => setCreateLevel(level)} //abre criar
                      className="flex h-6 w-6 items-center justify-center rounded-md border border-slate-200 text-sm font-bold text-brand-600 hover:bg-brand-50 disabled:cursor-not-allowed disabled:border-slate-100 disabled:bg-slate-100 disabled:text-slate-300"
                    >
                      +
                    </button>
                  </div>
                  <p
                    className={`mt-2 text-sm font-semibold ${
                      unlocked ? "text-slate-800" : "text-slate-400"
                    }`}
                  >
                    {display[level]} {/*nome escolhido ou —*/}
                  </p>
                </div>

                <div className="mt-2 flex justify-center"> {/*traco pontilhado*/}
                  <span
                    className={`h-3 border-l border-dashed ${
                      unlocked ? "border-slate-300" : "border-slate-200"
                    }`}
                    aria-hidden
                  />
                </div>

                <button
                  type="button"
                  disabled={!unlocked}
                  onClick={() => setOpenLevel(openLevel === level ? null : level)} //toggle dropdown
                  className="w-full rounded-lg bg-slate-700 px-2 py-1.5 text-xs font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
                >
                  {modifyLabel}
                </button>

                {openLevel === level && unlocked && ( //lista de opcoes
                  <div className="absolute left-0 top-full z-20 mt-1 w-52 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
                    <p className="border-b border-slate-100 px-3 py-2 text-xs font-semibold text-slate-500">
                      Selecionar {title.toLowerCase()}
                    </p>
                    <div className="max-h-48 overflow-y-auto py-1">
                      {loading && <p className="px-3 py-2 text-sm text-slate-400">Carregando...</p>}
                      {loadError && <p className="px-3 py-2 text-sm text-red-600">{loadError}</p>}
                      {!loading && !loadError && options.length === 0 && (
                        <p className="px-3 py-2 text-sm text-slate-400">
                          Vazio. Use o + para criar.
                        </p>
                      )}
                      {options.map((option) => (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => selectOption(level, option)}
                          className={[
                            "flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-brand-50",
                            option.name === display[level]
                              ? "font-semibold text-brand-700" //item atual
                              : "text-slate-700",
                          ].join(" ")}
                        >
                          <span>{option.name}</span>
                          {option.name === display[level] && <span aria-hidden>✓</span>}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )
        })}

        <div className="flex items-start gap-3"> {/*card final: posicao auto*/}
          <span
            className={`mt-8 hidden sm:inline ${positionReady ? "text-brand-300" : "text-slate-200"}`}
            aria-hidden
          >
            →
          </span>
          <div
            className={[
              "w-28 rounded-xl border px-3 py-3",
              positionReady
                ? "border-brand-200 bg-brand-50" //tem label
                : "border-slate-100 bg-slate-50 opacity-70",
            ].join(" ")}
          >
            <p
              className={`text-[10px] font-bold uppercase ${
                positionReady ? "text-brand-500" : "text-slate-400"
              }`}
            >
              Posição
            </p>
            <p
              className={`mt-2 text-sm font-semibold ${
                positionReady ? "text-brand-800" : "text-slate-400"
              }`}
            >
              {suggestion?.label ?? "—"} {/*A1, B3...*/}
            </p>
            <p
              className={`mt-3 text-[10px] ${
                positionReady ? "text-brand-400" : "text-slate-300"
              }`}
            >
              Automática {/*nao e editavel aqui*/}
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
