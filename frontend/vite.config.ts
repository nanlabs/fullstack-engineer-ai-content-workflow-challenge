import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: '0.0.0.0',
    strictPort: true,
    origin: 'http://localhost:3000',
    watch: {
      usePolling: true,
    },
    hmr: {
      host: 'localhost',
      protocol: 'ws',
      port: 3000,
      clientPort: 3000,
    },
  },
})
