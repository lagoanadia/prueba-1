import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    // En local, Vite (puerto 5173) reenvía /api al Worker de Cloudflare (wrangler, puerto 8787).
    proxy: { '/api': 'http://localhost:8787' },
  },
})
