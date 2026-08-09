import { StrictMode } from 'react' //modo estrito do React (avisos extras em dev)
import { createRoot } from 'react-dom/client' //API moderna para montar a app no DOM
import './index.css' //CSS global (Tailwind + body)
import App from './App.tsx' //componente raiz com as rotas

createRoot(document.getElementById('root')!).render( //monta no <div id="root"> do index.html
  <StrictMode>
    <App /> {/* renderiza a aplicacao */}
  </StrictMode>,
)
