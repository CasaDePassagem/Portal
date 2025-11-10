import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { hydrateFromRemote } from './lib/remoteSync';
import { hydrateProgressFromCache } from './lib/progress';

const SPA_REDIRECT_KEY = 'spa_redirect';

// Restaura a rota original após redirecionamento do 404.html (GitHub Pages)
if (typeof window !== 'undefined') {
  try {
    const stored = window.sessionStorage.getItem(SPA_REDIRECT_KEY);
    if (stored) {
      window.sessionStorage.removeItem(SPA_REDIRECT_KEY);
      const basePathRaw = import.meta.env.BASE_URL || '/';
      const basePath = basePathRaw.replace(/\/+$/, '') || '/';

      const ensureLeadingSlash = (value: string) =>
        value.startsWith('/') ? value : `/${value}`;
      const normalize = (value: string) =>
        value.replace(/\/+$/, '') || '/';

      const normalizedBase = normalize(basePath);
      const currentPath = normalize(window.location.pathname);

      const storedPath = ensureLeadingSlash(stored);
      const safePath =
        normalizedBase === '/'
          ? storedPath
          : `${normalizedBase}${storedPath === '/' ? '' : storedPath}`;

      if (currentPath === normalizedBase && safePath !== window.location.pathname) {
        window.history.replaceState(null, '', safePath);
      }
    }
  } catch (_err) {
    // ignora falhas de acesso ao sessionStorage (modo privado)
  }
}

// Renderiza imediatamente (página aparece rápido)
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Carrega dados em background (não bloqueia)
void (async () => {
  try {
    await hydrateFromRemote();
  } finally {
    hydrateProgressFromCache();
  }
})();

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    const swUrl = `${import.meta.env.BASE_URL}sw.js`;
    navigator.serviceWorker
      .register(swUrl)
      .catch((err) => console.error('Service worker registration failed', err));
  });
}
