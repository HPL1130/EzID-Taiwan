import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx' // 確保這裡的大寫 App 與檔案名稱一致
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
