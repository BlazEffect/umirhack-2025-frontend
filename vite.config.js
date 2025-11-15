import { defineConfig } from 'vite'
import 'dotenv/config'

// https://vite.dev/config/
export default defineConfig({
  server: {
    host: process.env.SERVER_IP,
    port: process.env.SERVER_PORT,
    watch: {
      usePolling: true
    },
    proxy: {
      '/api': {
        target: process.env.API_SERVER_URL,
        changeOrigin: true,
        secure: false,
      }
    },
    cors: false
  }
})
