import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/global.css'
import App from './App.tsx'
import { GlobalPlayerProvider } from './context/GlobalPlayerContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GlobalPlayerProvider>
      <App />
    </GlobalPlayerProvider>
  </StrictMode>,
)
