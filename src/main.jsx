import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

const IMAGE_FALLBACK_SRC = '/artwork-fallback.svg';

// Captura falhas de carregamento de qualquer <img> do sistema (capa quebrada,
// avatar removido, etc.) e substitui pelo placeholder da marca. 'error' não
// borbulha, por isso o listener precisa estar em fase de captura.
document.addEventListener('error', (event) => {
  const target = event.target;
  if (
    target instanceof HTMLImageElement &&
    !target.src.endsWith(IMAGE_FALLBACK_SRC) &&
    !target.dataset.fallbackApplied
  ) {
    target.dataset.fallbackApplied = 'true';
    target.src = IMAGE_FALLBACK_SRC;
  }
}, true);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
