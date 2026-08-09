import { useEffect, useState } from "react" //hooks para carregar o mapa
import { listPositions } from "../api/resources" //grade da caixa sugerida
import type { Location, PositionCell } from "../types/api" //tipos da sugestao/mapa
import BoxMap from "./BoxMap" //mapa visual da caixa (mesmo do fluxo manual)

interface AutoPositionChoiceModalProps { //props do sim/nao da posicao auto
  suggestion: Location | null //caminho sugerido (ou null)
  loading: boolean //buscando ou salvando
  error: string | null //erro ao sugerir
  submitError?: string | null //erro ao confirmar
  onAccept: () => void //aceitou a sugestao
  onReject: () => void //quer editar manual
  onClose: () => void //fechou o X
}

export default function AutoPositionChoiceModal({
  suggestion,
  loading,
  error,
  submitError = null,
  onAccept,
  onReject,
  onClose,
}: AutoPositionChoiceModalProps) {
  const [positions, setPositions] = useState<PositionCell[]>([]) //celulas da caixa sugerida
  const [mapLoading, setMapLoading] = useState(false) //fetch do grid em andamento
  const [mapError, setMapError] = useState<string | null>(null) //falha ao montar o mapa

  useEffect(() => { //quando a sugestao muda, busca o grid da caixa
    if (!suggestion) { //sem sugestao: limpa mapa
      setPositions([])
      setMapError(null)
      setMapLoading(false)
      return
    }

    let cancelled = false //evita setState apos unmount / troca rapida

    async function loadMap() {
      setMapLoading(true)
      setMapError(null)
      try {
        const cells = await listPositions(suggestion!.box_id) //grade livre/ocupada
        if (!cancelled) setPositions(cells)
      } catch {
        if (!cancelled) {
          setPositions([])
          setMapError("Não foi possível carregar o mapa da caixa.")
        }
      } finally {
        if (!cancelled) setMapLoading(false)
      }
    }

    loadMap()
    return () => {
      cancelled = true
    }
  }, [suggestion])

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 p-4"> {/*overlay*/}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="auto-position-title"
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl" //painel mais largo pro mapa
      >
        <div className="overflow-y-auto p-6"> {/*corpo scrollavel se o mapa for alto*/}
          <div className="flex items-start justify-between gap-3"> {/*titulo + fechar*/}
            <h2 id="auto-position-title" className="text-lg font-semibold text-slate-900">
              Aceitar posição automática?
            </h2>
            <button
              type="button"
              onClick={onClose} //fecha modal
              className="rounded-md border border-slate-200 px-2 py-1 text-sm text-slate-500 hover:bg-slate-50"
            >
              ✕
            </button>
          </div>

          <p className="mt-2 text-sm text-slate-600"> {/*explica first-fit*/}
            O sistema sugere a próxima posição livre (first-fit). Você pode aceitar ou editar
            manualmente.
          </p>

          {loading && (
            <p className="mt-4 text-sm text-slate-400">Buscando posição sugerida...</p> //loading
          )}

          {!loading && suggestion && ( //mensagem de caminho + mapa da caixa
            <div className="mt-4 space-y-4">
              <div className="rounded-lg border border-brand-100 bg-brand-50 px-4 py-3 text-sm">
                <p className="text-xs font-semibold uppercase tracking-wider text-brand-600">
                  Sugestão
                </p>
                <p className="mt-1 font-medium text-brand-900">{suggestion.path}</p> {/*path completo*/}
              </div>

              {mapLoading && (
                <p className="text-sm text-slate-400">Carregando mapa da caixa...</p>
              )}

              {mapError && (
                <p className="text-sm text-amber-700">{mapError}</p>
              )}

              {!mapLoading && positions.length > 0 && ( //mesma grade do fluxo manual
                <BoxMap
                  boxName={suggestion.box}
                  positions={positions}
                  selectedPositionId={suggestion.position_id} //destaque violeta na celula sugerida
                />
              )}
            </div>
          )}

          {!loading && !suggestion && ( //sem sugestao disponivel
            <p className="mt-4 text-sm text-amber-700">
              {error ||
                "Não há posição automática disponível. Escolha Não para montar a localização."}
            </p>
          )}

          {submitError && ( //erro ao salvar
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              {submitError}
            </div>
          )}

          <div className="mt-6 flex justify-end gap-3"> {/*Nao / Sim*/}
            <button
              type="button"
              onClick={onReject} //vai pro fluxo manual
              disabled={loading}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Não
            </button>
            <button
              type="button"
              disabled={loading || !suggestion} //so se tem sugestao
              onClick={onAccept} //confirma automatico
              className="rounded-lg bg-brand-400 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-500 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {loading && suggestion ? "Salvando..." : "Sim"} {/*texto durante save*/}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
