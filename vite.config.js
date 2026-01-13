import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // 🔴 重要：將 'your-repo-name' 替換成你 GitHub 專案的名稱
  // 例如專案網址是 https://username.github.io/taiwan-id-maker/
  // base 就設定為 '/taiwan-id-maker/'
  base: './', 
  build: {
    outDir: 'dist',
    assetsInlineLimit: 0, // 確保大圖不會被轉成 base64 導致錯誤
  },
  server: {
    // 方便手機在同一個 WiFi 下連線測試
    host: '0.0.0.0'
  }
})
