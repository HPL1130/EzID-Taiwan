import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './', // 確保路徑正確
  optimizeDeps: {
    exclude: ['@imgly/background-removal']
  }
})
