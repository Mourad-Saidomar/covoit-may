import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

// Les appels à /api sont relayés vers le backend (dossier backend/,
// port 3000) : le navigateur ne parle qu'à une seule adresse.
const relaisApi = {
  '/api': {
    target: 'http://localhost:3000',
    changeOrigin: true
  }
}

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    proxy: relaisApi
  },
  preview: {
    proxy: relaisApi
  },
  build: {
    outDir: 'dist'
  }
})
