import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

// Les appels à /api sont relayés vers le backend (dossier backend/,
// port 3000) : le navigateur ne parle qu'à une seule adresse.
// Autre adresse d'API en développement (port 3000 déjà pris) :
//   $env:API_CIBLE="http://localhost:3100"; npm run dev
const relaisApi = {
  '/api': {
    target: process.env.API_CIBLE || 'http://localhost:3000',
    changeOrigin: true,
    // Relaie aussi la connexion temps réel (WebSocket /api/temps-reel)
    ws: true
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
