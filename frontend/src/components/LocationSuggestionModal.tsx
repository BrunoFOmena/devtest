import { useCallback, useEffect, useState } from "react" //hooks
import { ApiError } from "../api/client" //erro tipado
import { listPositions, listRooms, suggestSample } from "../api/resources" //APIs usadas aqui
import type { AllocationScope, Location, PositionCell } from "../types/api" //tipos
import BoxMap from "./BoxMap" //mapa da caixa
import type { CreateLevel } from "./CreateEntityModal" //nivel pra criar
import LocationTrail from "./LocationTrail" //trilha sala→caixa

interface LocationSuggestionModalProps { //props do modal de localizacao
  submitting: boolean //parent ainda salvando a amostra
  submitError: string | null //erro do submit do parent
  onConfirm: (scope: AllocationScope) => void //confirma com o escopo atual
  onClose: () => void //fecha modal
}

export default function LocationSuggestionModal({
  submitting,
  submitError,
  onConfirm,
  onClose,
}: LocationSuggestionModalProps) {
  const [scope, setScope] = useState<AllocationScope>({}) //filtros da hierarquia
  const [suggestion, setSuggestion] = useState<Location | null>(null) //posicao sugerida
  const [positions, setPositions] = useState<PositionCell[]>([]) //celulas da caixa
  const [loadingSuggestion, setLoadingSuggestion] = useState(false) //fetch da sugestao
  const [apiError, setApiError] = useState<string | null>(null) //erro inesperado
  const [openCreateLevel, setOpenCreateLevel] = useState<CreateLevel | null>(null) //abre criar no trail
  const [firstVisitChecked, setFirstVisitChecked] = useState(false) //ja checou salas?

  const loadSuggestion = useCallback(async (nextScope: AllocationScope) => { //pede sugestao + grid
    setLoadingSuggestion(true)
    setApiError(null)
    try {
      const location = await suggestSample(nextScope) //first-fit no backend
      setSuggestion(location)
      setPositions(await listPositions(location.box_id)) //mapa da caixa sugerida
    } catch (error) {
      setSuggestion(null) //limpa se falhou
      setPositions([])
      // 422 = ainda não há caixa/posição livre: esperado enquanto a hierarquia é montada.
      if (!(error instanceof ApiError && error.status === 422)) { //422 e esperado
        setApiError("Não foi possível obter a sugestão. Verifique se a API está no ar.")
      }
    } finally {
      setLoadingSuggestion(false)
    }
  }, [])

  useEffect(() => { //boot: checa se tem sala; se nao, abre criar
    async function boot() {
      try {
        const rooms = await listRooms()
        if (rooms.length === 0) { //primeira visita sem estrutura
          setOpenCreateLevel("room")
          setFirstVisitChecked(true)
          return
        }
      } catch { //API fora: tenta criar sala mesmo assim
        setOpenCreateLevel("room")
        setFirstVisitChecked(true)
        return
      }

      setFirstVisitChecked(true)
      await loadSuggestion({}) //sugestao sem filtro
    }

    boot()
  }, [loadSuggestion])

  function handleScopeChange(nextScope: AllocationScope) { //trail mudou o escopo
    setScope(nextScope)
    loadSuggestion(nextScope) //recalcula sugestao
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 p-4"> {/*overlay*/}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="location-modal-title"
        className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl" //painel largo
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-4"> {/*header*/}
          <div>
            <h2 id="location-modal-title" className="text-lg font-semibold text-slate-900">
              Sugestão de Localização
            </h2>
            <p className="mt-1 text-sm text-slate-500"> {/*ajuda rapida*/}
              Use o + para criar o próximo nível. Sem o pai, o nível seguinte fica bloqueado. A
              posição é automática (first-fit).
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
          >
            Fechar
          </button>
        </div>

        <div className="overflow-y-auto px-6 py-5"> {/*corpo scrollavel*/}
          {!firstVisitChecked && (
            <p className="text-sm text-slate-400">Preparando localização...</p> //boot ainda
          )}

          {apiError && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {apiError} {/*erro de API*/}
            </div>
          )}

          {firstVisitChecked && (
            <div className="space-y-6">
              {loadingSuggestion && (
                <p className="text-sm text-slate-400">Buscando posição...</p>
              )}

              <LocationTrail //trilha + criar niveis
                suggestion={suggestion}
                onScopeChange={handleScopeChange}
                openCreateLevel={openCreateLevel}
                onOpenCreateHandled={() => setOpenCreateLevel(null)} //parent ja entregou o pedido
              />

              {suggestion ? ( //tem sugestao: mapa + confirmar
                <div className="grid gap-6 lg:grid-cols-[1fr_14rem]">
                  <BoxMap
                    boxName={suggestion.box}
                    positions={positions}
                    selectedPositionId={suggestion.position_id} //celula sugerida
                  />

                  <div className="flex flex-col gap-3">
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => onConfirm(scope)} //confirma com o scope atual
                      className="rounded-lg bg-violet-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                    >
                      {submitting ? "Salvando..." : "Confirmar Localização"}
                    </button>
                    <p className="text-xs leading-relaxed text-slate-500">
                      Caminho: {suggestion.path} {/*path legivel*/}
                    </p>
                  </div>
                </div>
              ) : (
                !loadingSuggestion && ( //sem sugestao e nao carregando
                  <p className="text-sm text-slate-500">
                    Monte a hierarquia com o + em cada card. Quando houver caixa com posição livre,
                    a sugestão aparece aqui.
                  </p>
                )
              )}
            </div>
          )}

          {submitError && ( //erro vindo do parent
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {submitError}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
