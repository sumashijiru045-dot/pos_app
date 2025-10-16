import { registerSW } from 'virtual:pwa-register'
registerSW({ immediate: true })
document.documentElement.classList.add('dark');
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
