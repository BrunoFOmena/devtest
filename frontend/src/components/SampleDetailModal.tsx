import { useState } from "react" //estado do botao apagar
import { ApiError } from "../api/client" //erro tipado da API
import { deleteSample } from "../api/resources" //DELETE /samples/:id
import type { SampleWithLocation } from "../types/api" //amostra + path

interface SampleDetailModalProps { //props da ficha
  sample: SampleWithLocation //dados pra mostrar
  onClose: () => void //fecha modal
  onDeleted?: (sampleId: number) => void //callback apos exclusao (opcional)
}

export default function SampleDetailModal({
  sample,
  onClose,
  onDeleted,
}: SampleDetailModalProps) {
  const [deleting, setDeleting] = useState(false) //apagando amostra
  const [error, setError] = useState<string | null>(null) //erro ao apagar

  const missingConc = //concentracao vazia / null
    sample.concentracao_ng_ul === null ||
    sample.concentracao_ng_ul === undefined ||
    String(sample.concentracao_ng_ul).trim() === ""

  async function handleDelete() { //confirma e apaga a amostra
    if (
      !window.confirm(
        `Excluir a amostra "${sample.codigo_amostra}"? A posição ${sample.label} ficará livre. Esta ação não pode ser desfeita.`,
      )
    ) {
      return //cancelou
    }

    setDeleting(true) //desativa botao
    setError(null) //limpa erro
    try {
      await deleteSample(sample.id) //DELETE na API
      onDeleted?.(sample.id) //avisa o pai (tabela/estrutura)
      onClose() //fecha a ficha
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível excluir a amostra.")
    } finally {
      setDeleting(false) //libera botao
    }
  }

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
        <div className="border-b border-brand-100 bg-brand-50 px-6 py-4"> {/*cabecalho teal*/}
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-brand-700">
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
              className="rounded-lg border border-brand-200 bg-white px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
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
          <div className="sm:col-span-2 rounded-lg border border-brand-100 bg-brand-50/80 px-3 py-3"> {/*bloco localizacao*/}
            <dt className="text-xs font-medium uppercase tracking-wide text-brand-600">
              Localização
            </dt>
            <dd className="mt-1 font-medium text-brand-900">{sample.path}</dd> {/*caminho completo*/}
          </div>
        </dl>

        {error && ( //erro ao apagar
          <p className="px-6 pb-2 text-sm text-red-600">{error}</p>
        )}

        <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4"> {/*acoes*/}
          <button
            type="button"
            disabled={deleting}
            onClick={handleDelete} //apaga amostra
            className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
          >
            {deleting ? "Excluindo..." : "Excluir amostra"}
          </button>
        </div>
      </div>
    </div>
  )
}
