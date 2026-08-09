import type { SampleWithLocation } from "../types/api" //amostra + path

interface SampleDetailModalProps { //props da ficha
  sample: SampleWithLocation //dados pra mostrar
  onClose: () => void //fecha modal
}

export default function SampleDetailModal({ sample, onClose }: SampleDetailModalProps) {
  const missingConc = //concentracao vazia / null
    sample.concentracao_ng_ul === null ||
    sample.concentracao_ng_ul === undefined ||
    String(sample.concentracao_ng_ul).trim() === ""

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" //overlay
      onClick={onClose} //clique fora fecha
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="sample-ficha-title"
        className="w-full max-w-lg overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()} //clique dentro nao fecha
      >
        <div className="border-b border-teal-100 bg-teal-50 px-6 py-4"> {/*cabecalho teal*/}
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-teal-700">
                Ficha da amostra {/*subtitulo*/}
              </p>
              <h2
                id="sample-ficha-title"
                className="mt-1 text-xl font-semibold text-slate-900"
              >
                {sample.codigo_amostra} {/*codigo em destaque*/}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-teal-200 bg-white px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
            >
              Fechar
            </button>
          </div>
        </div>

        <dl className="grid gap-4 px-6 py-5 text-sm sm:grid-cols-2"> {/*campos em grid*/}
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Paciente
            </dt>
            <dd className="mt-1 font-medium text-slate-800">{sample.paciente_nome}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Material
            </dt>
            <dd className="mt-1 font-medium text-slate-800">{sample.material}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Concentração (ng/µL)
            </dt>
            <dd className="mt-1 font-medium text-slate-800">
              {missingConc ? ( //aviso se faltou
                <span className="inline-flex items-center gap-1.5 text-amber-700">
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-amber-400 text-[10px] font-bold text-amber-950">
                    !
                  </span>
                  Não informada
                </span>
              ) : (
                sample.concentracao_ng_ul //valor normal
              )}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Exame
            </dt>
            <dd className="mt-1 font-medium text-slate-800">{sample.exame || "—"}</dd> {/*traco se vazio*/}
          </div>
          <div className="sm:col-span-2"> {/*ocupa as duas colunas*/}
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Observação
            </dt>
            <dd className="mt-1 font-medium text-slate-800">{sample.observacao || "—"}</dd>
          </div>
          <div className="sm:col-span-2 rounded-lg border border-teal-100 bg-teal-50/80 px-3 py-3"> {/*bloco localizacao*/}
            <dt className="text-xs font-medium uppercase tracking-wide text-teal-600">
              Localização
            </dt>
            <dd className="mt-1 font-medium text-teal-900">{sample.path}</dd> {/*caminho completo*/}
          </div>
        </dl>
      </div>
    </div>
  )
}
