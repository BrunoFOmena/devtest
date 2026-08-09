import { useState } from "react" //estado do form
import { ApiError } from "../api/client" //erro tipado da API

interface RenameEntityModalProps { //props pra renomear entidade
  title: string //titulo do modal
  currentName: string //nome atual (preenche o input)
  onClose: () => void //fecha sem salvar / apos salvar
  onSave: (name: string) => Promise<void> //persiste o novo nome
}

export default function RenameEntityModal({
  title,
  currentName,
  onClose,
  onSave,
}: RenameEntityModalProps) {
  const [name, setName] = useState(currentName) //valor editavel
  const [error, setError] = useState<string | null>(null) //msg de erro
  const [saving, setSaving] = useState(false) //loading do submit

  async function handleSubmit(event: React.FormEvent) { //salva o rename
    event.preventDefault() //nao recarrega a pagina
    const trimmed = name.trim() //tira espacos
    if (!trimmed) { //nome vazio
      setError("Informe um nome.")
      return
    }
    if (trimmed === currentName) { //nada mudou
      onClose()
      return
    }

    setError(null) //limpa erro
    setSaving(true) //mostra salvando
    try {
      await onSave(trimmed) //chama API via parent
      onClose() //fecha se deu certo
    } catch (err) {
      if (err instanceof ApiError) setError(err.message) //erro da API
      else setError(err instanceof Error ? err.message : "Erro ao renomear.") //fallback
    } finally {
      setSaving(false) //libera o botao
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"> {/*overlay*/}
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl" //form branco
      >
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        <label className="mt-4 block"> {/*campo nome*/}
          <span className="text-sm font-medium text-slate-600">Nome *</span>
          <input
            required
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)} //atualiza estado
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none"
          />
        </label>

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>} {/*erro se tiver*/}

        <div className="mt-6 flex justify-end gap-3"> {/*acoes*/}
          <button
            type="button"
            onClick={onClose} //cancela
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving} //bloqueia enquanto salva
            className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:bg-slate-300"
          >
            {saving ? "Salvando..." : "Salvar"} {/*texto dinamico*/}
          </button>
        </div>
      </form>
    </div>
  )
}
