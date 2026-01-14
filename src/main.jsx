import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

// 刪除了 import './index.css' 這一行，因為檔案不存在且我們使用 CDN
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
