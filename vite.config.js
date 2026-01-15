import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/EzID-Taiwan/', // 確保部署路徑正確
  build: {
    outDir: 'dist',
  }
})
