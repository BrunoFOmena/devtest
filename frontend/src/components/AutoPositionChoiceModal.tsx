import type { Location } from "../types/api" //tipo da sugestao

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
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 p-4"> {/*overlay*/}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="auto-position-title"
        className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl" //painel
      >
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

        {!loading && suggestion && ( //mostra caminho sugerido
          <div className="mt-4 rounded-lg border border-violet-100 bg-violet-50 px-4 py-3 text-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-violet-600">
              Sugestão
            </p>
            <p className="mt-1 font-medium text-violet-900">{suggestion.path}</p> {/*path completo*/}
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
            className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {loading && suggestion ? "Salvando..." : "Sim"} {/*texto durante save*/}
          </button>
        </div>
      </div>
    </div>
  )
}
