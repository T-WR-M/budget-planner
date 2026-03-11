import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          dndkit: ['@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/utilities'],
          recharts: ['recharts']
        }
      }
    }
  },
  preview: {
    host: '0.0.0.0',
    port: 8080,
    allowedHosts: ['all', 'budget-planner-production.up.railway.app', 'buybudgetflow.com', 'www.buybudgetflow.com']
  }
})