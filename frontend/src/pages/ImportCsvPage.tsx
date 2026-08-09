import { useMemo, useState } from "react" //hooks de estado e memo
import { ApiError } from "../api/client" //erro tipado da API
import {
  commitCsvImport, //confirma importacao
  previewCsvImport, //preview a partir do texto do arquivo
  previewCsvRows, //revalida linhas ja editadas
  type CsvImportItem,
  type CsvImportPreview,
  type CsvImportRowData,
} from "../api/resources"
import PageHeader from "../components/PageHeader" //titulo padrao da marca

const EDIT_FIELDS: { key: keyof CsvImportRowData; label: string }[] = [ //campos do modal editar
  { key: "sala", label: "Sala" },
  { key: "freezer", label: "Freezer" },
  { key: "gaveta", label: "Gaveta" },
  { key: "caixa", label: "Caixa" },
  { key: "linhas", label: "Linhas" },
  { key: "colunas", label: "Colunas" },
  { key: "posicao", label: "Posição" },
  { key: "codigo_amostra", label: "Código" },
  { key: "paciente_nome", label: "Paciente" },
  { key: "concentracao_ng_ul", label: "Concentração" },
  { key: "material", label: "Material" },
  { key: "exame", label: "Exame" },
  { key: "observacao", label: "Observação" },
]

function itemKey(item: CsvImportItem): string { //chave estavel pra React/Set
  return `${item.data.line ?? "?"}-${item.data.codigo_amostra}-${item.data.posicao}`
}

function RowCard({ //card de uma linha do preview
  item,
  tone,
  actions,
}: {
  item: CsvImportItem
  tone: "ok" | "error" | "duplicate" | "exists" //cor do card
  actions?: React.ReactNode //botoes a direita
}) {
  const border = //classes de borda/fundo por tom
    tone === "ok"
      ? "border-emerald-200 bg-emerald-50/50" //verde = ok
      : tone === "duplicate" || tone === "exists"
        ? "border-amber-300 bg-amber-50" //amarelo = codigo no arquivo ou ja no sistema
        : "border-red-300 bg-red-50" //vermelho = erro


  return (
    <div className={`rounded-lg border px-3 py-2.5 text-sm ${border}`}> {/*card colorido*/}
      <div className="flex items-start justify-between gap-2"> {/*info + acoes*/}
        <div>
          <p className="font-semibold text-slate-900">
            L{item.data.line ?? "?"} · {item.data.codigo_amostra || "(sem código)"} {/*linha e codigo*/}
          </p>
          <p className="mt-0.5 text-xs text-slate-600">
            {item.data.sala} / {item.data.freezer} / {item.data.gaveta} / {item.data.caixa} /{" "}
            {item.data.posicao} {/*caminho fisico*/}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">
            {item.data.paciente_nome} · {item.data.material}
            {item.data.concentracao_ng_ul ? ` · ${item.data.concentracao_ng_ul} ng/µL` : ""} {/*detalhes*/}
          </p>
        </div>
        {actions} {/*botoes opcionais*/}
      </div>
      {item.reasons.length > 0 && ( //motivos de rejeicao
        <ul className="mt-2 list-disc space-y-0.5 pl-4 text-xs text-slate-700">
          {item.reasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default function ImportCsvPage() { //pagina de importacao CSV
  const [preview, setPreview] = useState<CsvImportPreview | null>(null) //resultado do preview
  const [loading, setLoading] = useState(false) //processando preview
  const [importing, setImporting] = useState(false) //commit em andamento
  const [error, setError] = useState<string | null>(null) //erro geral
  const [success, setSuccess] = useState<string | null>(null) //msg de sucesso
  const [editing, setEditing] = useState<CsvImportItem | null>(null) //linha em edicao
  const [editDraft, setEditDraft] = useState<CsvImportRowData | null>(null) //rascunho dos campos

  const [discarded, setDiscarded] = useState<Set<string>>(() => new Set()) //linhas descartadas na UI

  const rejectedVisible = useMemo(() => { //rejeitados menos os descartados
    if (!preview) return []
    return preview.rejected.filter((item) => !discarded.has(itemKey(item)))
  }, [preview, discarded])

  const duplicatesByCode = useMemo(() => { //agrupa duplicados por codigo
    const map = new Map<string, CsvImportItem[]>()
    for (const item of rejectedVisible) {
      if (item.status !== "duplicate") continue //so duplicados
      const code = item.data.codigo_amostra
      const list = map.get(code) ?? []
      list.push(item)
      map.set(code, list)
    }
    return map
  }, [rejectedVisible])

  async function applyPreview(next: CsvImportPreview) { //aplica novo preview e limpa descartes
    setPreview(next)
    setDiscarded(new Set()) //zera descartados
  }

  async function handleFile(file: File | null) { //usuario escolheu um CSV
    if (!file) return
    setLoading(true)
    setError(null)
    setSuccess(null)
    try {
      const text = await file.text() //le o arquivo
      const result = await previewCsvImport(text) //manda pra API
      await applyPreview(result) //mostra resultado
    } catch (err) {
      setPreview(null)
      setError(err instanceof ApiError ? err.message : "Falha ao ler o CSV.")
    } finally {
      setLoading(false)
    }
  }

  async function revalidateAll(ok: CsvImportItem[], rejected: CsvImportItem[]) { //revalida tudo
    setLoading(true)
    setError(null)
    try {
      const rows = [...ok, ...rejected].map((item) => item.data) //junta as linhas
      const result = await previewCsvRows(rows) //manda de novo
      await applyPreview(result)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Falha ao revalidar.")
    } finally {
      setLoading(false)
    }
  }

  function openEdit(item: CsvImportItem) { //abre modal de edicao
    setEditing(item) //qual item
    setEditDraft({ ...item.data }) //copia dos dados
  }

  async function saveEdit() { //salva edicao e revalida
    if (!preview || !editing || !editDraft) return
    const key = itemKey(editing) //qual linha trocar
    const replace = (list: CsvImportItem[]) =>
      list.map((item) =>
        itemKey(item) === key ? { ...item, data: { ...editDraft } } : item, //substitui dados
      )

    const nextOk = replace(preview.ok)
    const nextRejected = replace(preview.rejected)
    await revalidateAll(nextOk, nextRejected) //revalida com o draft
    setEditing(null) //fecha modal
    setEditDraft(null)
  }

  async function keepDuplicate(item: CsvImportItem) { //mantem um e dropa os outros do mesmo codigo
    if (!preview) return
    const code = item.data.codigo_amostra
    const others = (duplicatesByCode.get(code) ?? []).filter(
      (row) => itemKey(row) !== itemKey(item), //outros com mesmo codigo
    )

    const dropKeys = new Set(others.map((row) => itemKey(row))) //chaves a remover
    const rowsForPreview = [
      ...preview.ok.map((row) => row.data), //ok atuais
      ...preview.rejected
        .filter((row) => !dropKeys.has(itemKey(row)) && !discarded.has(itemKey(row))) //sem drop/descartados
        .filter((row) => itemKey(row) === itemKey(item) || row.data.codigo_amostra !== code) //so o escolhido desse codigo
        .map((row) => row.data),
      item.data, //garante a linha escolhida
    ]
    // Evita duplicar a linha escolhida se ja estava no filter acima.
    const uniqueRows = Array.from(
      new Map(rowsForPreview.map((row) => [`${row.line}-${row.codigo_amostra}-${row.posicao}`, row])).values(),
    )

    setLoading(true)
    setError(null)
    try {
      const result = await previewCsvRows(uniqueRows) //revalida sem os rivais
      await applyPreview(result)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Falha ao revalidar.")
    } finally {
      setLoading(false)
    }
  }

  function discardItem(item: CsvImportItem) { //esconde linha rejeitada na UI
    setDiscarded((current) => new Set(current).add(itemKey(item)))
  }

  async function handleImport() { //commit das linhas OK
    if (!preview || preview.ok.length === 0) return
    setImporting(true)
    setError(null)
    setSuccess(null)
    try {
      const result = await commitCsvImport(preview.ok.map((item) => item.data)) //importa
      setSuccess(
        `Importadas ${result.imported} amostras. Criados: ${result.created.rooms} salas, ${result.created.freezers} freezers, ${result.created.drawers} gavetas, ${result.created.boxes} caixas.`,
      )
      setPreview(null) //limpa preview
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Falha ao importar.")
    } finally {
      setImporting(false)
    }
  }

  const errors = rejectedVisible.filter((item) => item.status === "error") //so erros
  const duplicates = rejectedVisible.filter((item) => item.status === "duplicate") //dup no arquivo
  const alreadyPresent = rejectedVisible.filter((item) => item.status === "exists") //ja no banco


  return (
    <div className="mx-auto max-w-6xl"> {/*layout largo em 2 colunas*/}
      <PageHeader
        eyebrow="Ferramentas"
        title="Importar CSV"
        description="Linhas válidas à esquerda. Problemas à direita: vermelho = erro; amarelo = código repetido no arquivo (escolha qual manter) ou ID já presente no sistema (não importa de novo). Hierarquia inexistente será criada automaticamente."
      />

      <div className="mt-6 flex flex-wrap items-center gap-3"> {/*upload*/}
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
          <input
            type="file"
            accept=".csv,text/csv"
            className="hidden" //input escondido, label clica
            onChange={(e) => handleFile(e.target.files?.[0] ?? null)} //pega o arquivo
          />
          Escolher arquivo CSV
        </label>
        {loading && <span className="text-sm text-slate-400">Processando...</span>} {/*spinner texto*/}
      </div>

      {error && ( //banner de erro
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}
      {success && ( //banner de sucesso
        <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {success}
        </div>
      )}

      {preview && ( //resultado do preview
        <>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3"> {/*resumo + importar*/}
            <p className="text-sm text-slate-600">
              {preview.ok.length} ok · {errors.length} erro(s) · {duplicates.length}{" "}
              duplicata(s) no arquivo · {alreadyPresent.length} já no sistema
            </p>

            <button
              type="button"
              disabled={importing || preview.ok.length === 0} //precisa ter ok
              onClick={handleImport} //commit
              className="rounded-lg bg-brand-400 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-500 disabled:bg-slate-300"
            >
              {importing
                ? "Importando..."
                : `Importar ${preview.ok.length} linha(s) OK`}
            </button>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2"> {/*duas colunas*/}
            <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm"> {/*coluna OK*/}
              <h2 className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
                Dados OK
              </h2>
              <div className="mt-3 max-h-[28rem] space-y-2 overflow-y-auto"> {/*lista scrollavel*/}
                {preview.ok.length === 0 && (
                  <p className="text-sm text-slate-400">Nenhuma linha pronta.</p>
                )}
                {preview.ok.map((item) => (
                  <RowCard
                    key={itemKey(item)}
                    item={item}
                    tone="ok"
                    actions={
                      <button
                        type="button"
                        onClick={() => openEdit(item)} //edita linha ok
                        className="rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
                      >
                        Editar
                      </button>
                    }
                  />
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm"> {/*coluna rejeitados*/}
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-700">
                Rejeitados
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Vermelho: corrija ou descarte. Amarelo (arquivo): escolha qual manter. Amarelo
                (já no sistema): ID presente — não será importado.
              </p>
              <div className="mt-3 max-h-[28rem] space-y-2 overflow-y-auto">
                {rejectedVisible.length === 0 && (
                  <p className="text-sm text-slate-400">Nenhuma linha rejeitada.</p>
                )}
                {rejectedVisible.map((item) => (
                  <RowCard
                    key={itemKey(item)}
                    item={item}
                    tone={
                      item.status === "duplicate" || item.status === "exists"
                        ? item.status //amarelo
                        : "error" //vermelho
                    }
                    actions={
                      <div className="flex flex-col gap-1"> {/*acoes empilhadas*/}
                        {item.status === "duplicate" && (
                          <button
                            type="button"
                            onClick={() => keepDuplicate(item)} //so para dup no arquivo
                            className="rounded bg-amber-500 px-2 py-1 text-xs font-semibold text-white hover:bg-amber-600"
                          >
                            Manter esta
                          </button>
                        )}
                        {item.status !== "exists" && ( //ja no sistema: editar codigo se quiser
                          <button
                            type="button"
                            onClick={() => openEdit(item)} //edita rejeitado
                            className="rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
                          >
                            Editar
                          </button>
                        )}
                        {item.status === "exists" && (
                          <button
                            type="button"
                            onClick={() => openEdit(item)} //pode alterar o codigo e revalidar
                            className="rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
                          >
                            Alterar código
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => discardItem(item)} //some da lista
                          className="rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-500 hover:bg-slate-50"
                        >
                          Descartar
                        </button>
                      </div>
                    }
                  />
                ))}
              </div>

            </section>
          </div>
        </>
      )}

      {editing && editDraft && ( //modal de edicao de linha
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" //overlay
          onClick={() => {
            setEditing(null) //clique fora fecha
            setEditDraft(null)
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-slate-200 bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()} //nao fecha ao clicar dentro
          >
            <h3 className="text-lg font-semibold text-slate-900">Editar linha</h3>
            <div className="mt-4 grid gap-3 sm:grid-cols-2"> {/*campos em grade*/}
              {EDIT_FIELDS.map(({ key, label }) => (
                <label key={key} className="block text-sm">
                  <span className="text-slate-600">{label}</span>
                  <input
                    value={editDraft[key] ?? ""}
                    onChange={(e) =>
                      setEditDraft((current) =>
                        current ? { ...current, [key]: e.target.value } : current, //atualiza draft
                      )
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
                  />
                </label>
              ))}
            </div>
            <div className="mt-6 flex justify-end gap-3"> {/*acoes do modal*/}
              <button
                type="button"
                onClick={() => {
                  setEditing(null) //cancela
                  setEditDraft(null)
                }}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={saveEdit} //salva e revalida
                className="rounded-lg bg-brand-400 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-500"
              >
                Salvar e revalidar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
