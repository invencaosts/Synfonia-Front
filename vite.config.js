import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    host: true, // Listen on all local IPs
    allowedHosts: true, // Allow ngrok and other external hosts
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        // Backend valida o header Origin (CORS_ALLOWED_ORIGINS). O proxy do Vite
        // repassa o Origin real do navegador (ex: http://192.168.x.x:5173), que
        // muda conforme a rede e não está na allowlist. Como a chamada já é
        // same-origin do ponto de vista do navegador, forçamos aqui o Origin
        // "canônico" já liberado no backend.
        headers: {
          Origin: 'http://localhost:5173',
        },
      }
    }
  }
})
