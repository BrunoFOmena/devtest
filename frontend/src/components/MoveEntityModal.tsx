import { useEffect, useState } from "react" //efeito + estado
import { ApiError } from "../api/client" //erro tipado da API

export interface MoveOption { //destino possivel no select
  id: number
  label: string
}

interface MoveEntityModalProps { //props do modal de mover
  title: string //titulo do dialog
  itemName: string //nome do item que vai mover
  parentLabel: string //rotulo do tipo de pai (Sala, Freezer...)
  currentParentId: number //pai atual (excluido da lista)
  options: MoveOption[] //destinos carregados
  loadingOptions?: boolean //ainda buscando destinos
  onClose: () => void //fecha o modal
  onMove: (parentId: number) => Promise<void> //executa o move
}

export default function MoveEntityModal({
  title,
  itemName,
  parentLabel,
  currentParentId,
  options,
  loadingOptions = false,
  onClose,
  onMove,
}: MoveEntityModalProps) {
  const destinations = options.filter((option) => option.id !== currentParentId) //tira o pai atual
  const [parentId, setParentId] = useState<number | "">("") //destino escolhido
  const [error, setError] = useState<string | null>(null) //msg de erro
  const [saving, setSaving] = useState(false) //loading do submit

  useEffect(() => { //quando a lista muda, ajusta o select
    const next = options.filter((option) => option.id !== currentParentId) //destinos validos
    setParentId((current) => {
      if (current !== "" && next.some((option) => option.id === current)) return current //mantem se ainda vale
      return next[0]?.id ?? "" //senao pega o primeiro
    })
  }, [options, currentParentId])

  async function handleSubmit(event: React.FormEvent) { //move pro novo pai
    event.preventDefault()
    if (parentId === "" || typeof parentId !== "number") { //precisa escolher
      setError(`Selecione ${parentLabel.toLowerCase()}.`)
      return
    }

    setError(null)
    setSaving(true)
    try {
      await onMove(parentId) //chama API via parent
      onClose() //fecha se ok
    } catch (err) {
      if (err instanceof ApiError) setError(err.message)
      else setError(err instanceof Error ? err.message : "Erro ao mover.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"> {/*overlay*/}
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl"
      >
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        <p className="mt-1 text-sm text-slate-500"> {/*explica o que vai mover*/}
          Mover <span className="font-medium text-slate-700">{itemName}</span> para outra{" "}
          {parentLabel.toLowerCase()}.
        </p>

        <label className="mt-4 block"> {/*select de destino*/}
          <span className="text-sm font-medium text-slate-600">Nova {parentLabel.toLowerCase()} *</span>
          {loadingOptions ? (
            <p className="mt-2 text-sm text-slate-400">Carregando destinos...</p> //ainda fetch
          ) : destinations.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500"> {/*sem opcao*/}
              Não há outra {parentLabel.toLowerCase()} disponível.
            </p>
          ) : (
            <select
              required
              value={parentId}
              onChange={(e) => setParentId(Number(e.target.value))} //escolhe destino
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none"
            >
              {destinations.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          )}
        </label>

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving || loadingOptions || destinations.length === 0} //bloqueia se nao da
            className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:bg-slate-300"
          >
            {saving ? "Movendo..." : "Mover"}
          </button>
        </div>
      </form>
    </div>
  )
}
