import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    // En local, Vite (puerto 5173) reenvía /api a las Functions de Cloudflare (wrangler, puerto 8788).
    proxy: { '/api': 'http://localhost:8788' },
  },
})
