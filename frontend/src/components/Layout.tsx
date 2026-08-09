import { NavLink, Outlet } from "react-router-dom" //rotas e area onde a pagina aparece

function navClass({ isActive }: { isActive: boolean }): string { //estilo do item do menu
  // className no NavLink com strings literais: Tailwind precisa ver as classes no fonte
  return isActive
    ? "block rounded-lg bg-brand-400 px-3 py-2.5 text-sm font-medium text-white transition-colors"
    : "block rounded-lg px-3 py-2.5 text-sm text-slate-200 transition-colors hover:bg-navy-800 hover:text-white"
}

export default function Layout() { //shell com sidebar + conteudo
  return (
    <div className="flex min-h-screen bg-slate-50 font-sans"> {/*tela inteira em duas colunas*/}
      <aside className="flex w-60 shrink-0 flex-col bg-navy-900 px-4 py-6"> {/*menu lateral navy*/}
        <div className="mb-10 flex items-center gap-2.5 px-2"> {/*marca do produto*/}
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-white text-xs font-bold tracking-wide text-navy-900">
            DNA {/*sigla no badge branco (mock)*/}
          </span>
          <span className="text-lg font-semibold tracking-tight text-white">NeoGenomica</span>
        </div>

        <nav className="flex flex-col gap-1"> {/*links principais*/}
          <NavLink to="/amostras/nova" className={navClass}>
            Amostras
          </NavLink>

          <NavLink to="/estrutura" className={navClass}>
            Estrutura Física
          </NavLink>

          <NavLink to="/tabela" className={navClass}>
            Tabela
          </NavLink>

          {/* FUTURO: Lixeira fora do MVP
          <NavLink to="/lixeira" className={navClass}>
            Lixeira
          </NavLink>
          */}

          <p className="mb-1 mt-8 px-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-400/80">
            Ferramentas {/*secao secundaria*/}
          </p>

          <NavLink to="/importar-csv" className={navClass}>
            Importar CSV
          </NavLink>
        </nav>

        <p className="mt-auto px-2 text-xs text-slate-500">Gestão de estoques de DNA</p>
      </aside>

      <main className="flex-1 overflow-y-auto p-8 md:p-10"> {/*conteudo da rota atual*/}
        <Outlet /> {/*renderiza a pagina filha*/}
      </main>
    </div>
  )
}
