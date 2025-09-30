import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: '0.0.0.0',
    https: false // We'll use the separate Express server for HTTPS
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  }
})
