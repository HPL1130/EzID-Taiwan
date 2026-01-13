# EzID-Taiwan
# 🇹🇼 EzID-Taiwan：台灣證件照自助產生器

[![Deploy to GitHub Pages](https://github.com/HPL1130/EzID-Taiwan/actions/workflows/deploy.yml/badge.svg)](https://github.com/HPL1130/EzID-Taiwan/actions/workflows/deploy.yml)

> **只需三步驟，在家完成符合規範的證件照，支援 7-11 ibon 4x6 快速輸出。**

## ✨ 專案特色
- **🔒 隱私安全**：所有照片處理均在瀏覽器端完成，照片不會上傳到任何伺服器。
- **📐 規格精準**：內建台灣護照/身分證標準輔助線（頭頂至下顎 3.2-3.6cm）。
- **🖨️ ibon 最佳化**：自動生成 4x6 拼板 JPG，預留邊距，避免超商機台裁切。
- **📱 PWA 支援**：可安裝至手機桌面，操作流暢度媲美原生 APP。

## 🛠️ 技術棧
- **Frontend**: React.js / Vite
- **Styling**: Tailwind CSS
- **Canvas**: 用於高解析度拼板與對齊檢測

## 📖 使用教學
1. **拍照/選取**：上傳單人、背景簡單的照片。
2. **對齊調整**：手動縮放照片，讓臉部置於紅色虛線橢圓內。
3. **下載輸出**：點選「下載 ibon 拼板」，取得 4x6 JPG 檔案。
4. **超商列印**：前往 7-11 使用 ibon 上傳，選擇「4x6 相片紙列印」。

## 🚀 開發計畫 (Roadmap)
- [ ] 整合 AI 一鍵去背功能 (使用 @imgly/background-removal)
- [ ] 支援 1 吋照片輸出
- [ ] 支援多種背景顏色切換 (白、淺灰、藍)
