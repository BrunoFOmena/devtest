import { useState, type ReactNode } from "react" //estado local do formulario
import { ApiError } from "../api/client" //erro tipado da API
import { createSample, suggestSample } from "../api/resources" //cria amostra e pede sugestao
import AlertModal from "../components/AlertModal" //alerta de codigo duplicado
import AutoPositionChoiceModal from "../components/AutoPositionChoiceModal" //aceita/rejeita posicao auto
import LocationSuggestionModal from "../components/LocationSuggestionModal" //escolhe local na mao
import PageHeader from "../components/PageHeader" //titulo padrao da marca
import type { AllocationScope, Location } from "../types/api" //tipos de escopo e local

function isDuplicateCodigo(error: ApiError): boolean { //detecta 422 de codigo repetido
  return (
    error.status === 422 && //so em conflito de validacao
    /codigo_amostra/i.test(error.message) && //mensagem fala do campo
    /already been taken|taken|já está em uso|em uso/i.test(error.message) //e diz que ja existe
  )
}

function scopeFromLocation(location: Location): AllocationScope { //monta escopo a partir do local
  return {
    room_id: location.room_id, //sala
    freezer_id: location.freezer_id, //freezer
    drawer_id: location.drawer_id, //gaveta
    box_id: location.box_id, //caixa
  }
}

const EMPTY_FORM = { //valores iniciais do formulario
  codigo_amostra: "", //codigo unico
  paciente_nome: "", //nome do paciente
  material: "", //tipo de material
  concentracao_ng_ul: "", //concentracao opcional
  exame: "", //exame opcional
  observacao: "", //obs opcional
}

const inputClass = //estilo padrao dos inputs (identidade navy/teal)
  "mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-navy-900 placeholder:text-slate-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/30"

function FieldLabel({ children, required }: { children: ReactNode; required?: boolean }) {
  return (
    <span className="text-sm font-semibold text-navy-900">
      {children}
      {required && <span className="text-brand-500"> *</span>}
    </span>
  )
}

export default function NewSamplePage() { //pagina de cadastro de amostra
  const [form, setForm] = useState(EMPTY_FORM) //dados do formulario
  const [showAutoChoice, setShowAutoChoice] = useState(false) //modal de posicao automatica
  const [showLocationModal, setShowLocationModal] = useState(false) //modal de escolha manual
  const [showDuplicateModal, setShowDuplicateModal] = useState(false) //alerta de codigo duplicado
  const [autoSuggestion, setAutoSuggestion] = useState<Location | null>(null) //sugestao da API
  const [autoLoading, setAutoLoading] = useState(false) //carregando sugestao
  const [autoError, setAutoError] = useState<string | null>(null) //erro na sugestao
  const [submitError, setSubmitError] = useState<string | null>(null) //erro ao salvar
  const [successMessage, setSuccessMessage] = useState<string | null>(null) //msg de sucesso
  const [submitting, setSubmitting] = useState(false) //salvando amostra

  function updateField(field: keyof typeof EMPTY_FORM, value: string) { //atualiza um campo
    setForm((current) => ({ ...current, [field]: value })) //mantem o resto
  }

  async function openAutoChoice() { //abre modal e busca sugestao
    setShowAutoChoice(true) //mostra o modal
    setAutoLoading(true) //liga loading
    setAutoError(null) //limpa erro antigo
    setAutoSuggestion(null) //limpa sugestao antiga

    try {
      const location = await suggestSample({}) //pede posicao automatica
      setAutoSuggestion(location) //guarda sugestao
    } catch (error) {
      setAutoSuggestion(null) //sem sugestao se falhou
      if (!(error instanceof ApiError && error.status === 422)) { //422 = sem vaga, silencioso
        setAutoError("Não foi possível obter a sugestão automática.") //outros erros: avisa
      }
    } finally {
      setAutoLoading(false) //fim do loading
    }
  }

  function handleFormOk(event: React.FormEvent) { //submit do formulario
    event.preventDefault() //nao recarrega a pagina
    setSubmitError(null) //limpa erro
    setSuccessMessage(null) //limpa sucesso

    if (form.concentracao_ng_ul.trim() === "") { //concentracao vazia
      const proceed = window.confirm( //confirma se quer seguir
        "A concentração está vazia. Deseja cadastrar a amostra mesmo assim?",
      )
      if (!proceed) return //usuario cancelou
    }

    openAutoChoice() //segue pro fluxo de posicao
  }

  async function saveSample(scope: AllocationScope) { //persiste a amostra no escopo
    setSubmitting(true) //liga loading de save
    setSubmitError(null) //limpa erro

    try {
      const sample = await createSample( //POST na API
        {
          codigo_amostra: form.codigo_amostra.trim(), //codigo limpo
          paciente_nome: form.paciente_nome.trim(), //paciente limpo
          material: form.material.trim(), //material limpo
          concentracao_ng_ul: form.concentracao_ng_ul.trim() || null, //vazio vira null
          exame: form.exame.trim() || null, //opcional
          observacao: form.observacao.trim() || null, //opcional
        },
        scope, //onde alocar
      )
      setSuccessMessage(`Amostra ${sample.codigo_amostra} armazenada em ${sample.path}.`) //feedback
      setForm(EMPTY_FORM) //zera form
      setShowLocationModal(false) //fecha modal manual
      setShowAutoChoice(false) //fecha modal auto
      setAutoSuggestion(null) //limpa sugestao
    } catch (error) {
      if (error instanceof ApiError && isDuplicateCodigo(error)) { //codigo ja existe
        setShowDuplicateModal(true) //mostra alerta
      } else if (error instanceof ApiError) {
        setSubmitError(error.message) //msg da API
      } else {
        setSubmitError("Erro de conexão ao salvar a amostra.") //rede/outro
      }
    } finally {
      setSubmitting(false) //fim do save
    }
  }

  async function handleAcceptAuto() { //aceita a sugestao automatica
    if (!autoSuggestion) return //sem sugestao, nao faz nada
    await saveSample(scopeFromLocation(autoSuggestion)) //salva no local sugerido
  }

  function handleRejectAuto() { //rejeita auto e abre escolha manual
    setShowAutoChoice(false) //fecha modal auto
    setShowLocationModal(true) //abre modal de local
  }

  function handleDuplicateOk() { //fecha alerta de duplicado e volta ao form
    setShowDuplicateModal(false) //fecha alerta
    setShowLocationModal(false) //fecha local
    setShowAutoChoice(false) //fecha auto
    setSubmitError(null) //limpa erro
  }

  return (
    <div className="mx-auto max-w-3xl"> {/*conteudo centralizado*/}
      {showDuplicateModal && ( //alerta de codigo ja usado
        <AlertModal
          title="Código já cadastrado"
          message={`O código "${form.codigo_amostra.trim()}" já existe. Troque o código da amostra e tente novamente.`}
          confirmLabel="Trocar código"
          onConfirm={handleDuplicateOk} //volta pro form
        />
      )}

      {showAutoChoice && ( //modal aceitar/rejeitar posicao auto
        <AutoPositionChoiceModal
          suggestion={autoSuggestion} //local sugerido
          loading={autoLoading || submitting} //carregando ou salvando
          error={autoError} //erro da sugestao
          submitError={submitError} //erro do save
          onAccept={handleAcceptAuto} //aceita
          onReject={handleRejectAuto} //vai pra escolha manual
          onClose={() => {
            setShowAutoChoice(false) //fecha sem salvar
            setSubmitError(null) //limpa erro
          }}
        />
      )}

      {showLocationModal && ( //modal de escolha manual de local
        <LocationSuggestionModal
          submitting={submitting} //bloqueia enquanto salva
          submitError={submitError} //mostra erro do save
          onConfirm={saveSample} //salva no escopo escolhido
          onClose={() => {
            setShowLocationModal(false) //fecha
            setSubmitError(null) //limpa erro
          }}
        />
      )}

      <PageHeader
        eyebrow="Amostras"
        title="Cadastro de Amostra"
        description="Preencha os dados e clique em OK. Em seguida, aceite a posição automática ou edite."
      />

      {successMessage && ( //banner verde de sucesso
        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {successMessage}
        </div>
      )}

      {submitError && !showLocationModal && !showAutoChoice && ( //erro so se modais fechados
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {submitError}
        </div>
      )}

      <form onSubmit={handleFormOk} className="mt-8"> {/*form principal*/}
        <section className="rounded-2xl border border-slate-100 bg-white p-8 shadow-sm"> {/*card dos campos*/}
          <h2 className="text-base font-semibold text-brand-500">Dados da Amostra</h2>

          <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2"> {/*grade 2 colunas*/}
            <label className="block"> {/*codigo obrigatorio*/}
              <FieldLabel required>Código da amostra</FieldLabel>
              <input
                required
                value={form.codigo_amostra}
                onChange={(e) => updateField("codigo_amostra", e.target.value)} //atualiza codigo
                placeholder="A0100100049801"
                className={inputClass}
              />
            </label>

            <label className="block"> {/*paciente obrigatorio*/}
              <FieldLabel required>Paciente</FieldLabel>
              <input
                required
                value={form.paciente_nome}
                onChange={(e) => updateField("paciente_nome", e.target.value)} //atualiza paciente
                placeholder="CONTROLE NEO 136"
                className={inputClass}
              />
            </label>

            <label className="block"> {/*material obrigatorio*/}
              <FieldLabel required>Material</FieldLabel>
              <input
                required
                value={form.material}
                onChange={(e) => updateField("material", e.target.value)} //atualiza material
                placeholder="DNA"
                className={inputClass}
              />
            </label>

            <label className="block"> {/*concentracao opcional*/}
              <FieldLabel>Concentração (ng/µL)</FieldLabel>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.concentracao_ng_ul}
                onChange={(e) => updateField("concentracao_ng_ul", e.target.value)} //atualiza conc
                placeholder="52.8"
                className={inputClass}
              />
            </label>

            <label className="block"> {/*exame opcional*/}
              <FieldLabel>Exame</FieldLabel>
              <input
                value={form.exame}
                onChange={(e) => updateField("exame", e.target.value)} //atualiza exame
                placeholder="CONTROLE INTERNO"
                className={inputClass}
              />
            </label>

            <label className="block"> {/*obs opcional*/}
              <FieldLabel>Observação</FieldLabel>
              <input
                value={form.observacao}
                onChange={(e) => updateField("observacao", e.target.value)} //atualiza obs
                placeholder="Opcional"
                className={inputClass}
              />
            </label>
          </div>

          <div className="mt-8 flex justify-end"> {/*botao a direita*/}
            <button
              type="submit"
              className="rounded-lg bg-brand-400 px-8 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-500"
            >
              OK {/*segue pro fluxo de posicao*/}
            </button>
          </div>
        </section>
      </form>
    </div>
  )
}
