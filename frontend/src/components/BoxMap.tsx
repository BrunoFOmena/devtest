import { useState } from "react" //estado do modal expandido
import type { PositionCell } from "../types/api" //celula do grid

interface BoxMapProps { //props do mapa da caixa
  boxName: string //nome mostrado no titulo
  positions: PositionCell[] //todas as celulas
  selectedPositionId?: number | null //posicao sugerida / selecionada
  /** Destaque da busca (cor diferente). */
  highlightPositionId?: number | null //resultado de busca (teal)
  onPositionClick?: (cell: PositionCell) => void //clique em ocupada
}

function missingConcentration(cell: PositionCell): boolean { //sem concentracao?
  if (!cell.occupied || !cell.sample) return false //livre ou sem sample
  const value = cell.sample.concentracao_ng_ul
  return value === null || value === undefined || String(value).trim() === "" //vazio conta como falta
}

function Grid({ //grade A1, A2... com labels
  positions,
  selectedPositionId,
  highlightPositionId,
  onPositionClick,
  cellSize,
}: {
  positions: PositionCell[]
  selectedPositionId: number | null
  highlightPositionId: number | null
  onPositionClick?: (cell: PositionCell) => void
  cellSize: "sm" | "lg" //tamanho compacto ou expandido
}) {
  const rows = [...new Set(positions.map((p) => p.row))] //letras unicas (ordem do array)
  const columns = [...new Set(positions.map((p) => p.column))].sort((a, b) => a - b) //nums ordenados
  const byLabel = new Map(positions.map((p) => [`${p.row}${p.column}`, p])) //lookup rapido A1→cell

  const cellRem = cellSize === "lg" ? "2.25rem" : "1.75rem" //largura da coluna CSS
  const cellClass = cellSize === "lg" ? "h-9 w-9 text-[11px]" : "h-7 w-7 text-[9px]" //bolinha
  const labelClass = cellSize === "lg" ? "h-7 text-xs" : "h-5 text-[10px]" //header de coluna
  const rowLabelClass = cellSize === "lg" ? "h-9 text-xs" : "h-7 text-[10px]" //label da linha

  function cellClasses(cell: PositionCell): string { //cor da celula
    if (highlightPositionId != null && cell.id === highlightPositionId) {
      return "bg-teal-500 text-white ring-2 ring-teal-300 ring-offset-1" //busca
    }
    if (selectedPositionId != null && cell.id === selectedPositionId) {
      return "bg-brand-600 text-white ring-2 ring-brand-300 ring-offset-1" //selecionada
    }
    if (cell.occupied) {
      return "bg-brand-400 text-white" //ocupada
    }
    return "bg-emerald-400 text-white" //livre
  }

  return (
    <div className="overflow-x-auto"> {/*scroll horizontal se apertar*/}
      <div className="inline-block">
        <div
          className="grid gap-1.5"
          style={{ gridTemplateColumns: `${cellRem} repeat(${columns.length}, ${cellRem})` }} //1 col label + N colunas
        >
          <span /> {/*canto vazio do header*/}
          {columns.map((column) => ( //numeros no topo
            <span
              key={column}
              className={`flex items-center justify-center font-medium text-slate-400 ${labelClass}`}
            >
              {column}
            </span>
          ))}

          {rows.map((row) => ( //cada linha da grade
            <div key={row} className="contents"> {/*contents = filhos entram no grid pai*/}
              <span
                className={`flex items-center justify-center font-medium text-slate-400 ${rowLabelClass}`}
              >
                {row} {/*letra da linha*/}
              </span>
              {columns.map((column) => {
                const cell = byLabel.get(`${row}${column}`) //pega a celula
                if (!cell) return <span key={column} /> //buraco no grid
                const warn = missingConcentration(cell) //badge !
                const clickable = Boolean(onPositionClick && cell.occupied) //so ocupada clica
                const emphasized = //mostra label se destaque
                  (highlightPositionId != null && cell.id === highlightPositionId) ||
                  (selectedPositionId != null && cell.id === selectedPositionId)

                const content = ( //miolo da bolinha
                  <>
                    {emphasized ? cell.label : ""} {/*label so se destaque*/}
                    {warn && (
                      <span
                        className="absolute -right-0.5 -top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-amber-400 text-[8px] font-bold leading-none text-amber-950 shadow-sm"
                        aria-label="Sem concentração"
                      >
                        !
                      </span>
                    )}
                  </>
                )

                const classes = [ //classes da bolinha
                  "relative flex items-center justify-center rounded-full font-medium",
                  cellClass,
                  cellClasses(cell),
                  clickable ? "cursor-pointer hover:brightness-110" : "",
                ].join(" ")

                const title = //tooltip
                  cell.occupied && cell.sample
                    ? warn
                      ? `${cell.label} — ${cell.sample.codigo_amostra} (sem concentração)`
                      : `${cell.label} — ${cell.sample.codigo_amostra}`
                    : cell.label

                if (clickable) { //botao se da pra clicar
                  return (
                    <button
                      key={column}
                      type="button"
                      title={title}
                      onClick={() => onPositionClick?.(cell)}
                      className={classes}
                    >
                      {content}
                    </button>
                  )
                }

                return ( //span se so visual
                  <span key={column} title={title} className={classes}>
                    {content}
                  </span>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function Legend({ //legenda de cores
  selectedPositionId,
  highlightPositionId,
}: {
  selectedPositionId: number | null
  highlightPositionId: number | null
}) {
  return (
    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
      <span className="flex items-center gap-1.5">
        <span className="h-3 w-3 rounded-full bg-emerald-400" /> Livre
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-3 w-3 rounded-full bg-brand-400" /> Ocupada
      </span>
      {selectedPositionId != null && ( //so mostra se tem selecionada
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full bg-brand-600 ring-2 ring-brand-300" /> Selecionada
        </span>
      )}
      {highlightPositionId != null && ( //so mostra se tem busca
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full bg-teal-500 ring-2 ring-teal-300" /> Busca
        </span>
      )}
      <span className="flex items-center gap-1.5">
        <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-amber-400 text-[8px] font-bold text-amber-950">
          !
        </span>
        Sem concentração
      </span>
    </div>
  )
}

export default function BoxMap({ //mapa compacto + versao expandida
  boxName,
  positions,
  selectedPositionId = null,
  highlightPositionId = null,
  onPositionClick,
}: BoxMapProps) {
  const [expanded, setExpanded] = useState(false) //modal fullscreen?
  const rows = [...new Set(positions.map((p) => p.row))] //conta linhas
  const columns = [...new Set(positions.map((p) => p.column))] //conta colunas

  return (
    <>
      <div className="rounded-xl border border-slate-200 bg-white p-4"> {/*card compacto*/}
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-800">Mapa da caixa selecionada</h3>
            <p className="text-xs text-slate-500">{boxName}</p> {/*nome da caixa*/}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Legend
              selectedPositionId={selectedPositionId}
              highlightPositionId={highlightPositionId}
            />
            <button
              type="button"
              title="Expandir mapa"
              onClick={() => setExpanded(true)} //abre modal grande
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
              aria-label="Expandir mapa"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden
              >
                <path d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5" /> {/*icone expandir*/}
              </svg>
            </button>
          </div>
        </div>

        <Grid
          positions={positions}
          selectedPositionId={selectedPositionId}
          highlightPositionId={highlightPositionId}
          onPositionClick={onPositionClick}
          cellSize="sm" //compacto
        />

        <p className="mt-3 text-xs text-slate-400"> {/*resumo do tamanho*/}
          Tamanho da caixa: {rows.length} linhas × {columns.length} colunas
          {onPositionClick ? " · Clique numa posição ocupada para ver os dados" : ""}
        </p>
      </div>

      {expanded && ( //modal expandido
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          onClick={() => setExpanded(false)} //clique fora fecha
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="box-map-expanded-title"
            className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()} //clique dentro nao fecha
          >
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-6 py-4">
              <div>
                <h2
                  id="box-map-expanded-title"
                  className="text-lg font-semibold text-slate-900"
                >
                  Mapa da caixa
                </h2>
                <p className="mt-0.5 text-sm text-slate-500">{boxName}</p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Legend
                  selectedPositionId={selectedPositionId}
                  highlightPositionId={highlightPositionId}
                />
                <button
                  type="button"
                  onClick={() => setExpanded(false)} //fecha expandido
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
                >
                  Fechar
                </button>
              </div>
            </div>

            <div className="overflow-auto px-6 py-5">
              <Grid
                positions={positions}
                selectedPositionId={selectedPositionId}
                highlightPositionId={highlightPositionId}
                onPositionClick={(cell) => { //clique fecha o expandido
                  onPositionClick?.(cell)
                  setExpanded(false)
                }}
                cellSize="lg" //bolinhas maiores
              />
              <p className="mt-4 text-xs text-slate-400">
                {rows.length} linhas × {columns.length} colunas
                {onPositionClick ? " · Clique numa posição ocupada para ver a ficha" : ""}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
