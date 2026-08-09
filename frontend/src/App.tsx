import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom" //roteamento no browser
import Layout from "./components/Layout" //layout comum (menu/header)
import ImportCsvPage from "./pages/ImportCsvPage" //tela de importacao CSV
import NewSamplePage from "./pages/NewSamplePage" //tela de nova amostra
import SamplesTablePage from "./pages/SamplesTablePage" //tela de tabela/busca
import StructurePage from "./pages/StructurePage" //tela da hierarquia fisica
// import TrashPage from "./pages/TrashPage" //FUTURO: tela da lixeira (fora do MVP)

export default function App() { //componente raiz: mapa de rotas
  return (
    <BrowserRouter> {/* historico de URL do browser */}
      <Routes> {/* lista de rotas */}
        <Route element={<Layout />}> {/* todas as paginas usam o Layout */}
          <Route path="/" element={<Navigate to="/amostras/nova" replace />} /> {/* home → nova amostra */}
          <Route path="/amostras/nova" element={<NewSamplePage />} /> {/* cadastro de amostra */}
          <Route path="/estrutura" element={<StructurePage />} /> {/* salas/freezers/gavetas/caixas */}
          <Route path="/estrutura/*" element={<Navigate to="/estrutura" replace />} /> {/* subpaths antigos → estrutura */}
          <Route path="/tabela" element={<SamplesTablePage />} /> {/* listagem/busca de amostras */}
          {/* <Route path="/lixeira" element={<TrashPage />} /> */} {/* FUTURO: lixeira fora do MVP */}
          <Route path="/importar-csv" element={<ImportCsvPage />} /> {/* import CSV */}

          <Route path="*" element={<Navigate to="/amostras/nova" replace />} /> {/* rota desconhecida → fallback */}
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
