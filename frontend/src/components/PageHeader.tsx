interface PageHeaderProps { //cabecalho padrao das paginas
  eyebrow: string //categoria em caps (ex.: AMOSTRAS)
  title: string //titulo principal
  description?: string //linha de ajuda opcional
}

export default function PageHeader({ eyebrow, title, description }: PageHeaderProps) {
  return (
    <div> {/*bloco de titulo alinhado ao mock*/}
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-500">
        {eyebrow}
      </p>
      <h1 className="mt-1 text-2xl font-bold tracking-tight text-navy-900">{title}</h1>
      {description && <p className="mt-1.5 text-sm text-slate-500">{description}</p>}
    </div>
  )
}
