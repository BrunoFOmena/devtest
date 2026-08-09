// FORA DO MVP — página da lixeira (import/rota comentados em App.tsx; menu em Layout.tsx).
// Mantida no codigo para reativar soft-delete + restore sem reescrever a UI.
import { useCallback, useEffect, useState } from "react" //hooks de estado e efeito
import { ApiError } from "../api/client" //erro tipado da API
import { listTrash, restoreTrashItem, type TrashItem } from "../api/resources" //lista e restaura


const TYPE_LABEL: Record<TrashItem["type"], string> = { //rotulo amigavel do tipo
  room: "Sala",
  freezer: "Freezer",
  drawer: "Gaveta",
  box: "Caixa",
}

export default function TrashPage() { //pagina da lixeira
  const [items, setItems] = useState<TrashItem[]>([]) //itens soft-deleted
  const [loading, setLoading] = useState(true) //carregando lista
  const [error, setError] = useState<string | null>(null) //msg de erro
  const [restoringId, setRestoringId] = useState<string | null>(null) //qual item esta restaurando

  const load = useCallback(async () => { //busca a lixeira na API
    setLoading(true) //liga loading
    setError(null) //limpa erro
    try {
      setItems(await listTrash()) //preenche lista
    } catch {
      setError("Não foi possível carregar a lixeira.") //falha de rede/API
    } finally {
      setLoading(false) //fim do loading
    }
  }, [])

  useEffect(() => {
    load() //carrega ao montar
  }, [load])

  async function handleRestore(item: TrashItem) { //restaura um item
    const key = `${item.type}-${item.id}` //chave unica na UI
    setRestoringId(key) //marca botao como busy
    setError(null) //limpa erro
    try {
      await restoreTrashItem(item.type, item.id) //POST restore
      await load() //recarrega lista
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Falha ao restaurar.") //mostra falha
    } finally {
      setRestoringId(null) //libera botao
    }
  }

  return (
    <div className="mx-auto max-w-3xl"> {/*conteudo centralizado*/}
      <div> {/*cabecalho*/}
        <h1 className="text-2xl font-semibold text-slate-900">Lixeira</h1>
        <p className="mt-1 text-sm text-slate-500">
          Itens removidos da estrutura física. Restaure para devolver à árvore (pais também
          voltam se estiverem na lixeira).
        </p>
      </div>

      {loading && <p className="mt-8 text-sm text-slate-400">Carregando...</p>} {/*estado loading*/}
      {error && <p className="mt-4 text-sm text-red-600">{error}</p>} {/*erro*/}

      {!loading && items.length === 0 && ( //lixeira vazia
        <p className="mt-8 text-sm text-slate-500">Lixeira vazia.</p>
      )}

      {!loading && items.length > 0 && ( //lista de itens
        <ul className="mt-6 space-y-2">
          {items.map((item) => {
            const key = `${item.type}-${item.id}` //id do item na lista
            return (
              <li
                key={key}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm"
              > {/*card do item*/}
                <div> {/*info do item*/}
                  <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-slate-600">
                    {TYPE_LABEL[item.type]} {/*tipo: sala/freezer/...*/}
                  </span>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{item.name}</p> {/*nome*/}
                  <p className="text-xs text-slate-500">{item.path}</p> {/*caminho*/}
                </div>
                <button
                  type="button"
                  disabled={restoringId === key} //bloqueia enquanto restaura
                  onClick={() => handleRestore(item)} //restaura
                  className="rounded-lg bg-brand-400 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-500 disabled:bg-slate-300"
                >
                  {restoringId === key ? "Restaurando..." : "Restaurar"} {/*label dinamico*/}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
