import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/EzID-Taiwan/', // 加上這行，對應你的 GitHub 倉庫名稱
})
