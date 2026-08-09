import { NavLink, Outlet } from "react-router-dom" //rotas e area onde a pagina aparece

function linkClasses(isActive: boolean): string { //monta classes do item do menu
  return [
    "block rounded-lg px-3 py-2 text-sm transition-colors", //base visual do link
    isActive
      ? "bg-violet-600 text-white font-medium" //ativo: destaque roxo
      : "text-slate-300 hover:bg-slate-800 hover:text-white", //inativo: cinza com hover
  ].join(" ") //junta num unico className
}

export default function Layout() { //shell com sidebar + conteudo
  return (
    <div className="flex min-h-screen bg-slate-50"> {/*tela inteira em duas colunas*/}
      <aside className="flex w-60 shrink-0 flex-col border-r border-slate-800 bg-slate-900 px-4 py-6"> {/*menu lateral escuro*/}
        <div className="mb-8 flex items-center gap-2.5 px-2"> {/*marca do produto*/}
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-600 text-sm font-bold text-white">
            DNA {/*sigla no badge*/}
          </span>
          <span className="text-lg font-semibold text-white">NeoGenomica</span> {/*nome do app*/}
        </div>

        <nav className="flex flex-col gap-1"> {/*links principais*/}
          <NavLink to="/amostras/nova"> {/*nova amostra*/}
            {({ isActive }) => <span className={linkClasses(isActive)}>Amostras</span>}
          </NavLink>

          <NavLink to="/estrutura"> {/*hierarquia fisica*/}
            {({ isActive }) => (
              <span className={linkClasses(isActive)}>Estrutura Física</span>
            )}
          </NavLink>

          <NavLink to="/tabela"> {/*lista em tabela*/}
            {({ isActive }) => <span className={linkClasses(isActive)}>Tabela</span>}
          </NavLink>

          <NavLink to="/lixeira"> {/*itens soft-deleted*/}
            {({ isActive }) => <span className={linkClasses(isActive)}>Lixeira</span>}
          </NavLink>

          <p className="mt-6 mb-1 px-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
            Ferramentas {/*secao secundaria*/}
          </p>
          <NavLink to="/importar-csv"> {/*upload em lote*/}
            {({ isActive }) => <span className={linkClasses(isActive)}>Importar CSV</span>}
          </NavLink>
        </nav>

        <p className="mt-auto px-2 text-xs text-slate-600">Gestão de estoque de DNA</p> {/*rodape da sidebar*/}
      </aside>

      <main className="flex-1 overflow-y-auto p-8"> {/*conteudo da rota atual*/}
        <Outlet /> {/*renderiza a pagina filha*/}
      </main>
    </div>
  )
}
