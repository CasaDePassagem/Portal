import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

function normalizeBasePath(raw?: string) {
  const input = (raw ?? '/').trim()
  if (!input || input === '/') return '/'
  const stripped = input.replace(/^\/+/, '').replace(/\/+$/, '')
  return `/${stripped}/`
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const base = normalizeBasePath(env.VITE_PUBLIC_BASE_PATH)

  return {
    base,
    plugins: [react(), tailwindcss()],
    build: {
      chunkSizeWarningLimit: 3000,
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom'],
            ui: ['framer-motion', 'lucide-react', '@hello-pangea/dnd'],
          }
        }
      }
    },
    server: {
      proxy: {
        '/api': {
          target: 'https://script.google.com',
          changeOrigin: true,
          followRedirects: true,
          rewrite: (path) => '/macros/s/AKfycbxR_0tDE7Ro8aHDqIQaQX1OzUUrodCx3WAZCSZhshVcIyoUNmuUELD15YWY5NBDxo21/exec' + path.replace(/^\/api/, ''),
        }
      }
    }
  }
})

//https://script.google.com/macros/s/AKfycbxR_0tDE7Ro8aHDqIQaQX1OzUUrodCx3WAZCSZhshVcIyoUNmuUELD15YWY5NBDxo21/exec
