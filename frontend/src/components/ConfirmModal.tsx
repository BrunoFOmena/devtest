interface ConfirmModalProps { //props do confirmar / cancelar
  title: string //titulo do dialog
  message: string //texto da pergunta
  confirmLabel: string //texto do botao positivo
  cancelLabel?: string //texto do cancelar
  onConfirm: () => void //usuario confirmou
  onCancel: () => void //usuario cancelou
}

export default function ConfirmModal({
  title,
  message,
  confirmLabel,
  cancelLabel = "Cancelar", //default do botao negativo
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"> {/*overlay*/}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl" //painel
      >
        <h2 id="modal-title" className="text-lg font-semibold text-slate-900">
          {title}
        </h2>
        <p className="mt-2 text-sm text-slate-600">{message}</p>
        <div className="mt-6 flex justify-end gap-3"> {/*dois botoes*/}
          <button
            type="button"
            onClick={onCancel} //desiste
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm} //confirma a acao
            className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
