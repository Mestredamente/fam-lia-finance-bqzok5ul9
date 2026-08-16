/* Main entry point for the application - renders the root React component */
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './main.css'

// @skip-protected: Do not remove. Required for React rendering.
createRoot(document.getElementById('root')!).render(<App />)

const splash = document.getElementById('ff-splash')
if (splash) {
  splash.classList.add('ff-splash-fade-out')
  setTimeout(() => splash.remove(), 300)
}

// Register the service worker only in production builds so it never interferes
// with HMR / dev tooling. Logs success or failure for easier PWA debugging.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => console.info('[SW] registrado com sucesso', reg.scope))
      .catch((err) => console.error('[SW] falha ao registrar', err))
  })
}
