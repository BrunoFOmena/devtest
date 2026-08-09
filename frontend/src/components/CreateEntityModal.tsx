import { useState } from "react" //estado do form
import { ApiError } from "../api/client" //erro tipado da API
import { createBox, createDrawer, createFreezer, createRoom } from "../api/resources" //POSTs de criacao

export type CreateLevel = "room" | "freezer" | "drawer" | "box" //niveis da hierarquia

interface CreateEntityModalProps { //props do modal de criar
  level: CreateLevel //o que estamos criando
  parentLabel?: string //nome do pai (texto auxiliar)
  roomId?: number //pai da freezer
  freezerId?: number //pai da gaveta
  drawerId?: number //pai da caixa
  onClose: () => void //fecha o modal
  onCreated: (result: { id: number; name: string; level: CreateLevel }) => void //avisa o parent
}

const TITLES: Record<CreateLevel, string> = { //titulo por nivel
  room: "Nova sala",
  freezer: "Novo freezer",
  drawer: "Nova gaveta",
  box: "Nova caixa",
}

export default function CreateEntityModal({
  level,
  parentLabel,
  roomId,
  freezerId,
  drawerId,
  onClose,
  onCreated,
}: CreateEntityModalProps) {
  const [name, setName] = useState("") //nome digitado
  const [rows, setRows] = useState("8") //linhas da caixa (default)
  const [columns, setColumns] = useState("12") //colunas da caixa (default)
  const [error, setError] = useState<string | null>(null) //msg de erro
  const [saving, setSaving] = useState(false) //loading do submit

  async function handleSubmit(event: React.FormEvent) { //cria no backend
    event.preventDefault() //nao recarrega
    setError(null)
    setSaving(true)

    try {
      if (level === "room") { //cria sala
        const room = await createRoom(name.trim())
        onCreated({ id: room.id, name: room.name, level })
      } else if (level === "freezer") { //cria freezer na sala
        if (!roomId) throw new Error("Selecione uma sala antes.")
        const freezer = await createFreezer(roomId, name.trim())
        onCreated({ id: freezer.id, name: freezer.name, level })
      } else if (level === "drawer") { //cria gaveta no freezer
        if (!freezerId) throw new Error("Selecione um freezer antes.")
        const drawer = await createDrawer(freezerId, name.trim())
        onCreated({ id: drawer.id, name: drawer.name, level })
      } else { //cria caixa na gaveta
        if (!drawerId) throw new Error("Selecione uma gaveta antes.")
        const box = await createBox(drawerId, {
          name: name.trim(),
          rows: Number(rows), //grid da caixa
          columns: Number(columns),
        })
        onCreated({ id: box.id, name: box.name, level })
      }
    } catch (err) {
      if (err instanceof ApiError) setError(err.message) //erro da API
      else setError(err instanceof Error ? err.message : "Erro ao criar.") //fallback
    } finally {
      setSaving(false) //libera o botao
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"> {/*overlay*/}
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl" //form
      >
        <h2 className="text-lg font-semibold text-slate-900">{TITLES[level]}</h2> {/*titulo por nivel*/}
        {parentLabel && (
          <p className="mt-1 text-sm text-slate-500">Dentro de: {parentLabel}</p> //contexto do pai
        )}

        <label className="mt-4 block"> {/*campo nome*/}
          <span className="text-sm font-medium text-slate-600">Nome *</span>
          <input
            required
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
          />
        </label>

        {level === "box" && ( //so caixa pede grid
          <div className="mt-4 grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-sm font-medium text-slate-600">Linhas *</span>
              <input
                required
                type="number"
                min="1"
                value={rows}
                onChange={(e) => setRows(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-600">Colunas *</span>
              <input
                required
                type="number"
                min="1"
                value={columns}
                onChange={(e) => setColumns(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
              />
            </label>
          </div>
        )}

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>} {/*erro se tiver*/}

        <div className="mt-6 flex justify-end gap-3"> {/*acoes*/}
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-brand-400 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-500 disabled:bg-slate-300"
          >
            {saving ? "Salvando..." : "Criar"}
          </button>
        </div>
      </form>
    </div>
  )
}
