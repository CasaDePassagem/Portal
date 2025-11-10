import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  base: '/Itnerario-Extensionista1/',
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
        rewrite: (path) => '/macros/s/AKfycby7tE_xJYIcUvSO4Y7VptFWtv9-g3WQOQ3JEAmDUtiK2zisIV69iPsiz_B7etUtfH_FfQ/exec' + path.replace(/^\/api/, ''),
      }
    }
  }
})
