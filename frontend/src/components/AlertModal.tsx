interface AlertModalProps { //props do alerta simples (so OK)
  title: string //titulo do dialog
  message: string //texto explicativo
  confirmLabel?: string //texto do botao (padrao OK)
  onConfirm: () => void //callback ao clicar OK
}

export default function AlertModal({
  title,
  message,
  confirmLabel = "OK", //default do botao
  onConfirm,
}: AlertModalProps) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 p-4"> {/*overlay escuro*/}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="alert-modal-title"
        className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl" //caixa branca
      >
        <h2 id="alert-modal-title" className="text-lg font-semibold text-slate-900">
          {title} {/*titulo do alerta*/}
        </h2>
        <p className="mt-2 text-sm text-slate-600">{message}</p> {/*mensagem*/}
        <div className="mt-6 flex justify-end"> {/*acao a direita*/}
          <button
            type="button"
            onClick={onConfirm} //fecha / confirma
            className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
