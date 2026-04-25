import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/global.css'
import './styles/tw.css'
import './styles/immersive-shell.css'
import './styles/immersive-nav.css'
import './styles/immersive-cube.css'
import './styles/embed-handheld.css'
import './styles/desktop-window.css'
import App from './App.tsx'
import { GlobalPlayerProvider } from './context/GlobalPlayerContext'

const _sp = new URLSearchParams(window.location.search)
if (_sp.get('embed') === 'handheld') {
  document.documentElement.classList.add('embed-handheld')
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GlobalPlayerProvider>
      <App />
    </GlobalPlayerProvider>
  </StrictMode>,
)
