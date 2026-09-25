import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import './index.css'
import './styles/tokens.css'
import App from './App.tsx'
import FastTooltip from './components/FastTooltip.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <App />
      <FastTooltip />
    </BrowserRouter>
  </StrictMode>,
)
